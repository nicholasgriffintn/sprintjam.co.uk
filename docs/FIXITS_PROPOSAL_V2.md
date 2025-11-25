# SprintJam Fixits Feature Proposal (v2.0)

## Executive Summary

**Fixits** is a gamified bug-tracking system for SprintJam that incentivizes teams to tackle small improvements, tech debt, and quick bugs. This proposal adapts the proven AWS-based Fixits platform to Cloudflare's infrastructure.

**Key Benefits:**
- **Proven Design**: Based on production AWS implementation with real-world usage
- **Advanced Scoring**: Multi-factor point system with severity, labels, and story points
- **Multi-tenant**: Support concurrent "fixit runs" (Q1 2024, Q2 2024, etc.)
- **Real-time**: Live leaderboard updates via WebSockets
- **Cost-effective**: ~75% cheaper than AWS ($5-10/month vs $32-43/month)
- **Integrated**: Seamlessly integrates with existing SprintJam rooms

---

## Architecture Overview

### System Flow

```
GitHub Actions Workflow
  ↓ (POST with HMAC signature)
Cloudflare Worker
  ↓ (write)
D1 Database (fixit_events) ← PERMANENT, IDEMPOTENT
  ↓ (forward if new)
Fixit Durable Object
  ↓ (aggregate)
D1 Database (leaderboard) ← PERMANENT
  ↓ (broadcast)
WebSocket Clients → Live UI updates
```

### Why D1 is Required

Unlike the PlanningRoom (which uses Durable Object SQLite), Fixits requires **D1** because:

1. **Data permanence**: Fixit events must survive Durable Object evictions
2. **Cross-room queries**: Global leaderboards across all SprintJam rooms
3. **Historical analytics**: Query events from months ago for reports
4. **Idempotency**: Database-level `ON CONFLICT` for duplicate event detection
5. **Snapshots**: Export historical data without querying Durable Objects
6. **Scalability**: D1 is designed for large datasets (millions of events)

**PlanningRoom doesn't need D1** because:
- Room data is ephemeral (sprint-scoped)
- No cross-room queries needed
- Durable Object lifetime matches room lifetime

---

## Database Schema (D1)

### Table 1: `fixit_events`

**Purpose**: Permanent event log for all GitHub activity (idempotent)

```sql
CREATE TABLE fixit_events (
  -- Primary key
  event_id TEXT PRIMARY KEY,              -- GitHub X-GitHub-Delivery header

  -- Event metadata
  fixit_id TEXT NOT NULL,                 -- 2024-Q1, 2024-Q2, or room-specific ID
  room_id TEXT,                           -- Optional: SprintJam room ID
  user TEXT NOT NULL,                     -- GitHub username

  -- Calculated points
  points INTEGER NOT NULL,                -- Total points (base + bonuses)
  base_points INTEGER NOT NULL,           -- Base points from event type
  label_bonus INTEGER DEFAULT 0,          -- Bonus from labels (bug, docs, etc.)
  severity_bonus INTEGER DEFAULT 0,       -- Bonus from severity (critical, high, etc.)
  story_points INTEGER DEFAULT 0,         -- Explicit story points from labels

  -- Enriched metadata
  event_type TEXT NOT NULL,               -- pull_request, issues, workflow_run, push
  action TEXT,                            -- opened, closed, merged, etc.
  labels TEXT,                            -- JSON array of label names
  severity TEXT,                          -- critical, high, medium, low, p0-p3
  timestamp INTEGER NOT NULL,             -- Event timestamp (ms)

  -- Raw data
  raw_payload TEXT,                       -- Full GitHub event JSON (for replay/debug)

  -- Audit
  created_at INTEGER NOT NULL,            -- Ingestion time

  UNIQUE(event_id)                        -- Prevent duplicates
);

CREATE INDEX idx_fixit_lookup ON fixit_events(fixit_id, timestamp DESC);
CREATE INDEX idx_user_fixit ON fixit_events(user, fixit_id, timestamp DESC);
CREATE INDEX idx_event_type ON fixit_events(event_type, fixit_id);
```

