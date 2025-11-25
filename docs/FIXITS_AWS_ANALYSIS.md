# AWS Fixits Implementation Analysis & Cloudflare Adaptation

## Executive Summary

This document analyzes the existing AWS-based Fixits implementation and provides a detailed adaptation plan for SprintJam on Cloudflare Workers + D1.

**Key Finding**: The AWS implementation is significantly more sophisticated than the initial proposal, with:
- **Multi-tenant support**: Concurrent fixit runs (quarters/years)
- **Advanced scoring**: Label-based bonuses, severity weighting, story points
- **Real-time updates**: GraphQL subscriptions via AppSync
- **Event-driven architecture**: DynamoDB Streams → Lambda → EventBridge → SNS
- **Snapshot analytics**: Nightly S3 exports for historical analysis

---

## Architecture Comparison

### AWS Architecture (Current)

```
GitHub Actions Workflow
    ↓ (HMAC-signed POST)
API Gateway → Ingestion Lambda
    ↓ (write)
DynamoDB (FixitEvents table)
    ↓ (streams)
Leaderboard Updater Lambda
    ↓ (atomic ADD operations)
DynamoDB (Leaderboard table)
    ↓ (publish)
AppSync GraphQL API → WebSocket subscriptions
    ↓ (emit events)
EventBridge (FixitEventsBus)
    ↓ (high severity filter)
SNS Topic → Notifications
```

**Additional Components:**
- **FixitRuns table**: Manages active sprint configurations
- **Snapshot Lambda**: Nightly exports to S3 (cron: 6:00 AM UTC)
- **CloudFront + S3**: Static frontend hosting

---

### Cloudflare Architecture (Proposed)

```
GitHub Actions Workflow
    ↓ (HMAC-signed POST)
Cloudflare Worker (API Router)
    ↓ (write + forward)
D1 Database (fixit_events) ← PERMANENT STORAGE
    ↓ (forward)
Fixit Durable Object
    ↓ (aggregate)
D1 Database (leaderboard) ← PERMANENT STORAGE
    ↓ (broadcast)
WebSocket connections → Live updates
    ↓ (conditional)
Cloudflare Queue → High-severity notifications
    ↓
Email Workers / Webhooks
```

**Additional Components:**
- **D1 (fixit_runs)**: Active sprint management
- **Durable Object state**: Cached leaderboard for fast queries
- **Cloudflare Pages**: Static frontend hosting
- **Cron Triggers**: Snapshot exports to R2 (Cloudflare S3)

---

## Database Schema Mapping

### AWS DynamoDB → Cloudflare D1

#### Table 1: FixitEvents

**AWS DynamoDB:**
```
Partition Key: eventId (STRING)
Stream: NEW_IMAGE
GSI "FixitLookup":
  - PK: fixitId (STRING)
  - SK: timestamp (NUMBER)
```

**Cloudflare D1:**
```sql
CREATE TABLE fixit_events (
  event_id TEXT PRIMARY KEY,           -- GitHub delivery ID
  fixit_id TEXT NOT NULL,              -- 2024-Q1, 2024-Q2, etc.
  user TEXT NOT NULL,                  -- GitHub username
  points INTEGER NOT NULL,             -- Calculated points
  timestamp INTEGER NOT NULL,          -- Event timestamp (ms)

  -- Enriched metadata
  labels TEXT,                         -- JSON array
  severity TEXT,                       -- critical, high, medium, low, p0-p3
  story_points INTEGER,                -- Explicit SP from labels
  raw_payload TEXT,                    -- Full GitHub event JSON

  -- Audit fields
  created_at INTEGER NOT NULL,         -- Ingestion time

  UNIQUE(event_id)
);

CREATE INDEX idx_fixit_lookup ON fixit_events(fixit_id, timestamp DESC);
CREATE INDEX idx_user_fixit ON fixit_events(user, fixit_id);
```

**Migration Note**: D1 doesn't have streams, so we'll trigger updates via Worker logic after INSERT.

---

#### Table 2: Leaderboard

**AWS DynamoDB:**
```
Partition Key: fixitId (STRING)
Sort Key: user (STRING)
Attributes: points, bugsClosed, lastEventTimestamp, severity, labels, storyPoints, deltaPoints
```

