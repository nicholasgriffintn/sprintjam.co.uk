# Fixits Implementation Checklist

## Phase 1: Core Fixit System (Week 1-2)

### Backend - Durable Object Foundation

- [ ] **Create Fixit Durable Object class** (`api/services/fixit-room.ts`)
  - [ ] Class structure and constructor
  - [ ] WebSocket upgrade handler
  - [ ] HTTP request router
  - [ ] Session management (reuse pattern from planning-room.ts)
  - [ ] Broadcast method for WebSocket messages

- [ ] **Create Fixit Repository** (`api/repositories/fixit-room.ts`)
  - [ ] Schema initialization methods
    - [ ] `fixits` table
    - [ ] `fixit_comments` table
    - [ ] `fixit_events` table
    - [ ] `leaderboard` table
  - [ ] Fixit CRUD methods
    - [ ] `createFixit()`
    - [ ] `getFixit()`
    - [ ] `listFixits()`
    - [ ] `updateFixit()`
    - [ ] `deleteFixit()`
  - [ ] Event logging
    - [ ] `logEvent()`
    - [ ] `getEvents()`
  - [ ] Leaderboard methods
    - [ ] `updateLeaderboard()`
    - [ ] `getLeaderboard()`
    - [ ] `getUserStats()`

- [ ] **Create HTTP Endpoints** (`api/services/fixit-room-http.ts`)
  - [ ] `POST /initialize` - Initialize room
  - [ ] `GET /fixits` - List fixits
  - [ ] `POST /fixits` - Create fixit
  - [ ] `PUT /fixits/:id` - Update fixit
  - [ ] `DELETE /fixits/:id` - Delete fixit
  - [ ] `POST /fixits/:id/resolve` - Resolve fixit
  - [ ] `POST /fixits/:id/comment` - Add comment
  - [ ] `GET /leaderboard` - Get leaderboard
  - [ ] `GET /stats/:userName` - Get user stats

- [ ] **Add Types** (`api/types.ts`)
  - [ ] `Fixit` interface
  - [ ] `CreateFixitInput` interface
  - [ ] `FixitComment` interface
  - [ ] `FixitEvent` interface
  - [ ] `LeaderboardEntry` interface
  - [ ] `Badge` interface
  - [ ] `UserStats` interface
  - [ ] WebSocket message types (client → server)
  - [ ] WebSocket message types (server → client)

- [ ] **Update Worker Router** (`api/index.ts`)
  - [ ] Add Durable Object binding check
  - [ ] Add routes (if needed for proxying)
  - [ ] Wire up authentication middleware

- [ ] **Update Wrangler Config** (`wrangler.jsonc`)
  - [ ] Add `FIXIT_ROOM` Durable Object binding
  - [ ] Add migration entry

### Frontend - Core Components

- [ ] **Add Types** (`src/types.ts`)
  - [ ] Mirror backend types
  - [ ] Add frontend-specific UI types

- [ ] **Create Base Components** (`src/components/fixits/`)
  - [ ] `FixitCard.tsx` - Display individual fixit
    - [ ] Title, description, status badge
    - [ ] Priority indicator
    - [ ] Creator and resolver info
    - [ ] Points display
    - [ ] Action buttons (resolve, delete, comment)
  - [ ] `FixitList.tsx` - List of fixit cards
    - [ ] Grid/list layout
    - [ ] Empty state
    - [ ] Loading state
  - [ ] `FixitForm.tsx` - Create/edit form
    - [ ] Title input (required)
    - [ ] Description textarea
    - [ ] Priority selector
    - [ ] Submit/cancel buttons
    - [ ] Validation
  - [ ] `FixitDetailModal.tsx` - Detailed view
    - [ ] Full fixit details
    - [ ] Comments section
    - [ ] Action buttons
    - [ ] Close button

- [ ] **Create Dashboard Component** (`src/components/fixits/FixitDashboard.tsx`)
  - [ ] Layout structure (filters, list, leaderboard)
  - [ ] Create fixit button
  - [ ] Integration with context

- [ ] **Update RoomContext** (`src/context/RoomContext.tsx`)
  - [ ] Add fixit state
    - [ ] `fixits: Fixit[]`
    - [ ] `leaderboard: LeaderboardEntry[]`
  - [ ] Add fixit methods
    - [ ] `createFixit()`
    - [ ] `updateFixit()`
    - [ ] `resolveFixit()`
    - [ ] `deleteFixit()`
    - [ ] `addFixitComment()`
  - [ ] Add WebSocket handlers
    - [ ] `fixitCreated`
    - [ ] `fixitUpdated`
    - [ ] `fixitResolved`
    - [ ] `fixitDeleted`
    - [ ] `commentAdded`
    - [ ] `leaderboardUpdated`