**Example row:**
```json
{
  "event_id": "12345678-1234-1234-1234-123456789012",
  "fixit_id": "2024-Q1",
  "room_id": null,
  "user": "alice",
  "points": 15,
  "base_points": 5,
  "label_bonus": 2,
  "severity_bonus": 5,
  "story_points": 3,
  "event_type": "pull_request",
  "action": "closed",
  "labels": "[\"bug\", \"severity:high\", \"sp-3\"]",
  "severity": "high",
  "timestamp": 1700000000000,
  "raw_payload": "{...}",
  "created_at": 1700000001000
}
```

---

### Table 2: `leaderboard`

**Purpose**: Aggregated user scores per fixit run

```sql
CREATE TABLE leaderboard (
  -- Composite key
  fixit_id TEXT NOT NULL,
  user TEXT NOT NULL,

  -- Core metrics
  points INTEGER DEFAULT 0,
  bugs_closed INTEGER DEFAULT 0,
  prs_merged INTEGER DEFAULT 0,
  issues_closed INTEGER DEFAULT 0,

  -- Latest event data
  last_event_timestamp INTEGER,
  last_severity TEXT,
  last_labels TEXT,                       -- JSON array
  last_story_points INTEGER,
  delta_points INTEGER,                   -- Points from last event

  -- Ranking (pre-calculated for fast queries)
  rank INTEGER,

  -- Audit
  updated_at INTEGER NOT NULL,

  PRIMARY KEY (fixit_id, user)
);

CREATE INDEX idx_leaderboard_points ON leaderboard(fixit_id, points DESC);
CREATE INDEX idx_leaderboard_rank ON leaderboard(fixit_id, rank ASC);
```

**Example row:**
```json
{
  "fixit_id": "2024-Q1",
  "user": "alice",
  "points": 127,
  "bugs_closed": 12,
  "prs_merged": 8,
  "issues_closed": 4,
  "last_event_timestamp": 1700000000000,
  "last_severity": "high",
  "last_labels": "[\"bug\", \"severity:high\"]",
  "last_story_points": 3,
  "delta_points": 15,
  "rank": 1,
  "updated_at": 1700000001000
}
```

---

### Table 3: `fixit_runs`

**Purpose**: Manage active fixit competitions (quarters, custom events)

```sql
CREATE TABLE fixit_runs (
  -- Primary key
  fixit_id TEXT PRIMARY KEY,              -- 2024-Q1, hackathon-2024, etc.

  -- Metadata
  name TEXT NOT NULL,                     -- "Q1 2024 Bug Bash"
  description TEXT,
  start_date INTEGER,                     -- Timestamp (ms)
  end_date INTEGER,                       -- Timestamp (ms)
  is_active BOOLEAN DEFAULT TRUE,

  -- Configuration
  config TEXT,                            -- JSON: { requiredLabel: "fixit", pointMultiplier: 1.5, ... }

  -- SprintJam integration (optional)
  room_id TEXT,                           -- Link to specific SprintJam room
  moderator TEXT,                         -- Room moderator who created this run

  -- Audit
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_active_runs ON fixit_runs(is_active, start_date DESC);
CREATE INDEX idx_room_fixits ON fixit_runs(room_id, is_active);
```

**Example row:**
```json
{
  "fixit_id": "2024-Q1",
  "name": "Q1 2024 Bug Bash",
  "description": "First quarter fixit competition",
  "start_date": 1704067200000,
  "end_date": 1711929600000,
  "is_active": true,
  "config": "{\"requiredLabel\":\"fixit\",\"pointMultiplier\":1.0}",
  "room_id": null,
  "moderator": null,
  "created_at": 1704067200000,
  "updated_at": 1704067200000
}
```

---

### Table 4: `leaderboard_snapshots` (Optional - Analytics)

**Purpose**: Historical snapshots for burndown charts and retrospectives

```sql
CREATE TABLE leaderboard_snapshots (
  snapshot_id TEXT PRIMARY KEY,
  fixit_id TEXT NOT NULL,
  snapshot_timestamp INTEGER NOT NULL,
  leaderboard_json TEXT NOT NULL,         -- Full leaderboard snapshot
  total_points INTEGER,
  total_users INTEGER,

  created_at INTEGER NOT NULL
);

CREATE INDEX idx_snapshots_fixit ON leaderboard_snapshots(fixit_id, snapshot_timestamp DESC);
```

