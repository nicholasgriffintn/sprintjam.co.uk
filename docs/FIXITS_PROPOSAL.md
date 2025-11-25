# SprintJam Fixits Feature Proposal

## Executive Summary

**Fixits** is a proposed gamified bug-tracking and quick-fix system for SprintJam that incentivizes teams to tackle small improvements, tech debt, and quick bugs between sprints or during downtime.

**Key Benefits:**
- **Gamification**: Points, badges, and leaderboards motivate developers to tackle small issues
- **Visibility**: Track team velocity on small improvements
- **Integration**: Connect with GitHub issues/PRs automatically
- **Real-time**: Live updates via WebSockets, just like the planning room
- **Team Culture**: Encourages proactive problem-solving

---

## System Architecture

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────┐
│                        GITHUB                               │
│  (Issues, PRs, Actions, Webhooks)                          │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ POST /api/github/webhook
                 │ (issue closed, PR merged, etc.)
                 ▼
┌─────────────────────────────────────────────────────────────┐
│              CLOUDFLARE WORKER (api/index.ts)               │
│  • Verify GitHub signature                                  │
│  • Parse event payload                                      │
│  • Route to Fixit Controller                               │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ├──────────────────────┬─────────────────────┐
                 ▼                      ▼                     ▼
┌─────────────────────────────┐ ┌──────────────┐ ┌──────────────────┐
│   FIXIT DURABLE OBJECT      │ │  D1 DATABASE │ │  FRONTEND        │
│  (Real-time state machine)  │ │  (Optional)  │ │  (React + WSS)   │
│                             │ │              │ │                  │
│  • SQLite storage           │ │  • Events    │ │  • Live updates  │
│  • WebSocket connections    │ │  • Snapshots │ │  • Leaderboard   │
│  • Leaderboard calculation  │ │  • Analytics │ │  • Fixit cards   │
│  • Points & badges          │ │              │ │  • GitHub links  │
└─────────────────────────────┘ └──────────────┘ └──────────────────┘
```

---

## Architecture Options

We have **two architectural approaches** to consider:

### Option A: SQLite-Only (Follows Existing Pattern) ⭐ **RECOMMENDED**

**Consistency with current codebase:**
- Matches the PlanningRoom pattern exactly
- All state in the Durable Object's SQLite storage
- No additional database to manage
- Simpler implementation

**Tables within Fixit Durable Object:**
```sql
CREATE TABLE fixits (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  github_issue_url TEXT,
  github_pr_url TEXT,
  status TEXT DEFAULT 'open', -- open, in_progress, resolved, closed
  priority TEXT DEFAULT 'medium', -- low, medium, high
  points INTEGER DEFAULT 1,
  creator TEXT NOT NULL,
  resolver TEXT,
  created_at INTEGER NOT NULL,
  resolved_at INTEGER,
  labels TEXT -- JSON array
);

CREATE TABLE fixit_comments (
  id TEXT PRIMARY KEY,
  fixit_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  comment TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (fixit_id) REFERENCES fixits(id)
);