**Cloudflare D1:**
```sql
CREATE TABLE leaderboard (
  fixit_id TEXT NOT NULL,
  user TEXT NOT NULL,

  -- Core metrics
  points INTEGER DEFAULT 0,
  bugs_closed INTEGER DEFAULT 0,
  last_event_timestamp INTEGER,

  -- Enriched data (from most recent event)
  severity TEXT,
  labels TEXT,                         -- JSON array
  story_points INTEGER,
  delta_points INTEGER,                -- Points from last event

  -- Ranking metadata
  rank INTEGER,                        -- Pre-calculated rank
  updated_at INTEGER NOT NULL,

  PRIMARY KEY (fixit_id, user)
);

CREATE INDEX idx_leaderboard_points ON leaderboard(fixit_id, points DESC);
```

**Migration Note**: We'll use Durable Objects to cache the top N entries in memory for fast reads.

---

#### Table 3: FixitRuns

**AWS DynamoDB:**
```
Partition Key: fixitId (STRING)
Attributes: (configured per sprint)
```

**Cloudflare D1:**
```sql
CREATE TABLE fixit_runs (
  fixit_id TEXT PRIMARY KEY,           -- 2024-Q1, custom names
  name TEXT,                           -- "Q1 2024 Bug Bash"
  description TEXT,
  start_date INTEGER,                  -- Timestamp
  end_date INTEGER,                    -- Timestamp
  is_active BOOLEAN DEFAULT TRUE,

  -- Configuration
  config TEXT,                         -- JSON: labels to track, point modifiers, etc.

  -- Metadata
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_active_runs ON fixit_runs(is_active, start_date DESC);
```

---

## Point Calculation Logic (From AWS)

### Base Points

```javascript
// AWS implementation
function calculateBasePoints(payload) {
  const action = payload.action;

  if (payload.pull_request) {
    if (action === 'closed' && payload.pull_request.merged) return 5;
    if (action === 'opened') return 2;
    return 3;
  }

  if (payload.issue) {
    if (action === 'closed') return 2;
    return 1;
  }

  if (payload.workflow_run) {
    if (payload.workflow_run.conclusion === 'success') return 2;
    return 1;
  }

  return 1; // Default
}
```

### Label Bonuses

```javascript
function calculateLabelBonus(labels) {
  let bonus = 0;

  for (const label of labels) {
    const name = label.name.toLowerCase();

    // Bug bonus
    if (name.includes('bug')) bonus += 2;

    // Documentation/Enhancement
    if (name.includes('documentation') || name.includes('enhancement')) {
      bonus += 1;
    }

    // Priority labels
    if (name.includes('priority')) {
      if (name.includes('critical') || name.includes('p0')) bonus += 6;
      else if (name.includes('high') || name.includes('p1')) bonus += 4;
      else if (name.includes('medium') || name.includes('p2')) bonus += 2;
    }
  }

  return bonus;
}
```

### Severity Bonuses

```javascript
function parseSeverity(labels) {
  for (const label of labels) {
    const match = label.name.match(/severity[:\s-]?([a-z0-5]+)/i);
    if (match) {
      const severity = match[1].toLowerCase();

      if (severity === 'critical' || severity === 'p0') return { severity, bonus: 8 };
      if (severity === 'high' || severity === 'p1') return { severity, bonus: 5 };
      if (severity === 'medium' || severity === 'p2') return { severity, bonus: 3 };
      if (severity === 'low' || severity === 'p3') return { severity, bonus: 1 };
    }
  }

  return { severity: null, bonus: 0 };
}
```

### Story Points Extraction

```javascript
function extractStoryPoints(labels) {
  for (const label of labels) {
    const match = label.name.match(/(?:sp|story[\s-]*points?)[:\s-]?(\d+)/i);
    if (match) {
      return parseInt(match[1], 10);
    }
  }
  return 0;
}
```

### Total Points Formula

```javascript
const basePoints = calculateBasePoints(payload);
const labelBonus = calculateLabelBonus(labels);
const { severity, bonus: severityBonus } = parseSeverity(labels);
const storyPoints = extractStoryPoints(labels);

const totalPoints = basePoints + labelBonus + severityBonus + storyPoints;
```

**Example:**
- PR merged (base: 5)
- + bug label (bonus: 2)
- + severity:high (bonus: 5)
- + sp-3 (bonus: 3)
- **= 15 points**

---

## API Endpoints Mapping

### AWS API Gateway → Cloudflare Workers