---

## Point Calculation System

### Multi-Factor Scoring (Adapted from AWS)

```typescript
interface PointCalculation {
  basePoints: number;        // Event type bonus
  labelBonus: number;        // Label-based bonus
  severityBonus: number;     // Severity-based bonus
  storyPoints: number;       // Explicit SP from labels
  total: number;             // Sum of all
}
```

### 1. Base Points (Event Type)

```typescript
function calculateBasePoints(eventType: string, action: string, payload: any): number {
  switch (eventType) {
    case 'pull_request':
      if (action === 'closed' && payload.pull_request?.merged) return 5;  // Merged PR
      if (action === 'opened') return 2;                                  // Opened PR
      return 3;                                                           // Other PR actions

    case 'issues':
      if (action === 'closed') return 2;                                  // Closed issue
      return 1;                                                           // Opened issue

    case 'workflow_run':
      if (payload.workflow_run?.conclusion === 'success') return 2;       // Successful workflow
      return 1;                                                           // Other workflow

    case 'push':
      return 1;                                                           // Push event

    default:
      return 1;                                                           // Unknown event
  }
}
```

**Examples:**
- Merged PR: **5 points**
- Opened PR: **2 points**
- Closed issue: **2 points**
- Successful workflow: **2 points**

---

### 2. Label Bonuses

```typescript
function calculateLabelBonus(labels: string[]): number {
  let bonus = 0;

  for (const label of labels) {
    const name = label.toLowerCase();

    // Bug fixes
    if (name.includes('bug')) bonus += 2;

    // Documentation and enhancements
    if (name.includes('documentation') || name.includes('docs')) bonus += 1;
    if (name.includes('enhancement') || name.includes('feature')) bonus += 1;

    // Priority labels
    if (name.includes('priority')) {
      if (name.includes('critical') || name.includes('p0')) bonus += 6;
      else if (name.includes('high') || name.includes('p1')) bonus += 4;
      else if (name.includes('medium') || name.includes('p2')) bonus += 2;
      else if (name.includes('low') || name.includes('p3')) bonus += 1;
    }

    // Tech debt
    if (name.includes('tech-debt') || name.includes('technical debt')) bonus += 2;

    // Performance
    if (name.includes('performance') || name.includes('optimization')) bonus += 3;

    // Security
    if (name.includes('security') || name.includes('vulnerability')) bonus += 5;
  }

  return bonus;
}
```

**Examples:**
- `["bug"]` → **+2**
- `["bug", "priority:high"]` → **+6** (2 + 4)
- `["security", "critical"]` → **+11** (5 + 6)
- `["documentation"]` → **+1**

---

### 3. Severity Bonuses

```typescript
function parseSeverity(labels: string[]): { severity: string | null; bonus: number } {
  for (const label of labels) {
    const match = label.match(/severity[:\s-]?([a-z0-5]+)/i);
    if (match) {
      const severity = match[1].toLowerCase();

      if (severity === 'critical' || severity === 'p0') return { severity: 'critical', bonus: 8 };
      if (severity === 'high' || severity === 'p1') return { severity: 'high', bonus: 5 };
      if (severity === 'medium' || severity === 'p2') return { severity: 'medium', bonus: 3 };
      if (severity === 'low' || severity === 'p3') return { severity: 'low', bonus: 1 };
    }
  }

  return { severity: null, bonus: 0 };
}
```

**Label patterns:**
- `severity-critical`, `severity:critical`, `severity critical` → **+8**
- `severity-high`, `severity-p1` → **+5**
- `severity-medium`, `severity-p2` → **+3**
- `severity-low`, `severity-p3` → **+1**

---

### 4. Story Points Extraction

```typescript
function extractStoryPoints(labels: string[]): number {
  for (const label of labels) {
    const match = label.match(/(?:sp|story[\s-]*points?)[:\s-]?(\d+)/i);
    if (match) {
      return parseInt(match[1], 10);
    }
  }
  return 0;
}
```

