# 🎯 SprintJam

**Collaborative Planning Poker for Agile Teams - Without the Ads**

SprintJam is a modern, privacy-focused planning poker application designed for agile teams who want to run effective story pointing sessions without dealing with ads, trackers, or subscription fees.

[![Website](https://img.shields.io/badge/sprintjam.co.uk-blue?style=for-the-badge)](https://sprintjam.co.uk)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

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

### 🔗 **Jira Integration (In Development)**

- Fetch ticket details directly from Jira
- Auto-update story points after estimation
- Support for custom story point fields

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
   # Optional: Jira Integration
   JIRA_DOMAIN=your-domain.atlassian.net
   JIRA_EMAIL=your-email@company.com
   JIRA_API_TOKEN=your-api-token
   JIRA_STORY_POINTS_FIELD=customfield_10016
   ```

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

## 🧭 TODO / Future Enhancements

- [ ] Add workspace support for teams to manage multiple rooms.
- [ ] Enrich room metadata (team, persona, sprint) so vote distribution filters can operate on meaningful cohorts in both live and historical modes.
- [ ] Figure out how to fully implement Jira integration (OAuth flow?).
- [ ] Persist past sessions so facilitators can compare rounds (Durable Object snapshots keyed by room + timestamp, lightweight metadata for participants and consensus).
- [ ] Add a history drawer in `UnifiedResults` to surface trend lines once snapshots exist (avg delta, consensus trend, automatic regression callouts).
- [ ] Improve accessibility (ARIA roles, keyboard navigation, screen reader support).
- [ ] Make the background music as awesome as possible (this is something to do on Polychat).

## 📝 License

MIT License - see [LICENSE](LICENSE) for details.