| AWS Route | Method | Handler | Cloudflare Equivalent |
|-----------|--------|---------|----------------------|
| `/github-event` | POST | Ingestion Lambda | `POST /api/github/webhook` → Worker |
| `/leaderboard` | GET | Leaderboard Lambda | `GET /api/fixits/leaderboard` → D1 query |
| `/leaderboard/{fixitId}` | GET | Leaderboard Lambda | `GET /api/fixits/leaderboard/:fixitId` → D1 query |
| `/runs` | GET | Runs Admin Lambda | `GET /api/fixits/runs` → D1 query |
| `/runs` | POST | Runs Admin Lambda | `POST /api/fixits/runs` → D1 insert |
| `/runs/{fixitId}` | PUT | Runs Admin Lambda | `PUT /api/fixits/runs/:fixitId` → D1 update |
| `/runs/{fixitId}` | DELETE | Runs Admin Lambda | `DELETE /api/fixits/runs/:fixitId` → D1 delete |

---

## Real-Time Updates: AppSync → Durable Objects + WebSockets

### AWS AppSync (GraphQL)

**Schema:**
```graphql
type LeaderboardEntry {
  fixitId: ID!
  user: String!
  points: Int!
  bugsClosed: Int!
  lastEventTimestamp: String!
}

type Query {
  leaderboard(fixitId: ID!): [LeaderboardEntry!]!
}

type Mutation {
  publishLeaderboardUpdate(
    fixitId: ID!
    user: String!
    points: Int!
    bugsClosed: Int!
    lastEventTimestamp: String!
  ): LeaderboardEntry
}

type Subscription {
  leaderboardUpdated(fixitId: ID!): LeaderboardEntry
    @aws_subscribe(mutations: ["publishLeaderboardUpdate"])
}
```

**Client:**
```javascript
// AWS frontend
const subscription = API.graphql(
  graphqlOperation(subscriptions.leaderboardUpdated, { fixitId })
);

subscription.subscribe({
  next: (data) => {
    // Update UI with new leaderboard entry
  }
});
```

---

### Cloudflare Durable Objects (WebSocket)

**Server (Durable Object):**
```typescript
// api/services/fixit-room.ts
export class FixitRoom implements DurableObject {
  private sessions: Map<WebSocket, { fixitId: string; user: string }> = new Map();

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade') === 'websocket') {
      const { 0: client, 1: server } = new WebSocketPair();

      await this.handleSession(server);

      return new Response(null, { status: 101, webSocket: client });
    }

    // ... HTTP handlers
  }

  async handleSession(ws: WebSocket) {
    ws.accept();

    ws.addEventListener('message', async (event) => {
      const message = JSON.parse(event.data);

      if (message.type === 'subscribe') {
        this.sessions.set(ws, { fixitId: message.fixitId, user: message.user });
      }
    });
  }

  async broadcastLeaderboardUpdate(fixitId: string, entry: LeaderboardEntry) {
    for (const [ws, session] of this.sessions) {
      if (session.fixitId === fixitId) {
        ws.send(JSON.stringify({
          type: 'leaderboardUpdated',
          payload: entry
        }));
      }
    }
  }
}
```

