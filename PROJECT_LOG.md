# SprintJam Project Log

## Project Overview

**SprintJam** is a collaborative planning poker application for agile teams, built with React, TypeScript, and Cloudflare Workers/Durable Objects. It provides flexible voting systems (Classic Planning Poker and Structured Voting), real-time collaboration via WebSockets, and integrations with external providers (Jira, Linear, GitHub).

**Repository**: https://github.com/nicholasgriffintn/sprintjam.co.uk
**Production**: https://sprintjam.co.uk
**Main Branch**: `main`

---

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS, Vite, TanStack Query, Framer Motion
- **Backend**: Cloudflare Workers, Durable Objects, Drizzle ORM
- **Testing**: Vitest, Playwright (with accessibility testing via axe-core)
- **Deployment**: Cloudflare Workers (via Wrangler)

---

## Current State

### Active Branch

**`remove-auto-ticketting-flow`** - Work in progress to remove automatic ticketing flow functionality.

### Modified Files (as of 2025-12-18)

- `api/durable-objects/planning-room/index.ts`
- `api/durable-objects/planning-room/room-helpers.ts`
- `api/durable-objects/planning-room/session.ts`
- `api/durable-objects/planning-room/tickets.ts`
- `api/types.ts`
- `api/utils/validate.test.ts`
- `api/utils/validate.ts`
- `src/components/layout/RoomSidebar/TicketQueueSidebar.tsx`
- `src/components/layout/RoomSidebar/index.tsx`
- `src/components/modals/TicketQueueModal/index.tsx`
- `src/components/modals/TicketQueueModal/tabs/Queue.tsx`
- `src/components/results/ResultsControls.tsx`
- `src/components/voting/StructuredVotingPanel.tsx`
- `src/components/voting/UserEstimate.tsx`
- `src/context/RoomContext.tsx`
- `src/lib/api-service.ts`
- `src/routes/RoomScreen.tsx`
- `tests/e2e/room-ticket-queue.spec.ts`

### Recent Commits

- `2573c92` - feat: expand the reveal configurations (#37)
- `b88671a` - feat: adding new voting options (#38)
- `6c6a24a` - fix: remove env var for prod
- `3b5efe6` - chore: add robots.txt file for staging
- `4b468fa` - fix: remove environment

---

## Key Features

### Voting Systems

1. **Classic Planning Poker**: Fibonacci sequence (1, 2, 3, 5, 8, 13, 21, ?)
2. **Structured Voting**: Multi-criteria estimation with weighted scoring:
   - Complexity (35%)
   - Confidence (25%)
   - Volume (25%)
   - Unknowns (15%)

### Smart Resolution ("The Judge")

- Smart consensus algorithm
- Automatic scoring
- Consensus detection

### External Provider Integrations

- OAuth 2.0 per-room connections
- Supports Jira, Linear, GitHub
- Automatic token refresh
- Provider-specific field mapping

### Real-time Collaboration

- WebSocket-powered live updates
- Multi-user rooms with moderator controls
- Participant presence indicators
- QR code and link sharing

---

## Architecture Notes

### Backend (Cloudflare Workers)

- **Durable Objects**: `planning-room` handles room state, sessions, tickets, and WebSocket connections
- **API Routes**: Handle OAuth callbacks, room creation, and provider integrations
- **Validation**: Centralized validation utilities in `api/utils/validate.ts`

### Frontend (React)

- **State Management**: TanStack Query for server state, React Context for room state
- **Component Structure**:
  - `src/routes/` - Top-level route components
  - `src/components/` - Reusable UI components organized by domain
  - `src/context/` - React context providers
  - `src/lib/` - API service and utilities

### Testing Strategy

- **Unit Tests**: Vitest for utilities and validation logic
- **E2E Tests**: Playwright for critical user flows (room creation, voting, ticket queue)
- **Accessibility**: Automated a11y testing via @axe-core/playwright

---

## Development Commands

```bash
# Development
pnpm run dev              # Start dev server
pnpm run typecheck        # Type checking
pnpm run lint             # Linting
pnpm run format           # Format code

# Testing
pnpm run test             # Run unit tests
pnpm run test:watch       # Unit tests in watch mode
pnpm run test:coverage    # Coverage report
pnpm run test:e2e         # E2E tests
pnpm run test:e2e:all     # E2E tests with accessibility
pnpm run test:e2e:a11y    # Only accessibility tests

# Build & Deploy
pnpm run build            # Production build
pnpm run build:staging    # Staging build
pnpm run deploy           # Deploy to production
pnpm run deploy:staging   # Deploy to staging
```

---

## Environment Variables

### Required

- `TOKEN_ENCRYPTION_SECRET` - Encrypts/decrypts OAuth tokens

### Optional (Provider Integrations)

- Jira: `JIRA_OAUTH_CLIENT_ID`, `JIRA_OAUTH_CLIENT_SECRET`, `JIRA_OAUTH_REDIRECT_URI`
- Linear: `LINEAR_OAUTH_CLIENT_ID`, `LINEAR_OAUTH_CLIENT_SECRET`, `LINEAR_OAUTH_REDIRECT_URI`
- GitHub: `GITHUB_OAUTH_CLIENT_ID`, `GITHUB_OAUTH_CLIENT_SECRET`, `GITHUB_OAUTH_REDIRECT_URI`

---

## Known Issues / Technical Debt

- None documented yet (to be updated as discovered)

---

## Change Log

### 2025-12-18

- **Initial PROJECT_LOG.md created**
- Work in progress on `remove-auto-ticketting-flow` branch affecting planning room, ticket queue, and voting components
- Added GitHub-backed feedback submission form that files labeled issues via new `/api/feedback` endpoint (configure `FEEDBACK_GITHUB_TOKEN` and optional owner/repo/default labels)