CREATE TABLE fixit_events (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  event_type TEXT NOT NULL, -- created, resolved, commented, etc.
  user_name TEXT NOT NULL,
  fixit_id TEXT,
  points INTEGER,
  github_event_id TEXT,
  raw_json TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE leaderboard (
  user_name TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  total_points INTEGER DEFAULT 0,
  fixits_resolved INTEGER DEFAULT 0,
  badges TEXT, -- JSON array
  last_updated INTEGER
);
```

**Pros:**
- Consistent with existing codebase patterns
- Single source of truth
- Simpler deployment (no D1 setup)
- Faster queries (all in-memory)
- WebSocket updates are straightforward

**Cons:**
- Historical analytics limited to one room's Durable Object
- Cross-room analytics would require aggregation
- Can't easily query all rooms' fixits globally

---

### Option B: Hybrid (SQLite + D1)

**Use both storage layers:**
- **Durable Object SQLite**: Real-time state, WebSocket connections, room-specific data
- **D1 Database**: Historical events, global leaderboards, cross-room analytics

**D1 Tables:**
```sql
CREATE TABLE fixit_events (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  user_name TEXT NOT NULL,
  github_event_id TEXT,
  issue_number INTEGER,
  points INTEGER,
  timestamp INTEGER,
  raw_json TEXT
);

CREATE TABLE global_leaderboard (
  user_name TEXT PRIMARY KEY,
  total_points INTEGER,
  total_fixits INTEGER,
  rooms_participated TEXT, -- JSON array
  badges TEXT, -- JSON array
  last_updated INTEGER
);

CREATE TABLE leaderboard_snapshots (
  room_id TEXT,
  timestamp INTEGER,
  leaderboard_json TEXT,
  PRIMARY KEY (room_id, timestamp)
);
```

**Flow:**
1. GitHub webhook → Worker
2. Worker writes to D1 (idempotent, permanent record)
3. Worker forwards to Durable Object
4. DO updates real-time state and broadcasts via WebSocket
5. DO periodically snapshots to D1

**Pros:**
- Global analytics across all rooms
- Historical data independent of Durable Object lifecycle
- Can build company-wide dashboards
- Easier to audit and replay events

**Cons:**
- More complex architecture
- Two databases to manage
- Potential consistency issues (requires careful design)
- Additional D1 costs

---

## Recommended Approach: **Option A (SQLite-Only)**

For the initial implementation, we recommend **Option A** because:

1. **Consistency**: Matches existing PlanningRoom architecture
2. **Simplicity**: One less moving part
3. **Speed**: Faster to implement and test
4. **Performance**: All queries in-memory
5. **Migration path**: Can always add D1 later for global analytics

**Future consideration**: If SprintJam grows to need cross-room analytics or company-wide leaderboards, we can add D1 as a secondary storage layer without breaking existing functionality.

---

## Durable Object: FixitRoom

### Class Structure

```typescript
// api/services/fixit-room.ts
export class FixitRoom implements DurableObject {
  private state: DurableObjectState;
  private env: Env;
  private sql: SqlStorage;
  private sessions: Map<WebSocket, SessionInfo>;
  private repository: FixitRepository;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
    this.sql = this.state.storage.sql;
    this.sessions = new Map();
    this.repository = new FixitRepository(this.sql);
  }

  async fetch(request: Request): Promise<Response> {
    // Handle HTTP endpoints and WebSocket upgrades
  }

  // Core methods
  async initialize(roomId: string): Promise<void>
  async addFixit(fixit: CreateFixitInput): Promise<Fixit>
  async resolveFixit(fixitId: string, resolver: string): Promise<Fixit>
  async getLeaderboard(): Promise<Leaderboard>
  async handleGitHubEvent(event: GitHubEvent): Promise<void>

  // Broadcasting
  private broadcast(message: WebSocketMessage): void
}
```

### Repository Pattern

```typescript
// api/repositories/fixit-room.ts
export class FixitRepository {
  constructor(private sql: SqlStorage) {}

  // Schema initialization
  async initializeSchema(): Promise<void>

  // Fixit CRUD
  async createFixit(fixit: CreateFixitInput): Promise<Fixit>
  async getFixit(id: string): Promise<Fixit | null>
  async listFixits(filters: FixitFilters): Promise<Fixit[]>
  async updateFixit(id: string, updates: Partial<Fixit>): Promise<Fixit>
  async deleteFixit(id: string): Promise<void>

  // Events
  async logEvent(event: FixitEvent): Promise<void>
  async getEvents(filters: EventFilters): Promise<FixitEvent[]>

  // Leaderboard
  async updateLeaderboard(userName: string, points: number): Promise<void>
  async getLeaderboard(): Promise<LeaderboardEntry[]>
  async getUserStats(userName: string): Promise<UserStats>
}
```

---

## API Endpoints

### Worker Routes (api/index.ts)

```typescript
// GitHub integration
POST   /api/github/webhook          // Receive GitHub webhooks
POST   /api/github/oauth/callback   // GitHub OAuth callback
GET    /api/github/repos            // List user's repositories