**Client:**
```javascript
// frontend
const ws = new WebSocket(`wss://api.sprintjam.co.uk/api/fixits/ws`);

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'subscribe',
    fixitId: '2024-Q1'
  }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);

  if (message.type === 'leaderboardUpdated') {
    // Update UI with message.payload
  }
};
```

---

## Event Processing Flow

### AWS: DynamoDB Streams → Lambda

```javascript
// lambda/updater/index.js (AWS)
export const handler = async (event) => {
  for (const record of event.Records) {
    if (record.eventName !== 'INSERT') continue;

    const { fixitId, user, points, timestamp } = record.dynamodb.NewImage;

    // Atomic update to leaderboard
    await dynamodb.updateItem({
      TableName: LEADERBOARD_TABLE,
      Key: { fixitId, user },
      UpdateExpression: 'ADD points :points, bugsClosed :bugs SET lastEventTimestamp = :ts',
      ExpressionAttributeValues: {
        ':points': points,
        ':bugs': 1,
        ':ts': timestamp
      }
    });

    // Publish to AppSync
    await publishRealtime(fixitId, user, points);

    // Emit to EventBridge
    await emitLeaderboardEvent(fixitId, user, points, severity);
  }
};
```

---

### Cloudflare: Worker → D1 + Durable Object

```typescript
// api/index.ts
app.post('/api/github/webhook', async (c) => {
  const payload = await c.req.json();
  const eventId = c.req.header('x-github-delivery') || crypto.randomUUID();

  // 1. Write to D1 (permanent storage, idempotent)
  const result = await c.env.DB.prepare(`
    INSERT INTO fixit_events (event_id, fixit_id, user, points, timestamp, labels, severity, story_points, raw_payload, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(event_id) DO NOTHING
  `).bind(
    eventId,
    fixitId,
    user,
    totalPoints,
    timestamp,
    JSON.stringify(labels),
    severity,
    storyPoints,
    JSON.stringify(payload),
    Date.now()
  ).run();

  // Check if inserted (not a duplicate)
  if (result.meta.changes === 0) {
    return c.json({ message: 'Duplicate event ignored' }, 200);
  }

  // 2. Forward to Durable Object for real-time processing
  const id = c.env.FIXIT_ROOM.idFromName(fixitId);
  const stub = c.env.FIXIT_ROOM.get(id);

  await stub.fetch(new Request('http://do/update-leaderboard', {
    method: 'POST',
    body: JSON.stringify({ user, points: totalPoints, timestamp, severity })
  }));

  // 3. Optionally: emit high-severity notifications
  if (severity === 'critical' || severity === 'p0') {
    await c.env.FIXIT_NOTIFICATIONS.send({
      fixitId,
      user,
      points: totalPoints,
      severity
    });
  }

  return c.json({ message: 'Event processed' }, 200);
});
```

**Durable Object (aggregation + broadcast):**
```typescript
// api/services/fixit-room.ts
async updateLeaderboard(user: string, points: number, timestamp: number, severity: string) {
  // Update D1 leaderboard (atomic)
  await this.env.DB.prepare(`
    INSERT INTO leaderboard (fixit_id, user, points, bugs_closed, last_event_timestamp, severity, delta_points, updated_at)
    VALUES (?, ?, ?, 1, ?, ?, ?, ?)
    ON CONFLICT(fixit_id, user) DO UPDATE SET
      points = points + excluded.points,
      bugs_closed = bugs_closed + 1,
      last_event_timestamp = excluded.last_event_timestamp,
      severity = excluded.severity,
      delta_points = excluded.delta_points,
      updated_at = excluded.updated_at
  `).bind(this.fixitId, user, points, timestamp, severity, points, Date.now()).run();

  // Fetch updated entry
  const entry = await this.env.DB.prepare(`
    SELECT * FROM leaderboard WHERE fixit_id = ? AND user = ?
  `).bind(this.fixitId, user).first();

  // Broadcast via WebSocket
  this.broadcastLeaderboardUpdate(this.fixitId, entry);
}
```

---

## Snapshot & Analytics

### AWS: EventBridge Cron → Lambda → S3

```javascript
// lambda/snapshots/index.js (AWS)
export const handler = async () => {
  const leaderboard = await dynamodb.scan({
    TableName: LEADERBOARD_TABLE
  });

  const timestamp = new Date().toISOString();
  const key = `snapshots/${timestamp}.json`;

  await s3.putObject({
    Bucket: SNAPSHOT_BUCKET,
    Key: key,
    Body: JSON.stringify(leaderboard.Items)
  });
};
```

**Triggered by EventBridge rule:**
```javascript
new events.Rule(this, 'NightlySnapshotRule', {
  schedule: events.Schedule.cron({ hour: '6', minute: '0' })
});
```

---

### Cloudflare: Cron Triggers → Worker → R2

```typescript
// api/cron.ts
export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    if (event.cron === '0 6 * * *') { // Daily at 6:00 AM UTC
      await snapshotLeaderboards(env);
    }
  }
};

async function snapshotLeaderboards(env: Env) {
  const activeRuns = await env.DB.prepare(`
    SELECT fixit_id FROM fixit_runs WHERE is_active = TRUE
  `).all();

  for (const run of activeRuns.results) {
    const leaderboard = await env.DB.prepare(`
      SELECT * FROM leaderboard WHERE fixit_id = ? ORDER BY points DESC
    `).bind(run.fixit_id).all();

    const timestamp = new Date().toISOString();
    const key = `snapshots/${run.fixit_id}/${timestamp}.json`;

    await env.SNAPSHOTS.put(key, JSON.stringify(leaderboard.results));
  }
}
```

**wrangler.toml:**
```toml
[triggers]
crons = ["0 6 * * *"]
```

---

## GitHub Actions Workflow (No Changes)

The existing GitHub Actions workflow can be reused with minimal changes:

```yaml
# .github/workflows/fixit-reporter.yml
name: Fixit Reporter

