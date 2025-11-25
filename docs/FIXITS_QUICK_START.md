# Fixits Quick Start Guide

This guide will help you get started implementing the Fixits feature for SprintJam.

## Overview

**Fixits** is a gamified system for tracking and rewarding quick bug fixes and small improvements. It integrates with GitHub to automatically create and resolve fixits based on issue labels.

**Time Estimate**: 5 weeks for full implementation
**Complexity**: Medium (follows existing patterns in the codebase)

---

## Prerequisites

Before starting, ensure you have:

- [x] Familiarity with the SprintJam codebase
- [x] Understanding of Durable Objects and SQLite
- [x] Experience with React and TypeScript
- [x] GitHub account for OAuth setup

---

## Step 0: Review Architecture

Read these documents first:

1. **FIXITS_PROPOSAL.md** - Full feature specification
2. **FIXITS_ARCHITECTURE.md** - System architecture and diagrams
3. **FIXITS_IMPLEMENTATION_CHECKLIST.md** - Detailed task breakdown

**Key architectural decisions:**
- **Durable Object per room** (similar to PlanningRoom)
- **SQLite storage** (no external D1 database for Phase 1)
- **WebSocket real-time updates** (follows existing pattern)
- **GitHub OAuth + Webhooks** (new integration)

---

## Step 1: Set Up GitHub OAuth App

### 1.1 Create GitHub OAuth App

1. Go to https://github.com/settings/developers
2. Click "New OAuth App"
3. Fill in:
   - **Application name**: SprintJam Fixits (Dev)
   - **Homepage URL**: `http://localhost:5173` (dev) or `https://sprintjam.co.uk` (prod)
   - **Authorization callback URL**: `http://localhost:8787/api/github/oauth/callback` (dev)
4. Click "Register application"
5. Note the **Client ID**
6. Generate a **Client Secret**

### 1.2 Add Environment Variables

Create `.dev.vars` in the `api/` directory:

```bash
# api/.dev.vars
GITHUB_CLIENT_ID=your_client_id_here
GITHUB_CLIENT_SECRET=your_client_secret_here
GITHUB_WEBHOOK_SECRET=generate_random_secret_here
```

Generate webhook secret:
```bash
openssl rand -hex 32
```

### 1.3 Update Wrangler Config

```jsonc
// wrangler.jsonc
{
  "vars": {
    "GITHUB_CLIENT_ID": "your_client_id_here"
  },
  "durable_objects": {
    "bindings": [
      {
        "name": "PLANNING_ROOM",
        "class_name": "PlanningRoom",
        "script_name": "sprintjam-api"
      },
      {
        "name": "FIXIT_ROOM",  // ADD THIS
        "class_name": "FixitRoom",
        "script_name": "sprintjam-api"
      }
    ]
  }
}
```

---

## Step 2: Create Fixit Durable Object (Backend)

### 2.1 Create Repository

```bash
touch api/repositories/fixit-room.ts
```

Start with the schema:

```typescript
// api/repositories/fixit-room.ts
export class FixitRepository {
  constructor(private sql: SqlStorage) {}

  async initializeSchema(): Promise<void> {
    // Create tables (see FIXITS_PROPOSAL.md for full schema)
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS fixits (
        id TEXT PRIMARY KEY,
        room_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'open',
        priority TEXT DEFAULT 'medium',
        points INTEGER DEFAULT 1,
        creator TEXT NOT NULL,
        resolver TEXT,
        created_at INTEGER NOT NULL,
        resolved_at INTEGER
      )
    `);

    // Add other tables: fixit_comments, fixit_events, leaderboard
  }

  // Add CRUD methods
}
```

### 2.2 Create Durable Object Class

```bash
touch api/services/fixit-room.ts
```

Follow the pattern from `planning-room.ts`:

```typescript
// api/services/fixit-room.ts
import { DurableObject } from 'cloudflare:workers';

export class FixitRoom implements DurableObject {
  private sql: SqlStorage;
  private sessions: Map<WebSocket, SessionInfo> = new Map();
  private repository: FixitRepository;

  constructor(state: DurableObjectState, env: Env) {
    this.sql = state.storage.sql;
    this.repository = new FixitRepository(this.sql);
  }

  async fetch(request: Request): Promise<Response> {
    // Handle WebSocket upgrade
    if (request.headers.get('Upgrade') === 'websocket') {
      return this.handleWebSocket(request);
    }

    // Handle HTTP requests
    return this.handleHttp(request);
  }

  private async handleWebSocket(request: Request): Promise<Response> {
    // Similar to planning-room.ts
  }