**Label patterns:**
- `sp-3`, `sp:3`, `sp 3` → **+3**
- `story-points-5`, `story points: 5` → **+5**

---

### Complete Example

**GitHub PR merged with labels:**
```json
{
  "action": "closed",
  "pull_request": { "merged": true },
  "labels": ["bug", "severity:high", "sp-3"]
}
```

**Point calculation:**
```typescript
basePoints = 5           // Merged PR
labelBonus = 2           // "bug" label
severityBonus = 5        // "severity:high"
storyPoints = 3          // "sp-3"
total = 15 points
```

---

## API Endpoints

### GitHub Webhook

```
POST /api/github/webhook
Headers:
  X-Hub-Signature-256: sha256=...
  X-GitHub-Delivery: <uuid>
  Content-Type: application/json
Body: GitHub event payload
```

**Flow:**
1. Verify HMAC signature
2. Extract event metadata (type, action, user, labels, timestamp)
3. Calculate points (base + label + severity + story points)
4. Insert into D1 `fixit_events` (idempotent via `ON CONFLICT`)
5. If new event, forward to Durable Object for aggregation
6. Return 200 OK

---

### Leaderboard Queries

```
GET /api/fixits/leaderboard
Query params:
  ?fixitId=2024-Q1    (optional, defaults to latest active)
  ?limit=100          (optional, default 100)

Response:
{
  "fixitId": "2024-Q1",
  "name": "Q1 2024 Bug Bash",
  "entries": [
    {
      "user": "alice",
      "points": 127,
      "bugs_closed": 12,
      "prs_merged": 8,
      "rank": 1,
      "lastEventTimestamp": 1700000000000
    },
    ...
  ]
}
```

---

### Fixit Runs Management

```
GET /api/fixits/runs
GET /api/fixits/runs/:fixitId
POST /api/fixits/runs
PUT /api/fixits/runs/:fixitId
DELETE /api/fixits/runs/:fixitId

Headers:
  Authorization: Bearer <admin-token>  (for POST/PUT/DELETE)
```

---

## Durable Object: FixitRoom

### Purpose

The Durable Object serves as:
1. **Real-time aggregation**: Updates D1 leaderboard when events arrive
2. **WebSocket hub**: Broadcasts leaderboard changes to connected clients
3. **Cache**: Holds top N leaderboard entries in memory for fast queries

### Class Structure

```typescript
export class FixitRoom implements DurableObject {
  private state: DurableObjectState;
  private env: Env;
  private sessions: Map<WebSocket, { fixitId: string; user?: string }> = new Map();
  private leaderboardCache: Map<string, LeaderboardEntry[]> = new Map();

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    // Handle WebSocket upgrade
    if (request.headers.get('Upgrade') === 'websocket') {
      return this.handleWebSocket(request);
    }

    // Handle HTTP endpoints
    const url = new URL(request.url);

    if (url.pathname === '/update-leaderboard' && request.method === 'POST') {
      return this.updateLeaderboard(request);
    }

    if (url.pathname === '/leaderboard' && request.method === 'GET') {
      return this.getLeaderboard(request);
    }

    return new Response('Not found', { status: 404 });
  }

  private async handleWebSocket(request: Request): Promise<Response> {
    const { 0: client, 1: server } = new WebSocketPair();

    server.accept();

    server.addEventListener('message', async (event) => {
      const message = JSON.parse(event.data as string);

      if (message.type === 'subscribe') {
        this.sessions.set(server, { fixitId: message.fixitId, user: message.user });

        // Send current leaderboard
        const leaderboard = await this.fetchLeaderboard(message.fixitId);
        server.send(JSON.stringify({ type: 'leaderboard', payload: leaderboard }));
      }
    });

    server.addEventListener('close', () => {
      this.sessions.delete(server);
    });

    return new Response(null, { status: 101, webSocket: client });
  }

  private async updateLeaderboard(request: Request): Promise<Response> {
    const { user, points, fixitId, timestamp, severity, labels, storyPoints } = await request.json();

    // Update D1 leaderboard (atomic SQL)
    await this.env.DB.prepare(`
      INSERT INTO leaderboard (fixit_id, user, points, bugs_closed, last_event_timestamp, last_severity, last_labels, last_story_points, delta_points, updated_at)
      VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(fixit_id, user) DO UPDATE SET
        points = points + excluded.points,
        bugs_closed = bugs_closed + 1,
        last_event_timestamp = excluded.last_event_timestamp,
        last_severity = excluded.last_severity,
        last_labels = excluded.last_labels,
        last_story_points = excluded.last_story_points,
        delta_points = excluded.delta_points,
        updated_at = excluded.updated_at
    `).bind(
      fixitId, user, points, timestamp, severity, JSON.stringify(labels), storyPoints, points, Date.now()
    ).run();

    // Fetch updated leaderboard
    const leaderboard = await this.fetchLeaderboard(fixitId);

    // Update cache
    this.leaderboardCache.set(fixitId, leaderboard);

    // Broadcast to WebSocket clients
    this.broadcast(fixitId, { type: 'leaderboardUpdated', payload: leaderboard });

    return new Response('OK', { status: 200 });
  }

  private async fetchLeaderboard(fixitId: string): Promise<LeaderboardEntry[]> {
    const result = await this.env.DB.prepare(`
      SELECT * FROM leaderboard WHERE fixit_id = ? ORDER BY points DESC LIMIT 100
    `).bind(fixitId).all();

    return result.results as LeaderboardEntry[];
  }

  private broadcast(fixitId: string, message: any) {
    for (const [ws, session] of this.sessions) {
      if (session.fixitId === fixitId) {
        ws.send(JSON.stringify(message));
      }
    }
  }
}
```

