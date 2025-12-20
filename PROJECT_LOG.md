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

### 2025-12-19
- Added Playwright coverage for welcome flow, error scenarios (offline voting, reconnect, expired sessions), timer workflows, anonymous voting, feedback form validation, ticket summary modal, and persistence/rejoin journeys.
- Introduced mobile-focused Playwright project and tests for touch interactions and responsive sidebar/queue behavior.
- Expanded data persistence checks (localStorage tokens, reload behavior) and timer control helpers to support new e2e scenarios.

### 2025-12-18

Refer to [CHANGELOG.md](src/content/changelog.md) for detailed change history (update as new major features are added).