  private async handleHttp(request: Request): Promise<Response> {
    // Route to HTTP endpoints (see fixit-room-http.ts)
  }
}
```

### 2.3 Create HTTP Endpoints

```bash
touch api/services/fixit-room-http.ts
```

Implement endpoints:
- `POST /initialize`
- `GET /fixits`
- `POST /fixits`
- `PUT /fixits/:id`
- etc.

### 2.4 Add Types

```typescript
// api/types.ts
export interface Fixit {
  id: string;
  roomId: string;
  title: string;
  description?: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  points: number;
  creator: string;
  resolver?: string;
  createdAt: number;
  resolvedAt?: number;
}

export interface CreateFixitInput {
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  points?: number;
  creator: string;
}

// Add WebSocket message types
export type FixitClientMessage =
  | { type: 'createFixit'; payload: CreateFixitInput }
  | { type: 'resolveFixit'; payload: { id: string } };

export type FixitServerMessage =
  | { type: 'fixitCreated'; payload: Fixit }
  | { type: 'fixitResolved'; payload: Fixit };
```

### 2.5 Export from Index

```typescript
// api/index.ts
export { FixitRoom } from './services/fixit-room';

// Add routes if needed
```

---

## Step 3: Create Frontend Components

### 3.1 Create Component Directory

```bash
mkdir -p src/components/fixits
```

### 3.2 Create FixitCard Component

```bash
touch src/components/fixits/FixitCard.tsx
```

```tsx
// src/components/fixits/FixitCard.tsx
import { Fixit } from '@/types';