on:
  issues:
    types: [opened, closed, labeled]
  pull_request:
    types: [opened, closed, labeled]
  workflow_run:
    types: [completed]

jobs:
  report:
    runs-on: ubuntu-latest
    steps:
      - name: Check for fixit label
        id: check_label
        run: |
          # Check if issue/PR has "fixit" label
          # Exit early if not

      - name: Send event to API
        env:
          WEBHOOK_URL: ${{ secrets.FIXIT_WEBHOOK_URL }}  # Change to Cloudflare URL
          WEBHOOK_SECRET: ${{ secrets.FIXIT_WEBHOOK_SECRET }}
        run: |
          payload=$(cat $GITHUB_EVENT_PATH)
          signature=$(echo -n "$payload" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" | sed 's/^.* //')

          curl -X POST "$WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -H "X-Hub-Signature-256: sha256=$signature" \
            -H "X-GitHub-Delivery: ${{ github.run_id }}" \
            -d "$payload"
```

**Only change needed**: Update `FIXIT_WEBHOOK_URL` secret to point to Cloudflare:
```
https://api.sprintjam.co.uk/api/github/webhook
```

---

## Frontend Adaptation

### AWS Frontend (Vanilla JS)

The AWS frontend uses:
- **Polling**: Fetches leaderboard every 30 seconds
- **WebSocket (AppSync)**: Real-time updates via GraphQL subscriptions
- **Dark theme**: Custom CSS

```javascript
// frontend/leaderboard.js (AWS)
async function fetchLeaderboard() {
  const response = await fetch(`${config.httpApiBaseUrl}/leaderboard/${selectedFixitId}`);
  const data = await response.json();
  renderLeaderboard(data.entries);
}

// WebSocket subscription
const ws = new WebSocket(config.appSyncWssUrl);
ws.send(JSON.stringify({
  type: 'subscribe',
  query: `subscription { leaderboardUpdated(fixitId: "${selectedFixitId}") { user points bugsClosed } }`
}));
```

---

### SprintJam Frontend (React)

Integration into existing SprintJam React app:

```tsx
// src/components/fixits/FixitLeaderboard.tsx
import { useEffect, useState } from 'react';
import { useFixitWebSocket } from '@/hooks/useFixitWebSocket';

export function FixitLeaderboard({ fixitId }: { fixitId: string }) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  // Initial fetch
  useEffect(() => {
    fetch(`/api/fixits/leaderboard/${fixitId}`)
      .then(r => r.json())
      .then(data => setLeaderboard(data.entries));
  }, [fixitId]);

  // Real-time updates
  useFixitWebSocket(fixitId, (message) => {
    if (message.type === 'leaderboardUpdated') {
      setLeaderboard(prev => {
        const index = prev.findIndex(e => e.user === message.payload.user);
        if (index >= 0) {
          prev[index] = message.payload;
        } else {
          prev.push(message.payload);
        }
        return prev.sort((a, b) => b.points - a.points);
      });
    }
  });

  return (
    <div className="fixit-leaderboard">
      <h2>Leaderboard: {fixitId}</h2>
      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>User</th>
            <th>Points</th>
            <th>Bugs Closed</th>
            <th>Last Activity</th>
          </tr>
        </thead>
        <tbody>
          {leaderboard.map((entry, index) => (
            <tr key={entry.user}>
              <td>{index + 1}</td>
              <td>{entry.user}</td>
              <td>{entry.points}</td>
              <td>{entry.bugsClosed}</td>
              <td>{new Date(entry.lastEventTimestamp).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

**Hook:**
```typescript
// src/hooks/useFixitWebSocket.ts
export function useFixitWebSocket(fixitId: string, onMessage: (msg: any) => void) {
  useEffect(() => {
    const ws = new WebSocket(`wss://api.sprintjam.co.uk/api/fixits/ws`);

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'subscribe', fixitId }));
    };

    ws.onmessage = (event) => {
      onMessage(JSON.parse(event.data));
    };

    return () => ws.close();
  }, [fixitId]);
}
```

---

## Key Differences: AWS vs Cloudflare

| Feature | AWS | Cloudflare |
|---------|-----|------------|
| **Database** | DynamoDB (NoSQL, streams) | D1 (SQLite, relational) |
| **Real-time** | AppSync GraphQL subscriptions | Durable Objects WebSockets |
| **Event bus** | EventBridge | Cloudflare Queues |
| **Notifications** | SNS | Email Workers / Webhooks |
| **Snapshots** | S3 | R2 |
| **Cron jobs** | EventBridge Rules | Cron Triggers |
| **Compute** | Lambda (containers) | Workers (V8 isolates) |
| **Frontend hosting** | CloudFront + S3 | Cloudflare Pages |
| **Cost (est.)** | $20-50/month | $5-15/month |

---

## Migration Advantages (Cloudflare)

1. **Cost**: ~60-70% cheaper for similar workloads
2. **Performance**: Edge compute reduces latency globally
3. **Simplicity**: Fewer moving parts (no AppSync, EventBridge, SNS)
4. **Integration**: Native SprintJam integration (shared auth, UI)
5. **Developer Experience**: TypeScript-first, local dev with Miniflare

---

## Implementation Differences from Original Proposal

### 1. **Multi-tenant Fixits** (NEW)

The AWS implementation supports **concurrent fixit runs** (e.g., 2024-Q1, 2024-Q2 running simultaneously).

**Original Proposal**: Single fixit system per room
**AWS Implementation**: Multiple concurrent fixit runs globally
**Recommendation for SprintJam**: Hybrid approach
- Room-scoped fixits (per planning room)
- Optional global leaderboard across all rooms

---

### 2. **Advanced Point System** (ENHANCED)

**Original Proposal**: Simple 1-3 points based on label
**AWS Implementation**: Multi-factor scoring:
- Base points (event type)
- Label bonuses (bug, docs, enhancement)
- Severity bonuses (critical/p0: +8, high/p1: +5, etc.)
- Story points extraction (sp-3, story-points:5)

**Recommendation**: Adopt the AWS scoring system in full

---

### 3. **Snapshots & Analytics** (NEW)

**Original Proposal**: Real-time only
**AWS Implementation**: Nightly snapshots to S3 for historical analysis

**Recommendation**: Add snapshot functionality to Cloudflare
- Daily exports to R2
- Historical leaderboard queries
- Burndown charts

---

### 4. **Event Deduplication** (CRITICAL)

**Original Proposal**: Check event ID in Durable Object
**AWS Implementation**: DynamoDB conditional writes (`attribute_not_exists`)

**Recommendation**: Use D1 for idempotency
```sql
INSERT INTO fixit_events (event_id, ...) VALUES (?, ...)
ON CONFLICT(event_id) DO NOTHING
```

---

## Updated Architecture Diagram (Cloudflare + D1)

```
┌─────────────────────────────────────────────────────────────┐
│                    GitHub Actions Workflow                  │
│  (fixit-reporter.yml checks for "fixit" label)             │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ POST /api/github/webhook
                         │ X-Hub-Signature-256: sha256=...
                         │ X-GitHub-Delivery: <uuid>
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Cloudflare Worker (API Router)                 │
│  1. Verify HMAC signature                                   │
│  2. Calculate points (base + labels + severity + SP)        │
│  3. INSERT into D1 (idempotent)                             │
│  4. Forward to Durable Object if new event                  │
└────────┬───────────────────────────────┬────────────────────┘
         │                               │
         │ (3) Write                     │ (4) Forward
         ▼                               ▼