---

## Frontend Integration

### React Component

```tsx
// src/components/fixits/FixitLeaderboard.tsx
import { useEffect, useState } from 'react';
import { useFixitWebSocket } from '@/hooks/useFixitWebSocket';

interface LeaderboardEntry {
  user: string;
  points: number;
  bugs_closed: number;
  prs_merged: number;
  rank: number;
  lastEventTimestamp: number;
}

export function FixitLeaderboard({ fixitId }: { fixitId: string }) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Initial fetch
  useEffect(() => {
    fetch(`/api/fixits/leaderboard?fixitId=${fixitId}`)
      .then(r => r.json())
      .then(data => {
        setLeaderboard(data.entries);
        setLoading(false);
      });
  }, [fixitId]);

  // Real-time updates via WebSocket
  useFixitWebSocket(fixitId, (message) => {
    if (message.type === 'leaderboardUpdated') {
      setLeaderboard(message.payload);
    }
  });

  if (loading) return <div>Loading...</div>;

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
            <th>PRs Merged</th>
            <th>Last Activity</th>
          </tr>
        </thead>
        <tbody>
          {leaderboard.map((entry, index) => (
            <tr key={entry.user} className={index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : ''}>
              <td>{index + 1}</td>
              <td>{entry.user}</td>
              <td className="points">{entry.points}</td>
              <td>{entry.bugs_closed}</td>
              <td>{entry.prs_merged}</td>
              <td>{new Date(entry.lastEventTimestamp).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

### WebSocket Hook

```typescript
// src/hooks/useFixitWebSocket.ts
import { useEffect } from 'react';

export function useFixitWebSocket(fixitId: string, onMessage: (msg: any) => void) {
  useEffect(() => {
    const ws = new WebSocket(`wss://api.sprintjam.co.uk/api/fixits/ws`);

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'subscribe', fixitId }));
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      onMessage(message);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => ws.close();
  }, [fixitId]);
}
```

---

## GitHub Actions Workflow

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
          # Extract labels from event payload
          labels=$(jq -r '.issue.labels // .pull_request.labels // [] | .[].name' $GITHUB_EVENT_PATH)

          # Check if "fixit" label exists
          if ! echo "$labels" | grep -q "fixit"; then
            echo "No fixit label found, skipping"
            exit 0
          fi

      - name: Send event to API
        env:
          WEBHOOK_URL: ${{ secrets.FIXIT_WEBHOOK_URL }}
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

**Repository secrets:**
- `FIXIT_WEBHOOK_URL`: `https://api.sprintjam.co.uk/api/github/webhook`
- `FIXIT_WEBHOOK_SECRET`: Shared secret for HMAC verification

