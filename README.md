# SprintJam - Fast, real-time planning poker for distributed teams

SprintJam makes it easy to estimate stories in minutes with live voting, smart consensus insights, and a distraction-free room that keeps everyone focused. No sign-ups required, just share a link to start.

[![Website](https://img.shields.io/badge/sprintjam.co.uk-blue?style=for-the-badge)](https://sprintjam.co.uk)
[![License](https://img.shields.io/badge/License-Apache%202.0-green?style=for-the-badge)](LICENSE)

> **Note**: This is somewhat of a passion project built in my spare time. While I strive to maintain and improve it, please be aware that it is provided "as is". A large amount of development has also been contributed with AI assistance. All contributions and feedback are welcome!

## Features

### Live Estimations

- Classic planning poker with Fibonacci, short Fibonacci, doubling, T-shirt sizes, hours, yes/no, simple, planet, or custom scales
- Structured voting with weighted scoring across complexity, confidence, volume, and unknowns
- Extra vote cards such as unknown, coffee break, and cannot complete

### Automated Consensus Insights

- The Judge analyses vote spread, suggests a consensus score, and flags when discussion is still needed
- Moderator controls for hidden voting, auto-reveal, locked votes, spectator mode, and passcode-protected rooms
- Shared timers, contextual room guidance, summary cards, and vote distribution views

### Third party integrations

- Jira, Linear, and GitHub integrations with workspace-managed team connections and room-level flows
- Import tickets, browse boards, sprints, cycles, repos, and milestones, then estimate without leaving SprintJam
- Sync estimates back to the source system and save rooms against workspace teams for later

### Managed Workspaces and Teams

- Magic-link sign-in for approved workspace domains
- MFA with TOTP or passkeys, plus recovery codes
- Team defaults, shared integrations, saved sessions, and workspace-level planning insights

### Real-Time Collaboration Tools

- WebSocket-powered rooms with live presence, moderator controls, and shareable links or QR codes
- A built-in spin-the-wheel tool for quick decisions during planning sessions
- Quick break games including Guess the Number, Word Chain, Emoji Story, One-Word Pitch, Category Blitz, Clueboard, Sprint Word, Team Threads, and Sprint Risk

### Privacy-First Design

- No ads or tracking
- Self-hostable on Cloudflare
- Open source and transparent

## Quick Start

### Using the Hosted Version

Simply visit [sprintjam.co.uk](https://sprintjam.co.uk) and start creating rooms immediately!

### Self-Hosting on Cloudflare

1. **Clone the repository**

   ```bash
   git clone https://github.com/nicholasgriffintn/sprintjam.co.uk.git
   cd sprintjam.co.uk
   ```

   You should end up with a pnpm monorepo that contains the following apps:
   - `apps/app` - dispatch worker and static assets
   - `apps/room-worker` - planning poker APIs, WebSockets, and the `PlanningRoom` Durable Object
   - `apps/auth-worker` - workspace auth, teams, and team-level integrations backed by D1
   - `apps/stats-worker` - stats ingest and query APIs backed by D1
   - `apps/wheel-worker` - spin-the-wheel APIs and the `WheelRoom` Durable Object

2. **Install dependencies**

   ```bash
   corepack enable
   pnpm install
   ```

3. **Create local worker env files**

   `pnpm run dev` starts the app and boots the other workers through the Cloudflare Vite plugin. Secrets now live per worker, not in a single root `.dev.vars` file.

   ```env
   # apps/room-worker/.dev.vars

   TOKEN_ENCRYPTION_SECRET=replace-me

   # Optional:
   # STATS_INGEST_TOKEN=replace-me
   # INTERNAL_API_SECRET=replace-me
   # FEEDBACK_GITHUB_TOKEN=replace-me
   # POLYCHAT_API_TOKEN=replace-me
   # JIRA_OAUTH_CLIENT_ID=your-jira-client-id
   # JIRA_OAUTH_CLIENT_SECRET=your-jira-client-secret
   # JIRA_OAUTH_REDIRECT_URI=https://your-domain.com/api/jira/oauth/callback
   # LINEAR_OAUTH_CLIENT_ID=your-linear-client-id
   # LINEAR_OAUTH_CLIENT_SECRET=your-linear-client-secret
   # LINEAR_OAUTH_REDIRECT_URI=https://your-domain.com/api/linear/oauth/callback
   # GITHUB_OAUTH_CLIENT_ID=your-github-client-id
   # GITHUB_OAUTH_CLIENT_SECRET=your-github-client-secret
   # GITHUB_OAUTH_REDIRECT_URI=https://your-domain.com/api/github/oauth/callback
   ```

   ```env
   # apps/auth-worker/.dev.vars

   TOKEN_ENCRYPTION_SECRET=replace-me
   RESEND_API_KEY=replace-me

   # Optional:
   # INTERNAL_API_SECRET=replace-me
   # JIRA_OAUTH_CLIENT_ID=your-jira-client-id
   # JIRA_OAUTH_CLIENT_SECRET=your-jira-client-secret
   # JIRA_OAUTH_REDIRECT_URI=https://your-domain.com/api/teams/integrations/jira/callback
   # LINEAR_OAUTH_CLIENT_ID=your-linear-client-id
   # LINEAR_OAUTH_CLIENT_SECRET=your-linear-client-secret
   # LINEAR_OAUTH_REDIRECT_URI=https://your-domain.com/api/teams/integrations/linear/callback
   # GITHUB_OAUTH_CLIENT_ID=your-github-client-id
   # GITHUB_OAUTH_CLIENT_SECRET=your-github-client-secret
   # GITHUB_OAUTH_REDIRECT_URI=https://your-domain.com/api/teams/integrations/github/callback
   ```

   ```env
   # apps/stats-worker/.dev.vars

   STATS_INGEST_TOKEN=replace-me
   ```

   ```env
   # apps/wheel-worker/.dev.vars

   TOKEN_ENCRYPTION_SECRET=replace-me
   ```

   Notes:
   - Set the same `INTERNAL_API_SECRET` in `apps/room-worker/.dev.vars` and `apps/auth-worker/.dev.vars` if you want room sessions to use team-level provider credentials.
   - Set the same `STATS_INGEST_TOKEN` in `apps/room-worker/.dev.vars` and `apps/stats-worker/.dev.vars` if you want round stats to be persisted locally.
   - Add OAuth credentials to both `apps/room-worker/.dev.vars` and `apps/auth-worker/.dev.vars` if you want both room-level and team-level integrations.

4. **Apply the local database migrations**

   ```bash
   pnpm run db:migrate:local
   ```

   This writes local D1 state to `.data`, which is also where local Durable Object state is persisted.

5. **Start local development**

   ```bash
   pnpm run dev
   ```

   Then open `http://127.0.0.1:5173`.

6. **Prepare your Cloudflare account before the first deploy**

   The checked-in `wrangler.jsonc` files still need your own account-level resources:
   - update the routes in `apps/app/wrangler.jsonc`
   - create a D1 database for auth and stats, then replace the bound `database_name` and `database_id` values in `apps/auth-worker/wrangler.jsonc` and `apps/stats-worker/wrangler.jsonc`
   - keep the service binding names aligned across workers if you rename any Worker
   - add the same secrets in Cloudflare that you used locally

7. **Deploy to Cloudflare**

   Authenticate Wrangler first with `wrangler login` or by exporting `CLOUDFLARE_API_TOKEN`.

   ```bash
   pnpm run db:migrate:prod
   pnpm run deploy
   ```

   For staging, use `pnpm run db:migrate:staging` and `pnpm run deploy:staging`.

## Development

### Local Development

```bash
# Start the app and auxiliary workers
pnpm run dev

# Type-check the monorepo
pnpm run typecheck

# Build all packages
pnpm run build

# Run unit tests
pnpm run test

# Run E2E tests
cd apps/app
pnpm exec playwright install --with-deps
pnpm test:e2e
```

#### Local HTTPS with a Local Domain

For local HTTPS, SprintJam uses `apps/app/.certs/local.pem` and `apps/app/.certs/local-key.pem`. Create both files together from the same command so they always match.

```bash
cd apps/app
mkdir -p .certs
mkcert -cert-file .certs/local.pem -key-file .certs/local-key.pem sprintjam.localhost
pnpm run dev -- --host sprintjam.localhost
```

If those certificate files exist, Vite automatically serves HTTPS. Then open `https://sprintjam.localhost:5173`.

## Contributing

Contributions are welcome! This project was built quickly and there are definitely areas for improvement.

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request