┌──────────────────────┐     ┌──────────────────────────────┐
│   D1 Database        │     │  Fixit Durable Object        │
│  (Permanent Storage) │     │  (Real-time Aggregation)     │
│                      │     │                              │
│  ┌────────────────┐  │     │  ┌────────────────────────┐ │
│  │ fixit_events   │  │     │  │ In-memory cache:       │ │
│  │ (eventId PK)   │  │     │  │ Top 100 leaderboard    │ │
│  └────────────────┘  │     │  └────────────────────────┘ │
│                      │     │                              │
│  ┌────────────────┐  │◄────┤  Updates D1 leaderboard      │
│  │ leaderboard    │  │     │  (atomic SQL)                │
│  │ (fixitId+user) │  │     │                              │
│  └────────────────┘  │     │  Broadcasts to WebSocket     │
│                      │     │  sessions                    │
│  ┌────────────────┐  │     └──────────────┬───────────────┘
│  │ fixit_runs     │  │                    │
│  │ (fixitId PK)   │  │                    │ WebSocket
│  └────────────────┘  │                    │
└──────────────────────┘                    ▼
                              ┌──────────────────────────────┐
                              │  WebSocket Clients           │
                              │  (React Frontend)            │
                              │                              │
                              │  • Live leaderboard updates  │
                              │  • Real-time point changes   │
                              │  • Notification toasts       │
                              └──────────────────────────────┘

         ┌────────────────────────────────────────┐
         │  Cloudflare Cron Trigger (Daily 6 AM)  │
         └───────────────┬────────────────────────┘
                         │
                         ▼
         ┌────────────────────────────────────────┐
         │  Snapshot Worker                       │
         │  • Query D1 leaderboards               │
         │  • Export to R2 bucket                 │
         │  • Generate analytics data             │
         └────────────────────────────────────────┘