// Fixit room management (proxied to Durable Object)
POST   /api/fixits/:roomId/initialize
GET    /api/fixits/:roomId/list
POST   /api/fixits/:roomId/create
PUT    /api/fixits/:roomId/:fixitId
DELETE /api/fixits/:roomId/:fixitId
GET    /api/fixits/:roomId/leaderboard
```

### Durable Object HTTP Endpoints (api/services/fixit-room-http.ts)

```typescript
POST   /initialize               // Initialize fixit room
GET    /fixits                   // List all fixits
POST   /fixits                   // Create fixit
PUT    /fixits/:id               // Update fixit
DELETE /fixits/:id               // Delete fixit
POST   /fixits/:id/resolve       // Mark fixit as resolved
POST   /fixits/:id/comment       // Add comment
GET    /leaderboard              // Get leaderboard
GET    /stats/:userName          // Get user stats
POST   /github/event             // Handle GitHub event
```

---

## WebSocket Messages

### Client → Server

```typescript
type ClientMessage =
  | { type: 'createFixit'; payload: CreateFixitInput }
  | { type: 'updateFixit'; payload: { id: string; updates: Partial<Fixit> } }
  | { type: 'resolveFixit'; payload: { id: string } }
  | { type: 'deleteFixit'; payload: { id: string } }
  | { type: 'addComment'; payload: { fixitId: string; comment: string } }
  | { type: 'getLeaderboard' }
  | { type: 'ping' };
```

### Server → Client (Broadcasts)

```typescript
type ServerMessage =
  | { type: 'fixitCreated'; payload: Fixit }
  | { type: 'fixitUpdated'; payload: Fixit }
  | { type: 'fixitResolved'; payload: Fixit }
  | { type: 'fixitDeleted'; payload: { id: string } }
  | { type: 'commentAdded'; payload: { fixitId: string; comment: FixitComment } }
  | { type: 'leaderboardUpdated'; payload: LeaderboardEntry[] }
  | { type: 'githubEventReceived'; payload: { fixitId: string; event: string } }
  | { type: 'error'; payload: { message: string } };
```

---

## GitHub Integration

### Webhook Events to Handle

```typescript
// api/controllers/github-webhook-controller.ts
export class GitHubWebhookController {
  // Handle these events:
  async handleIssues(event: IssuesEvent): Promise<Response>
  async handlePullRequest(event: PullRequestEvent): Promise<Response>
  async handleIssueComment(event: IssueCommentEvent): Promise<Response>
}
```

### Event Mapping

| GitHub Event | Action | Fixit Action |
|-------------|--------|--------------|
| `issues.opened` with label `fixit-small` | Auto-create fixit (1 point) | Create fixit |
| `issues.opened` with label `fixit-medium` | Auto-create fixit (2 points) | Create fixit |
| `issues.opened` with label `fixit-large` | Auto-create fixit (3 points) | Create fixit |
| `issues.closed` | Mark fixit resolved | Resolve fixit, award points |
| `pull_request.merged` with linked issue | Mark fixit resolved | Resolve fixit, award points |
| `issue_comment.created` | Add comment to fixit | Add comment |

### Label-Based Point System

```typescript
const POINT_LABELS = {
  'fixit-small': 1,
  'fixit-medium': 2,
  'fixit-large': 3,
} as const;
```

### OAuth Flow

1. User clicks "Connect GitHub" in SprintJam
2. Redirect to GitHub OAuth (scopes: `repo`, `read:user`)
3. Callback stores token in `oauth_credentials` table
4. Register webhook URL with GitHub (per repo or organization)

---

## Frontend Implementation

### New Components

```
src/components/fixits/
├── FixitDashboard.tsx          // Main fixit interface
├── FixitCard.tsx                // Individual fixit card
├── FixitDetailModal.tsx         // Detailed view and comments
├── FixitLeaderboard.tsx         // Points leaderboard
├── FixitForm.tsx                // Create/edit fixit form
├── GitHubConnectionModal.tsx    // Connect GitHub account
└── FixitFilters.tsx             // Filter by status, priority, user
```

### Context Updates

```typescript
// src/context/RoomContext.tsx
interface RoomContextValue {
  // ... existing properties
  fixits: Fixit[];
  leaderboard: LeaderboardEntry[];
  createFixit: (fixit: CreateFixitInput) => Promise<void>;
  resolveFixit: (fixitId: string) => Promise<void>;
  addFixitComment: (fixitId: string, comment: string) => Promise<void>;
}
```

### New Route (Optional)

```typescript
// src/routes/FixitDashboardScreen.tsx
// Standalone fixit dashboard (if not integrated into RoomScreen)
```

### Integration with RoomScreen

Add a **"Fixits"** tab alongside **"Tickets"** in the existing room interface:

```tsx
// src/routes/RoomScreen.tsx
<Tabs>
  <Tab label="Planning Poker">
    {/* Existing voting interface */}
  </Tab>
  <Tab label="Tickets">
    {/* Existing ticket queue */}
  </Tab>
  <Tab label="Fixits"> {/* NEW */}
    <FixitDashboard />
  </Tab>