- [ ] **Update API Service** (`src/lib/api-service.ts`)
  - [ ] Add WebSocket message senders
    - [ ] `sendCreateFixit()`
    - [ ] `sendResolveFixit()`
    - [ ] `sendAddComment()`
  - [ ] Add WebSocket event listeners
    - [ ] Handle incoming fixit messages

- [ ] **Integrate with RoomScreen** (`src/routes/RoomScreen.tsx`)
  - [ ] Add "Fixits" tab to tabs component
  - [ ] Render `<FixitDashboard />` in tab

### Testing

- [ ] **Unit Tests**
  - [ ] Repository methods (SQLite CRUD)
  - [ ] Point calculation logic
  - [ ] Badge award logic

- [ ] **Integration Tests**
  - [ ] Durable Object message handling
  - [ ] WebSocket broadcasting
  - [ ] HTTP endpoints

- [ ] **Manual Testing**
  - [ ] Create fixit via UI
  - [ ] Resolve fixit and check points
  - [ ] Multiple users see live updates
  - [ ] Comments appear in real-time

---

## Phase 2: GitHub Integration (Week 3)

### Backend - GitHub OAuth

- [ ] **GitHub OAuth Controller** (`api/controllers/github-oauth-controller.ts`)
  - [ ] `GET /api/github/oauth/authorize` - Redirect to GitHub
  - [ ] `GET /api/github/oauth/callback` - Handle OAuth callback
  - [ ] Store token in `oauth_credentials` table (reuse existing table)
  - [ ] Return success/error to frontend

- [ ] **Add GitHub OAuth Routes** (`api/index.ts`)
  - [ ] Wire up GitHub OAuth controller

- [ ] **Add Environment Variables**
  - [ ] `GITHUB_CLIENT_ID`
  - [ ] `GITHUB_CLIENT_SECRET`
  - [ ] `GITHUB_WEBHOOK_SECRET`

### Backend - GitHub Webhooks

- [ ] **Signature Verification** (`api/lib/github-signature-verification.ts`)
  - [ ] Implement HMAC SHA-256 verification
  - [ ] Export `verifyGitHubSignature()` function

- [ ] **GitHub Webhook Controller** (`api/controllers/github-webhook-controller.ts`)
  - [ ] Verify webhook signature
  - [ ] Parse event payload
  - [ ] Route to appropriate handler
  - [ ] Handle `issues.opened` event
  - [ ] Handle `issues.closed` event
  - [ ] Handle `pull_request.merged` event
  - [ ] Handle `issue_comment.created` event
  - [ ] Return 200 OK for processed events

- [ ] **Add GitHub Webhook Route** (`api/index.ts`)
  - [ ] `POST /api/github/webhook`
  - [ ] Wire up controller

- [ ] **Update Fixit Durable Object** (`api/services/fixit-room.ts`)
  - [ ] Add `handleGitHubEvent()` method
  - [ ] Auto-create fixit from `issues.opened`
  - [ ] Auto-resolve fixit from `issues.closed`
  - [ ] Link PR to fixit from `pull_request.merged`
  - [ ] Add comment from `issue_comment.created`

- [ ] **Update Fixit Repository** (`api/repositories/fixit-room.ts`)
  - [ ] Add `getFixitByGitHubIssue()` method
  - [ ] Add `linkGitHubPR()` method

- [ ] **Add HTTP Endpoint** (`api/services/fixit-room-http.ts`)
  - [ ] `POST /github/event` - Forward GitHub events to DO

### Frontend - GitHub Integration

- [ ] **GitHub Connection Modal** (`src/components/fixits/GitHubConnectionModal.tsx`)
  - [ ] Explanation text
  - [ ] "Connect GitHub" button
  - [ ] Connected state (show connected repo)
  - [ ] Disconnect button

- [ ] **Update FixitForm** (`src/components/fixits/FixitForm.tsx`)
  - [ ] Add "Link GitHub Issue" field
  - [ ] Validate GitHub URL format

- [ ] **Update FixitCard** (`src/components/fixits/FixitCard.tsx`)
  - [ ] Display GitHub issue link badge
  - [ ] Display GitHub PR link badge (if resolved)

- [ ] **Update Header** (`src/components/Header/Header.tsx`)
  - [ ] Add "Connect GitHub" button (if moderator)

### GitHub Setup

- [ ] **Create GitHub OAuth App**
  - [ ] Register OAuth app at github.com/settings/developers
  - [ ] Set callback URL: `https://api.sprintjam.co.uk/api/github/oauth/callback`
  - [ ] Note client ID and secret

