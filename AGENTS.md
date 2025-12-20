# Project Rules (Concise)

**READ THIS DOCUMENT IN FULL BEFORE DOING ANY WORK.**  
These rules apply to _all_ work, with no exceptions. They exist due to prior failures and are mandatory.

---

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

## Known Issues / Technical Debt

- None documented yet (to be updated as discovered)

---

## Session Start

- Never start work without full context.

---

## Task Intake

- Do **exactly** what is asked—nothing more, nothing less.
- Ask for clarification when requirements are unclear.
- Break multi-step work into todos.
- Maintain **one** in-progress task at a time.
- Each task must have a single, clear responsibility.

---

## Development

- Read files before editing them.
- Preserve existing, working code.
- Prefer editing existing files over creating new ones.
- Use the correct tools for reading, editing, writing, searching, and globbing.
- Batch tool calls where possible.
- Pin dependency versions and use stable releases.
- **No placeholders**—all code must be complete and functional.
- Use extended timeouts for installs, builds, Docker, and git operations.
- Test before claiming success.
- Never mark work complete without verification.
- Update todo status immediately and accurately.

---

## Safety

- Verify before any destructive operation.
- Ask before irreversible actions.
- Actively monitor file count and disk usage.
- Prevent file bloat with `.gitignore` and cleanup.
- Recycle and version files instead of creating new ones.
- Follow security best practices:
  - No secrets in repos
  - Use environment variables
  - Validate inputs
  - Secure APIs, data, and dependencies

---

## Quality Assurance

- Mandatory code review before completion.
- Tests are required for production code (scope depends on project type).
- Performance must be verified where relevant.
- Document benchmarks and regressions.

---

## Session End

- Use Git and GitHub for all projects.
- Commit often, clearly, and atomically.
- Push regularly.
- Follow defined branching strategies.
- At phase boundaries, run a **mandatory phase completion review** covering:
  - Background processes
  - Git status
  - Documentation
  - Code quality
  - Todos
  - Safety

---

## Operating Principles

- Be concise.
- Do not create unsolicited documentation.
- Safety overrides speed.
- When in doubt, stop and ask.