</Tabs>
```

---

## Gamification & Incentives

### Point System

| Action | Points |
|--------|--------|
| Create fixit | 0 points (no reward for creating) |
| Resolve small fixit | 1 point |
| Resolve medium fixit | 2 points |
| Resolve large fixit | 3 points |
| First fixit of the day | +1 bonus |
| Resolve 5 fixits in a week | +5 bonus |

### Badges

```typescript
const BADGES = [
  { id: 'first-fix', name: 'First Fix', description: 'Resolved your first fixit' },
  { id: 'fix-streak-3', name: 'On a Roll', description: '3 fixits in 3 days' },
  { id: 'fix-streak-7', name: 'Unstoppable', description: '7 fixits in 7 days' },
  { id: 'bug-slayer', name: 'Bug Slayer', description: '10 fixits resolved' },
  { id: 'bug-crusher', name: 'Bug Crusher', description: '50 fixits resolved' },
  { id: 'bug-annihilator', name: 'Bug Annihilator', description: '100 fixits resolved' },
  { id: 'team-player', name: 'Team Player', description: 'Commented on 10 fixits' },
  { id: 'early-bird', name: 'Early Bird', description: 'Resolved a fixit before 9 AM' },
  { id: 'night-owl', name: 'Night Owl', description: 'Resolved a fixit after 9 PM' },
] as const;
```

### Leaderboard Views

1. **Daily leaderboard** - Resets every 24 hours
2. **Weekly leaderboard** - Resets every Monday
3. **All-time leaderboard** - Never resets
4. **Team velocity chart** - Fixits resolved over time

---

## Data Types

### Core Types

```typescript
// api/types.ts
export interface Fixit {
  id: string;
  roomId: string;
  title: string;
  description?: string;
  githubIssueUrl?: string;
  githubPrUrl?: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  points: number;
  creator: string;
  resolver?: string;
  createdAt: number;
  resolvedAt?: number;
  labels: string[];
}

export interface CreateFixitInput {
  title: string;
  description?: string;
  githubIssueUrl?: string;
  priority?: 'low' | 'medium' | 'high';
  points?: number;
  creator: string;
}

export interface FixitComment {
  id: string;
  fixitId: string;
  userName: string;
  comment: string;
  createdAt: number;
}

export interface FixitEvent {
  id: string;
  roomId: string;
  eventType: 'created' | 'updated' | 'resolved' | 'commented' | 'deleted' | 'github_linked';
  userName: string;
  fixitId?: string;
  points?: number;
  githubEventId?: string;
  rawJson?: string;
  createdAt: number;
}

export interface LeaderboardEntry {
  userName: string;
  roomId: string;
  totalPoints: number;
  fixitsResolved: number;
  badges: Badge[];
  lastUpdated: number;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  earnedAt: number;
}

