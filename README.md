# 🎯 SprintJam

**Collaborative Planning Poker for Agile Teams - Without the Ads**

SprintJam is a modern, privacy-focused planning poker application designed for agile teams who want to run effective story pointing sessions without dealing with ads, trackers, or subscription fees.

[![Website](https://img.shields.io/badge/sprintjam.co.uk-blue?style=for-the-badge)](https://sprintjam.co.uk)
[![License](https://img.shields.io/badge/License-Apache%202.0-green?style=for-the-badge)](LICENSE)

> **Note**: This is somewhat of a passion project built in my spare time. While I strive to maintain and improve it, please be aware that it is provided "as is". A large amount of development has also been contributed with AI assistance. All contributions and feedback are welcome!

## ✨ Features

### 🎲 **Flexible Voting Systems**

- **Classic Planning Poker**: Traditional Fibonacci sequence (1, 2, 3, 5, 8, 13, 21, ?)
- **Structured Voting**: Multi-criteria estimation with weighted scoring across:
  - Complexity (35% weight)
  - Confidence (25% weight)
  - Volume (25% weight)
  - Unknowns (15% weight)

### 🤖 **Smart Resolution Algorithms (The Judge)**

- **Smart Consensus**: Intelligent analysis of voting patterns
- **Automatic Scoring**: Final story point recommendations
- **Consensus Detection**: Identifies when team alignment is reached

### 🔗 **External Provider Integrations**

- OAuth 2.0 per-room connections to Jira or Linear
- Fetch ticket details and keep estimates in sync
- Provider-specific fields (Jira story points/sprint; Linear estimate field)
- Automatic token refresh per moderator

### 🎛️ **Customizable Experience**

- **Room Settings**: Configure voting options, display preferences, and permissions
- **Anonymous Voting**: Optional anonymous mode for unbiased estimation
- **Timer Support**: Optional session timing
- **Results Display**: Customizable summary cards and vote distribution charts

### 🚀 **Real-time Collaboration**

- WebSocket-powered live updates
- Multi-user rooms with moderator controls
- Participant presence indicators
- Share rooms via QR codes or links

### 🔒 **Privacy-First Design**

- No ads or tracking
- Optional room passcodes
- Self-hostable on Cloudflare
- Open source and transparent

## 🛠️ Technology Stack

- **Frontend**: React, TypeScript, Tailwind CSS, Framer Motion, Vite, TanStack
- **Backend**: Cloudflare Workers, Durable Objects

## 🚀 Quick Start

### Using the Hosted Version

Simply visit [sprintjam.co.uk](https://sprintjam.co.uk) and start creating rooms immediately!

### Self-Hosting on Cloudflare

1. **Clone the repository**

   ```bash
   git clone https://github.com/nicholasgriffintn/sprintjam.co.uk.git
   cd sprintjam.co.uk
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   Create a `.dev.vars` file or configure in Cloudflare dashboard:

   ```env
   # Optional: Jira OAuth
   JIRA_OAUTH_CLIENT_ID=your-jira-client-id
   JIRA_OAUTH_CLIENT_SECRET=your-jira-client-secret
   JIRA_OAUTH_REDIRECT_URI=https://your-domain.com/api/jira/oauth/callback

   # Optional: Linear OAuth
   LINEAR_OAUTH_CLIENT_ID=your-linear-client-id
   LINEAR_OAUTH_CLIENT_SECRET=your-linear-client-secret
   LINEAR_OAUTH_REDIRECT_URI=https://your-domain.com/api/linear/oauth/callback

   # Optional: Slack OAuth
   SLACK_OAUTH_CLIENT_ID=your-slack-client-id
   SLACK_OAUTH_CLIENT_SECRET=your-slack-client-secret
   SLACK_OAUTH_REDIRECT_URI=https://your-domain.com/api/slack/oauth/callback
   ```

   **To enable an external provider:**

   a. Create an OAuth 2.0 app with the provider (Atlassian Developer Console for Jira; Linear Developer Settings for Linear; Slack API Apps for Slack) and set the redirect URI to match the value above.
   b. Add required scopes:
      - Jira: `read:jira-work`, `write:jira-work`, `read:jira-user`, `offline_access`
      - Slack: `chat:write`, `chat:write.public`, `channels:read`, `groups:read`, `identify` (user scope)
   c. Copy the client ID/secret into the corresponding env vars.
   d. In a room, open Settings → Other Options → External Provider and connect Jira, Linear, or Slack.

4. **Deploy to Cloudflare**
   ```bash
   pnpm run deploy
   ```

## 🔧 Development

### Local Development

```bash
# Start development server
pnpm run dev

# Build for production
pnpm run build

# Preview production build
pnpm run preview

# Run E2E tests
pnpm exec playwright install --with-deps
pnpm test:e2e
```

## 🤝 Contributing

Contributions are welcome! This project was built quickly and there are definitely areas for improvement.

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request