interface FixitCardProps {
  fixit: Fixit;
  onResolve?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function FixitCard({ fixit, onResolve, onDelete }: FixitCardProps) {
  return (
    <div className="fixit-card">
      <h3>{fixit.title}</h3>
      <p>{fixit.description}</p>
      <div className="fixit-meta">
        <span>Status: {fixit.status}</span>
        <span>Priority: {fixit.priority}</span>
        <span>Points: {fixit.points}</span>
      </div>
      {fixit.status === 'open' && (
        <button onClick={() => onResolve?.(fixit.id)}>
          Resolve
        </button>
      )}
    </div>
  );
}
```

### 3.3 Create FixitDashboard Component

```bash
touch src/components/fixits/FixitDashboard.tsx
```

```tsx
// src/components/fixits/FixitDashboard.tsx
import { useRoom } from '@/context/RoomContext';
import { FixitCard } from './FixitCard';

export function FixitDashboard() {
  const { fixits, resolveFixit } = useRoom();

  return (
    <div className="fixit-dashboard">
      <h2>Fixits</h2>
      <div className="fixit-list">
        {fixits.map(fixit => (
          <FixitCard
            key={fixit.id}
            fixit={fixit}
            onResolve={resolveFixit}
          />
        ))}
      </div>
    </div>
  );
}
```

### 3.4 Update RoomContext

```typescript
// src/context/RoomContext.tsx
interface RoomContextValue {
  // ... existing properties
  fixits: Fixit[];
  createFixit: (input: CreateFixitInput) => Promise<void>;
  resolveFixit: (id: string) => Promise<void>;
}

export function RoomProvider({ children }: { children: React.ReactNode }) {
  const [fixits, setFixits] = useState<Fixit[]>([]);

  // Add WebSocket handlers
  useEffect(() => {
    apiService.on('fixitCreated', (fixit: Fixit) => {
      setFixits(prev => [...prev, fixit]);
    });

    apiService.on('fixitResolved', (fixit: Fixit) => {
      setFixits(prev =>
        prev.map(f => f.id === fixit.id ? fixit : f)
      );
    });
  }, []);

  const createFixit = async (input: CreateFixitInput) => {
    apiService.sendCreateFixit(input);
  };

  const resolveFixit = async (id: string) => {
    apiService.sendResolveFixit(id);
  };

  return (
    <RoomContext.Provider value={{ fixits, createFixit, resolveFixit }}>
      {children}
    </RoomContext.Provider>
  );
}
```

### 3.5 Integrate with RoomScreen

```tsx
// src/routes/RoomScreen.tsx
import { FixitDashboard } from '@/components/fixits/FixitDashboard';

export function RoomScreen() {
  return (
    <div>
      {/* Existing code */}
      <Tabs>
        <Tab label="Planning">
          {/* Existing voting UI */}
        </Tab>
        <Tab label="Tickets">
          {/* Existing ticket queue */}
        </Tab>
        <Tab label="Fixits">  {/* NEW */}
          <FixitDashboard />
        </Tab>
      </Tabs>
    </div>
  );
}
```

---

## Step 4: Test Locally

### 4.1 Start Backend

```bash
cd api
npm run dev
# or
pnpm dev
```

Backend should be running at `http://localhost:8787`

### 4.2 Start Frontend

```bash
cd ..
npm run dev
# or
pnpm dev
```

Frontend should be running at `http://localhost:5173`

### 4.3 Manual Testing

1. **Create a room** in SprintJam
2. **Navigate to "Fixits" tab**
3. **Create a fixit** manually
4. **Open in another browser/incognito**
5. **Verify live update** when you resolve the fixit

---

## Step 5: Implement GitHub Integration (Phase 2)

Once Phase 1 is complete and tested, move to GitHub integration.

### 5.1 Create GitHub Controllers

```bash
touch api/controllers/github-oauth-controller.ts
touch api/controllers/github-webhook-controller.ts
touch api/lib/github-signature-verification.ts
```

### 5.2 Add OAuth Routes

```typescript
// api/index.ts
app.get('/api/github/oauth/authorize', async (c) => {
  // Redirect to GitHub OAuth
});

app.get('/api/github/oauth/callback', async (c) => {
  // Handle callback and store token
});
```

### 5.3 Add Webhook Route

```typescript
// api/index.ts
app.post('/api/github/webhook', async (c) => {
  // Verify signature
  // Parse event
  // Forward to Fixit DO
});
```

### 5.4 Test OAuth Flow

1. Click "Connect GitHub" in UI
2. Authorize app
3. Verify token stored in database

### 5.5 Test Webhook

Use GitHub's webhook test tool or:

```bash
curl -X POST http://localhost:8787/api/github/webhook \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: sha256=..." \
  -d '{"action":"opened","issue":{"number":1,"title":"Test"}}'
```

---

## Step 6: Deploy to Production

### 6.1 Deploy Backend

```bash
cd api
pnpm run deploy
```

### 6.2 Deploy Frontend

```bash
cd ..
pnpm run build
# Deploy to Cloudflare Pages
```

### 6.3 Update GitHub OAuth Callback URL

1. Go to GitHub OAuth app settings
2. Update callback URL to production: `https://api.sprintjam.co.uk/api/github/oauth/callback`

### 6.4 Configure Webhook

1. Go to your GitHub repository settings
2. Add webhook: `https://api.sprintjam.co.uk/api/github/webhook`
3. Select events: `issues`, `pull_request`, `issue_comment`
4. Add secret (from `GITHUB_WEBHOOK_SECRET`)

---

## Common Issues & Solutions

### Issue: "Durable Object not found"
**Solution**: Ensure `FIXIT_ROOM` binding is in `wrangler.jsonc` and you've restarted the dev server.

### Issue: "WebSocket connection failed"
**Solution**: Check that the WebSocket upgrade handler is implemented correctly. Compare with `planning-room.ts`.

### Issue: "GitHub webhook signature invalid"
**Solution**: Verify `GITHUB_WEBHOOK_SECRET` matches the secret in GitHub webhook settings.

### Issue: "OAuth callback fails"
**Solution**: Check that callback URL matches exactly (including protocol and trailing slashes).

---

## Development Tips

### Follow Existing Patterns

**DO**: Look at `planning-room.ts` for guidance
```typescript
// Good: Reuse session management pattern
const session = this.sessions.get(ws);
if (!session) {
  ws.send(JSON.stringify({ type: 'error', message: 'Invalid session' }));
  return;
}
```

**DON'T**: Reinvent the wheel
```typescript
// Bad: Custom authentication logic
if (customAuthCheck(ws)) { ... }
```

### Use Strong Types

```typescript
// Good: Type-safe WebSocket messages
type ClientMessage =
  | { type: 'createFixit'; payload: CreateFixitInput }
  | { type: 'resolveFixit'; payload: { id: string } };

function handleMessage(message: ClientMessage) {
  switch (message.type) {
    case 'createFixit':
      // TypeScript knows payload is CreateFixitInput
      break;
  }
}
```

### Test Incrementally

Don't try to implement everything at once. Test each component:

1. ✅ Create repository → Test SQLite queries
2. ✅ Create DO → Test HTTP endpoints
3. ✅ Add WebSocket → Test real-time updates
4. ✅ Create UI → Test rendering
5. ✅ Integrate → Test end-to-end

---

## Next Steps After Phase 1

Once you have the core system working:

1. **Phase 2**: Implement GitHub integration
2. **Phase 3**: Add gamification (points, badges, leaderboards)
3. **Phase 4**: Polish UI and add analytics

---

## Resources

- **SprintJam Codebase**: Study `api/services/planning-room.ts` as a reference
- **Cloudflare Docs**: https://developers.cloudflare.com/durable-objects/
- **GitHub API**: https://docs.github.com/en/rest
- **GitHub Webhooks**: https://docs.github.com/en/webhooks

---

## Getting Help

If you run into issues:

1. Check the proposal documents in `docs/`
2. Review the implementation checklist for detailed steps
3. Compare with existing patterns in the codebase
4. Ask questions in the SprintJam repository discussions

---

**Good luck with the implementation! 🚀**

*Estimated time to complete Phase 1 (core system): 2 weeks*
*Estimated time to complete all phases: 5 weeks*