---

## Implementation Phases

### Phase 1: D1 Setup + Ingestion (Week 1)
- [ ] Create D1 database (`wrangler d1 create sprintjam-fixits`)
- [ ] Run schema migrations (`fixit_events`, `leaderboard`, `fixit_runs`)
- [ ] Implement GitHub webhook endpoint (`POST /api/github/webhook`)
- [ ] Implement point calculation logic (base + labels + severity + SP)
- [ ] Implement HMAC signature verification
- [ ] Test idempotent event insertion
- [ ] Test with sample GitHub payloads

### Phase 2: Durable Object + Real-time (Week 2)
- [ ] Create `FixitRoom` Durable Object class
- [ ] Implement WebSocket session management
- [ ] Implement `/update-leaderboard` HTTP endpoint
- [ ] Implement leaderboard aggregation (D1 atomic updates)
- [ ] Implement WebSocket broadcasting
- [ ] Test with multiple concurrent clients
- [ ] Test real-time updates

### Phase 3: API + Frontend (Week 3)
- [ ] Implement `GET /api/fixits/leaderboard` endpoint
- [ ] Implement fixit runs CRUD endpoints (`/api/fixits/runs`)
- [ ] Create `FixitLeaderboard` React component
- [ ] Create `FixitRunSelector` component
- [ ] Create `useFixitWebSocket` hook
- [ ] Integrate with RoomScreen (new "Fixits" tab)
- [ ] Dark theme styling

### Phase 4: Analytics + Polish (Week 4)
- [ ] Implement snapshot cron job (daily export to R2)
- [ ] Create `GET /api/fixits/history/:fixitId` endpoint
- [ ] Create burndown chart component
- [ ] Admin UI for managing fixit runs
- [ ] Documentation (user guide, API reference)
- [ ] Deployment to production

---

## Cost Estimate (Cloudflare)

| Service | Usage (Monthly) | Cost |
|---------|----------------|------|
| **Workers** | 10M requests | $5 (100k free, then $0.50/M) |
| **Durable Objects** | 10M requests, 1 GB storage | $0.15/M (1M free) |
| **D1** | 10M reads, 1M writes, 5 GB storage | $0 (generous free tier) |
| **R2** | 10 GB storage, 100 GB egress | $0 (10 GB free, 10 GB egress free) |
| **Cloudflare Pages** | Static hosting | $0 (included) |
| **Queues** (notifications) | 100K messages | $0 (1M free) |
| **Total** | | **~$5-10/month** |

**Compared to AWS: ~75% cheaper**

---

## Success Metrics

After 3 months:
- **Adoption**: 30% of active SprintJam rooms enable fixits
- **Engagement**: Average 20 fixits per room per month
- **Velocity**: Average time-to-close under 48 hours
- **User satisfaction**: NPS 40+

---

## Open Questions

1. **Fixit scope**: Should fixits be room-scoped or global (quarters)?
   - **Recommendation**: Support both (room-level and global)

2. **Admin access**: Who can create/manage fixit runs?
   - **Recommendation**: SprintJam moderators only

3. **GitHub label**: Require "fixit" label or auto-track all issues/PRs?
   - **Recommendation**: Require label (reduces noise)

4. **Leaderboard visibility**: Public or room-members-only?
   - **Recommendation**: Room-members-only (privacy)

---

## Conclusion

This proposal adapts the proven AWS Fixits architecture to Cloudflare, providing:
- **Cost savings**: ~75% cheaper ($5-10/month)
- **Simplicity**: Fewer services to manage
- **Integration**: Native SprintJam features (auth, UI, rooms)
- **Performance**: Global edge compute
- **Scalability**: D1 handles millions of events

**Recommendation**: Proceed with implementation using D1 as the primary database.

---

**Document Version**: 2.0
**Last Updated**: 2025-11-25
**Author**: Claude (AI Assistant)
**Based on**: AWS Fixits production implementation
**Status**: Ready for Implementation