export interface UserStats {
  userName: string;
  totalPoints: number;
  fixitsResolved: number;
  fixitsCreated: number;
  commentsPosted: number;
  badges: Badge[];
  currentStreak: number;
  longestStreak: number;
}
```

---

## Implementation Phases

### Phase 1: Core Fixit System (Week 1-2)
- [ ] Create Fixit Durable Object class
- [ ] Implement Fixit repository (SQLite schema + CRUD)
- [ ] Add WebSocket message handlers
- [ ] Build basic frontend components (FixitCard, FixitList)
- [ ] Integrate with RoomScreen (new tab)
- [ ] Manual fixit creation and resolution

**Deliverable**: Users can manually create, update, and resolve fixits with real-time updates.

---

### Phase 2: GitHub Integration (Week 3)
- [ ] GitHub OAuth flow
- [ ] Webhook endpoint and signature verification
- [ ] Event parsing and routing
- [ ] Auto-create fixits from GitHub issues with labels
- [ ] Auto-resolve fixits when issues/PRs close
- [ ] Link existing fixits to GitHub issues

**Deliverable**: Fixits automatically sync with GitHub issues and PRs.

---

### Phase 3: Gamification (Week 4)
- [ ] Points calculation system
- [ ] Badge system and logic
- [ ] Leaderboard component
- [ ] Daily/weekly/all-time views
- [ ] User stats page
- [ ] Achievement notifications

**Deliverable**: Full gamification with badges, points, and leaderboards.

---

### Phase 4: Polish & Analytics (Week 5)
- [ ] Fixit filters (status, priority, assignee)
- [ ] Search functionality
- [ ] Team velocity chart
- [ ] Export data (CSV, JSON)
- [ ] Email notifications (optional)
- [ ] Dark mode styling

**Deliverable**: Production-ready fixit system with analytics.

---

## Configuration

### Wrangler Configuration

```jsonc
// wrangler.jsonc
{
  "durable_objects": {
    "bindings": [
      {
        "name": "PLANNING_ROOM",
        "class_name": "PlanningRoom",
        "script_name": "sprintjam-api"
      },
      {
        "name": "FIXIT_ROOM", // NEW
        "class_name": "FixitRoom",
        "script_name": "sprintjam-api"
      }
    ]
  }
}
```

### Environment Variables

```bash
# GitHub OAuth
GITHUB_CLIENT_ID=xxx
GITHUB_CLIENT_SECRET=xxx
GITHUB_WEBHOOK_SECRET=xxx