- [ ] **Configure Webhook**
  - [ ] Webhook URL: `https://api.sprintjam.co.uk/api/github/webhook`
  - [ ] Events: `issues`, `pull_request`, `issue_comment`
  - [ ] Content type: `application/json`
  - [ ] Generate and store secret

### Testing

- [ ] **OAuth Flow**
  - [ ] Click "Connect GitHub" in UI
  - [ ] Authorize app on GitHub
  - [ ] Verify token stored in database
  - [ ] Verify UI shows "Connected"

- [ ] **Webhook Events**
  - [ ] Create GitHub issue with label `fixit-small`
  - [ ] Verify fixit auto-created in SprintJam
  - [ ] Close GitHub issue
  - [ ] Verify fixit auto-resolved and points awarded
  - [ ] Merge PR linked to issue
  - [ ] Verify PR link appears in fixit

- [ ] **Error Cases**
  - [ ] Invalid signature → reject webhook
  - [ ] Duplicate event ID → ignore (idempotent)
  - [ ] Unknown event type → log and ignore

---

## Phase 3: Gamification (Week 4)

### Backend - Points & Badges

- [ ] **Update Points Calculation** (`api/services/fixit-room.ts`)
  - [ ] Base points (1, 2, 3 for small/medium/large)
  - [ ] Bonus: first fixit of the day (+1)
  - [ ] Bonus: resolve 5 in a week (+5)

- [ ] **Badge System** (`api/lib/badge-system.ts`)
  - [ ] Define badge metadata
  - [ ] `checkBadges(userName, stats)` function
  - [ ] Award logic for each badge type
    - [ ] "First Fix"
    - [ ] "On a Roll" (3 in 3 days)
    - [ ] "Unstoppable" (7 in 7 days)
    - [ ] "Bug Slayer" (10 resolved)
    - [ ] "Bug Crusher" (50 resolved)
    - [ ] "Bug Annihilator" (100 resolved)
    - [ ] "Team Player" (10 comments)
    - [ ] "Early Bird" (before 9 AM)
    - [ ] "Night Owl" (after 9 PM)

- [ ] **Update Repository** (`api/repositories/fixit-room.ts`)
  - [ ] Add `awardBadge()` method
  - [ ] Add `getUserBadges()` method

- [ ] **Update Leaderboard Logic** (`api/services/fixit-room.ts`)
  - [ ] Calculate streaks (current and longest)
  - [ ] Check badge thresholds on each resolve
  - [ ] Broadcast badge earned events

### Frontend - Gamification UI

- [ ] **Leaderboard Component** (`src/components/fixits/FixitLeaderboard.tsx`)
  - [ ] Display ranked list of users
  - [ ] Show points, badges, and stats
  - [ ] Highlight current user
  - [ ] Toggle views (daily/weekly/all-time)

- [ ] **Badge Display Component** (`src/components/fixits/BadgeDisplay.tsx`)
  - [ ] Badge icon/image
  - [ ] Badge name and description
  - [ ] Earned timestamp
  - [ ] Tooltip on hover

- [ ] **User Stats Card** (`src/components/fixits/UserStatsCard.tsx`)
  - [ ] Total points
  - [ ] Fixits resolved
  - [ ] Current streak
  - [ ] Badges earned

- [ ] **Badge Earned Notification** (`src/components/fixits/BadgeNotification.tsx`)
  - [ ] Toast/modal when badge earned
  - [ ] Celebratory animation
  - [ ] Share badge button (optional)

- [ ] **Update Dashboard** (`src/components/fixits/FixitDashboard.tsx`)
  - [ ] Integrate leaderboard component
  - [ ] Show user stats in sidebar

### Testing

- [ ] **Points Calculation**
  - [ ] Resolve small fixit → 1 point
  - [ ] Resolve medium fixit → 2 points
  - [ ] Resolve large fixit → 3 points
  - [ ] First of the day → +1 bonus

- [ ] **Badge Awards**
  - [ ] Resolve first fixit → "First Fix" badge
  - [ ] Resolve 10 fixits → "Bug Slayer" badge
  - [ ] Post 10 comments → "Team Player" badge

- [ ] **Leaderboard**
  - [ ] Multiple users resolve fixits
  - [ ] Verify ranking is correct
  - [ ] Toggle daily/weekly/all-time views

---

## Phase 4: Polish & Analytics (Week 5)

### Backend - Advanced Features

- [ ] **Filtering & Search**
  - [ ] Update `listFixits()` to accept filters
    - [ ] Status filter (open, in_progress, resolved, closed)
    - [ ] Priority filter (low, medium, high)
    - [ ] Creator filter (by user)
    - [ ] Resolver filter (by user)
    - [ ] Search by title/description
  - [ ] Add full-text search (SQLite FTS5)