```

---

## Implementation Plan (Updated)

### Phase 1: D1 Schema + Ingestion (Week 1)
- [ ] Create D1 database and tables
- [ ] Implement GitHub webhook ingestion endpoint
- [ ] Implement point calculation logic (AWS algorithm)
- [ ] Implement signature verification
- [ ] Test idempotent event processing

### Phase 2: Durable Object + Real-time (Week 2)
- [ ] Create Fixit Durable Object class
- [ ] Implement WebSocket session management
- [ ] Implement leaderboard aggregation (D1 updates)
- [ ] Broadcast leaderboard updates via WebSocket
- [ ] Test with multiple concurrent clients

### Phase 3: Frontend Integration (Week 3)
- [ ] Create FixitLeaderboard React component
- [ ] Create FixitRunSelector component (choose active fixit)
- [ ] Implement WebSocket hook
- [ ] Integrate with existing SprintJam UI (new tab in room)
- [ ] Dark theme styling

### Phase 4: Admin & Analytics (Week 4)
- [ ] Implement /runs CRUD endpoints (create, list, update, delete fixits)
- [ ] Implement snapshot cron job (R2 exports)
- [ ] Create historical leaderboard query endpoint
- [ ] Add burndown charts (fixits resolved over time)
- [ ] Admin UI for managing fixit runs

### Phase 5: Notifications & Polish (Week 5)
- [ ] High-severity notifications (Cloudflare Queue → Email Worker)
- [ ] Slack integration (post daily leaderboard)
- [ ] GitHub Actions workflow template
- [ ] Documentation and deployment

---

## Cost Comparison

### AWS (Current)

| Service | Usage | Monthly Cost |
|---------|-------|--------------|
| DynamoDB | 10M reads, 1M writes | $5-10 |
| Lambda | 5M invocations | $1-2 |
| AppSync | 5M requests | $20-25 |
| EventBridge | 1M events | $1 |
| SNS | 100K notifications | $0.50 |
| S3 + CloudFront | 10 GB storage, 100 GB transfer | $5 |
| **Total** | | **$32-43/month** |

---

### Cloudflare (Proposed)

| Service | Usage | Monthly Cost |
|---------|-------|--------------|
| Workers | 10M requests | $5 (100k free, then $0.50/M) |
| Durable Objects | 10M requests | $0.15 (1M free, then $0.15/M) |
| D1 | 10M reads, 1M writes, 1 GB | Free (generous free tier) |
| R2 | 10 GB storage | Free (10 GB/month free) |
| Pages | Static hosting | Free |
| Queues (notifications) | 100K messages | Free (1M free) |
| **Total** | | **$5-10/month** |

**Savings: ~75%**

---

## Conclusion

The AWS implementation provides a robust, production-ready foundation. By adapting it to Cloudflare's stack:

1. **We maintain all core features** (multi-tenant, advanced scoring, real-time, snapshots)
2. **We reduce costs** significantly (~75% savings)
3. **We simplify the architecture** (fewer services to manage)
4. **We gain SprintJam integration** (shared auth, UI consistency)

**Recommendation**: Proceed with Cloudflare + D1 implementation using the AWS logic as the blueprint.

---

**Next Steps:**
1. Create D1 schema migration
2. Port AWS Lambda functions to Cloudflare Workers
3. Implement Durable Object for real-time updates
4. Build React frontend components
5. Deploy and test with GitHub Actions workflow

---

**Document Version**: 1.0
**Last Updated**: 2025-11-25
**Author**: Claude (AI Assistant)
**Status**: Ready for Implementation