# Optional: D1 bindings (if using Option B)
# D1_DATABASE=fixit-events
```

---

## Security Considerations

### GitHub Webhook Verification

```typescript
// api/lib/github-signature-verification.ts
export async function verifyGitHubSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const mac = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  const expectedSignature = `sha256=${Array.from(new Uint8Array(mac))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')}`;
  return signature === expectedSignature;
}
```

### Rate Limiting

- Implement rate limiting on webhook endpoint (100 requests/minute per repo)
- Use Cloudflare Rate Limiting rules
- Add exponential backoff for GitHub API calls

### Authorization

- Verify session tokens for WebSocket connections (reuse existing `session_tokens` pattern)
- Only room members can create/resolve fixits
- Moderators can delete any fixit
- Regular users can only delete their own fixits

---

## Testing Strategy

### Unit Tests

```typescript
// api/__tests__/fixit-repository.test.ts
describe('FixitRepository', () => {
  test('creates fixit with correct schema');
  test('calculates points correctly');
  test('awards badges at thresholds');
});
```

### Integration Tests

```typescript
// api/__tests__/fixit-room.test.ts
describe('FixitRoom Durable Object', () => {
  test('broadcasts fixit creation to all connected clients');
  test('handles GitHub webhook and updates fixit');
  test('calculates leaderboard correctly');
});
```

### E2E Tests

```typescript
// e2e/fixit-flow.test.ts
describe('Fixit user flow', () => {
  test('user creates fixit and sees it in dashboard');
  test('GitHub issue closes and fixit auto-resolves');
  test('leaderboard updates after resolution');
});
```

---

## Monitoring & Observability

### Metrics to Track

- Fixits created per day
- Fixits resolved per day
- Average time to resolution
- Points distributed per user
- GitHub events received
- WebSocket connection count
- API error rates

### Logging

```typescript
// Log all fixit events to Cloudflare Logs
console.log(JSON.stringify({
  event: 'fixit_created',
  roomId: room.id,
  fixitId: fixit.id,
  creator: fixit.creator,
  timestamp: Date.now()
}));
```

### Alerts

- Alert if GitHub webhook endpoint returns 5xx errors
- Alert if Durable Object throws unhandled exceptions
- Alert if WebSocket disconnection rate exceeds 10%

---

## Cost Estimation (Cloudflare)

### Durable Objects

- **Storage**: ~$0.20/GB/month (mostly negligible for text data)
- **Requests**: $0.15/million requests (generous free tier)

### Workers

- **Requests**: Free tier covers 100k requests/day
- **CPU time**: Free tier covers most usage

### D1 (if using Option B)

- **Storage**: $0.75/GB/month (first 5 GB free)
- **Reads**: $0.001/million reads (first 25 million free)
- **Writes**: $1.00/million writes (first 100,000 free)

**Estimated monthly cost for small team (50 users, 1000 fixits/month):**
- Option A (SQLite-only): ~$5-10/month
- Option B (SQLite + D1): ~$10-20/month

---

## Open Questions

1. **Should fixits be room-scoped or global?**
   - **Recommendation**: Room-scoped (follows existing patterns), but allow linking multiple rooms to one GitHub repo

2. **Should we track individual user GitHub accounts or room-level GitHub integration?**
   - **Recommendation**: Room-level integration (simpler), with optional individual linking for attribution

3. **Should leaderboards be per-room or global across all rooms?**
   - **Recommendation**: Per-room for Phase 1, add global leaderboards in Phase 4 if demand exists

4. **Should we support other Git providers (GitLab, Bitbucket)?**
   - **Recommendation**: GitHub only for Phase 1, design extensible interface for future providers

5. **Should we allow non-GitHub fixits (manually tracked)?**
   - **Recommendation**: Yes - fixits can exist without GitHub links (useful for internal tech debt)

---

## Success Metrics

After 3 months of launch:

- **Adoption**: 50% of active SprintJam rooms enable fixits
- **Engagement**: Average 10 fixits resolved per room per week
- **Velocity**: Average time-to-resolution under 48 hours
- **Satisfaction**: NPS score of 40+ from surveyed users

---

## Alternatives Considered

### Alternative 1: Use existing ticket queue for fixits
**Rejected**: Tickets are sprint-scoped and ephemeral, fixits are ongoing and persistent.

### Alternative 2: Build standalone fixit app (separate from SprintJam)
**Rejected**: Better to integrate with existing planning workflow, share authentication, and leverage existing infrastructure.

### Alternative 3: Use third-party gamification service (Karma, HeyTaco, etc.)
**Rejected**: We want native integration with GitHub and SprintJam's planning data.

---

## Future Enhancements (Post-Launch)

- **Slack integration**: Post daily leaderboard to Slack
- **Jira/Linear sync**: Create fixits from Jira/Linear issues (reuse existing OAuth)
- **AI suggestions**: Use AI to suggest high-impact fixits based on code analysis
- **Fixit sprints**: Run dedicated "fixit week" sprints with boosted points
- **Team challenges**: Compete with other teams for most fixits resolved
- **Burndown charts**: Visualize fixit queue reduction over time
- **Custom point values**: Allow moderators to override point values per fixit

---

## Conclusion

The Fixits feature will bring gamification and motivation to SprintJam, encouraging teams to tackle small improvements proactively. By leveraging Cloudflare's Durable Objects and following SprintJam's existing architectural patterns, we can build a robust, real-time, and scalable system.

**Recommended Next Steps:**
1. Review and approve this proposal
2. Prioritize Phase 1 implementation
3. Create detailed tickets for each component
4. Set up GitHub OAuth app and webhook URL
5. Begin development with Fixit Durable Object and repository

---

## Appendix: File Changes Summary

### New Files

```
api/services/fixit-room.ts                  # Durable Object class
api/services/fixit-room-http.ts             # HTTP endpoints
api/repositories/fixit-room.ts              # Repository pattern
api/controllers/github-webhook-controller.ts # GitHub integration
api/types.ts                                # Type additions
api/lib/github-signature-verification.ts    # Security

src/components/fixits/                      # New component directory
src/context/FixitContext.tsx                # Optional context
src/types.ts                                # Type additions
```

### Modified Files

```
api/index.ts                                # Add routes
wrangler.jsonc                              # Add Durable Object binding
src/App.tsx                                 # Add routes (if standalone)
src/routes/RoomScreen.tsx                   # Add Fixits tab
src/context/RoomContext.tsx                 # Add fixit handlers
src/lib/api-service.ts                      # Add WebSocket handlers
```

---

**Document Version**: 1.0
**Last Updated**: 2025-11-25
**Author**: Claude (AI Assistant)
**Status**: Draft for Review