- [ ] **Analytics Queries** (`api/repositories/fixit-room.ts`)
  - [ ] `getFixitStats()` - Total, open, resolved counts
  - [ ] `getVelocityData()` - Fixits resolved over time
  - [ ] `getAverageResolutionTime()` - Time to resolve
  - [ ] `getTopResolvers()` - Leaderboard with filters

- [ ] **Export Data**
  - [ ] Add `GET /export/csv` endpoint
  - [ ] Add `GET /export/json` endpoint
  - [ ] Generate CSV/JSON of all fixits and events

### Frontend - Polish

- [ ] **Filter Component** (`src/components/fixits/FixitFilters.tsx`)
  - [ ] Status checkboxes
  - [ ] Priority checkboxes
  - [ ] User dropdown (creator/resolver)
  - [ ] Search input
  - [ ] Clear filters button

- [ ] **Velocity Chart** (`src/components/fixits/VelocityChart.tsx`)
  - [ ] Use Chart.js or Recharts
  - [ ] Line chart showing fixits resolved over time
  - [ ] Weekly aggregation

- [ ] **Stats Dashboard** (`src/components/fixits/StatsDashboard.tsx`)
  - [ ] Key metrics cards
    - [ ] Total fixits
    - [ ] Open fixits
    - [ ] Resolved this week
    - [ ] Average resolution time
  - [ ] Velocity chart
  - [ ] Top resolvers list

- [ ] **Dark Mode Styling**
  - [ ] Verify all new components support dark mode
  - [ ] Consistent color palette

- [ ] **Accessibility**
  - [ ] Keyboard navigation
  - [ ] ARIA labels
  - [ ] Screen reader support

- [ ] **Mobile Responsive**
  - [ ] Test on mobile devices
  - [ ] Adjust layouts for small screens

### Testing

- [ ] **Filtering**
  - [ ] Filter by status → correct fixits shown
  - [ ] Filter by priority → correct fixits shown
  - [ ] Search by title → correct results
  - [ ] Combine multiple filters → correct intersection

- [ ] **Analytics**
  - [ ] Velocity chart shows accurate data
  - [ ] Average resolution time is calculated correctly
  - [ ] Top resolvers list is ranked correctly

- [ ] **Export**
  - [ ] Export CSV → download works, data is correct
  - [ ] Export JSON → download works, data is correct

### Documentation

- [ ] **User Documentation**
  - [ ] How to create a fixit
  - [ ] How to connect GitHub
  - [ ] How to earn points and badges
  - [ ] FAQ

- [ ] **Developer Documentation**
  - [ ] Architecture overview
  - [ ] API endpoints reference
  - [ ] WebSocket message reference
  - [ ] Database schema

---

## Deployment Checklist

- [ ] **Environment Setup**
  - [ ] Add GitHub OAuth credentials to production environment
  - [ ] Add GitHub webhook secret to production environment
  - [ ] Configure webhook URL in GitHub

- [ ] **Wrangler Deploy**
  - [ ] Deploy to staging environment
  - [ ] Test all features in staging
  - [ ] Deploy to production

- [ ] **Database Migration**
  - [ ] Test Durable Object schema initialization
  - [ ] Verify no breaking changes to existing rooms

- [ ] **Monitoring**
  - [ ] Set up logging for GitHub webhook events
  - [ ] Set up alerts for error rates
  - [ ] Monitor Durable Object performance

---

## Post-Launch

- [ ] **User Feedback**
  - [ ] Collect feedback from beta users
  - [ ] Create GitHub issues for feature requests

- [ ] **Performance Optimization**
  - [ ] Profile slow queries
  - [ ] Add caching where appropriate
  - [ ] Optimize WebSocket message size

- [ ] **Feature Enhancements**
  - [ ] Slack integration (post daily leaderboard)
  - [ ] Jira/Linear sync (reuse existing OAuth)
  - [ ] AI-suggested fixits
  - [ ] Custom point values per fixit

---

## Progress Tracking

### Phase 1: Core Fixit System
**Status**: Not Started
**Estimated**: 2 weeks
**Completed**: 0 / 50 tasks

### Phase 2: GitHub Integration
**Status**: Not Started
**Estimated**: 1 week
**Completed**: 0 / 30 tasks

### Phase 3: Gamification
**Status**: Not Started
**Estimated**: 1 week
**Completed**: 0 / 25 tasks

### Phase 4: Polish & Analytics
**Status**: Not Started
**Estimated**: 1 week
**Completed**: 0 / 20 tasks

---

**Total Tasks**: 125
**Total Estimated Time**: 5 weeks
**Last Updated**: 2025-11-25
