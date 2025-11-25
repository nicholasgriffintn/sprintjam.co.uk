# Fixits Architecture Diagram

## System Architecture (Option A - Recommended)

```mermaid
graph TB
    subgraph "GitHub"
        GH_ISSUES[GitHub Issues]
        GH_PRS[GitHub PRs]
        GH_WEBHOOK[Webhooks]
        GH_OAUTH[OAuth App]
    end

    subgraph "Cloudflare Workers"
        WORKER[Worker Router<br/>api/index.ts]
        GH_CONTROLLER[GitHub Webhook Controller]
    end

    subgraph "Durable Objects"
        FIXIT_DO[Fixit Room DO<br/>fixit-room.ts]

        subgraph "SQLite Storage"
            DB_FIXITS[(fixits)]
            DB_EVENTS[(fixit_events)]
            DB_LEADERBOARD[(leaderboard)]
            DB_COMMENTS[(fixit_comments)]
        end

        WSS[WebSocket Manager]
    end

    subgraph "Frontend"
        REACT[React App]
        FIXIT_DASH[Fixit Dashboard]
        LEADERBOARD[Leaderboard]
        GH_LINK[GitHub Connect]
    end

    %% Flows
    GH_WEBHOOK -->|POST webhook| WORKER
    WORKER -->|Verify & Route| GH_CONTROLLER
    GH_CONTROLLER -->|Forward Event| FIXIT_DO

    REACT -->|WebSocket| WSS
    WSS -->|Real-time Updates| REACT

    FIXIT_DO -->|Read/Write| DB_FIXITS
    FIXIT_DO -->|Log Events| DB_EVENTS
    FIXIT_DO -->|Update Points| DB_LEADERBOARD
    FIXIT_DO -->|Store Comments| DB_COMMENTS

    FIXIT_DO -->|Broadcast Changes| WSS

    GH_OAUTH -.->|Authorize| WORKER
    REACT -->|OAuth Flow| GH_OAUTH

    style FIXIT_DO fill:#f9f,stroke:#333,stroke-width:4px
    style WORKER fill:#bbf,stroke:#333,stroke-width:2px
    style REACT fill:#bfb,stroke:#333,stroke-width:2px
```

## Data Flow: GitHub Issue Closed → Points Awarded

```mermaid
sequenceDiagram
    participant GH as GitHub
    participant W as Worker
    participant DO as Fixit Durable Object
    participant DB as SQLite Storage
    participant WS as WebSocket Clients

    GH->>W: POST /api/github/webhook<br/>{issue: closed, label: "fixit-small"}
    W->>W: Verify signature
    W->>DO: Route to Fixit DO<br/>GET /github/event

    DO->>DB: Check if event exists<br/>SELECT * FROM fixit_events WHERE github_event_id = ?
    alt Event already processed
        DB-->>DO: Event found
        DO-->>W: 200 OK (idempotent)
    else New event
        DB-->>DO: Not found
        DO->>DB: INSERT INTO fixit_events
        DO->>DB: UPDATE fixits SET status = 'resolved'
        DO->>DB: UPDATE leaderboard SET total_points += 1
        DO->>DB: Check badge thresholds
        DO->>WS: Broadcast "fixitResolved"
        DO->>WS: Broadcast "leaderboardUpdated"
        DO-->>W: 200 OK
    end

    WS->>GH: Display notification<br/>"alice resolved a fixit! +1 point"
```

## Component Hierarchy

```mermaid
graph TD
    APP[App.tsx]
    APP --> WELCOME[WelcomeScreen]
    APP --> ROOM[RoomScreen]

    ROOM --> TABS[Tabs Component]
    TABS --> TAB_PLANNING[Planning Poker Tab]
    TABS --> TAB_TICKETS[Tickets Tab]
    TABS --> TAB_FIXITS[Fixits Tab - NEW]

    TAB_FIXITS --> FIXIT_DASH[FixitDashboard.tsx]
    FIXIT_DASH --> FIXIT_LIST[FixitList]
    FIXIT_DASH --> FIXIT_FILTERS[FixitFilters]
    FIXIT_DASH --> FIXIT_LEADERBOARD[FixitLeaderboard]

    FIXIT_LIST --> FIXIT_CARD[FixitCard.tsx]
    FIXIT_CARD --> FIXIT_MODAL[FixitDetailModal]

    FIXIT_MODAL --> FIXIT_COMMENTS[CommentsList]
    FIXIT_MODAL --> GH_BADGE[GitHub Link Badge]

    FIXIT_DASH --> CREATE_BTN[Create Fixit Button]
    CREATE_BTN --> FIXIT_FORM[FixitForm.tsx]

    ROOM --> HEADER[Header]
    HEADER --> GH_CONNECT[GitHub Connect Button]
    GH_CONNECT --> GH_MODAL[GitHubConnectionModal]

    style TAB_FIXITS fill:#f96,stroke:#333,stroke-width:3px
    style FIXIT_DASH fill:#fc9,stroke:#333,stroke-width:2px
```

## WebSocket Message Flow

```mermaid
sequenceDiagram
    participant U1 as User 1 (Creator)
    participant U2 as User 2 (Viewer)
    participant DO as Fixit Durable Object
    participant DB as SQLite Storage

    Note over U1,DB: User 1 creates a fixit

    U1->>DO: WS: {type: "createFixit", payload: {...}}
    DO->>DB: INSERT INTO fixits
    DB-->>DO: Fixit created
    DO->>DB: INSERT INTO fixit_events
    DO->>U1: WS: {type: "fixitCreated", payload: fixit}
    DO->>U2: WS: {type: "fixitCreated", payload: fixit}

    Note over U1,DB: User 2 resolves the fixit

    U2->>DO: WS: {type: "resolveFixit", payload: {id}}
    DO->>DB: UPDATE fixits SET status = 'resolved'
    DO->>DB: UPDATE leaderboard (User 2 +1 point)
    DO->>DB: Check badge criteria
    alt User earned a new badge
        DB-->>DO: Badge earned: "First Fix"
        DO->>U2: WS: {type: "badgeEarned", payload: badge}
    end
    DO->>U1: WS: {type: "fixitResolved", payload: fixit}
    DO->>U2: WS: {type: "fixitResolved", payload: fixit}
    DO->>U1: WS: {type: "leaderboardUpdated", payload: [...]}
    DO->>U2: WS: {type: "leaderboardUpdated", payload: [...]}
```

## Database Schema (SQLite in Durable Object)

```mermaid
erDiagram
    FIXITS {
        text id PK
        text room_id
        text title
        text description
        text github_issue_url
        text github_pr_url
        text status
        text priority
        integer points
        text creator
        text resolver
        integer created_at
        integer resolved_at
        text labels
    }

    FIXIT_COMMENTS {
        text id PK
        text fixit_id FK
        text user_name
        text comment
        integer created_at
    }

    FIXIT_EVENTS {
        text id PK
        text room_id
        text event_type
        text user_name
        text fixit_id FK
        integer points
        text github_event_id
        text raw_json
        integer created_at
    }

    LEADERBOARD {
        text user_name PK
        text room_id
        integer total_points
        integer fixits_resolved
        text badges
        integer last_updated
    }

    FIXITS ||--o{ FIXIT_COMMENTS : "has many"
    FIXITS ||--o{ FIXIT_EVENTS : "generates"
    LEADERBOARD ||--o{ FIXIT_EVENTS : "aggregates"
```

## OAuth & Webhook Setup Flow

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant W as Worker
    participant GH as GitHub
    participant DO as Fixit DO

    Note over U,DO: GitHub OAuth Setup

    U->>FE: Click "Connect GitHub"
    FE->>GH: Redirect to OAuth authorize URL
    GH->>U: Show authorization page
    U->>GH: Approve
    GH->>W: GET /api/github/oauth/callback?code=xxx
    W->>GH: POST /oauth/access_token (exchange code)
    GH-->>W: access_token
    W->>DO: Store token in oauth_credentials
    W->>FE: Redirect to room with success message

    Note over U,DO: Webhook Registration

    W->>GH: POST /repos/{owner}/{repo}/hooks<br/>{url: "https://api.sprintjam.co.uk/api/github/webhook"}
    GH-->>W: Webhook created (webhook_id)
    W->>DO: Store webhook_id

    Note over U,DO: Later: Issue Closed

    GH->>W: POST /api/github/webhook<br/>X-Hub-Signature-256: sha256=...
    W->>W: Verify signature
    W->>DO: Forward event
    DO->>DO: Process and update fixit
```

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Cloudflare Edge                         │
│                                                             │
│  ┌────────────────┐         ┌─────────────────┐           │
│  │ Cloudflare     │         │  Cloudflare     │           │
│  │ Pages          │         │  Workers        │           │
│  │ (Frontend)     │◄────────┤  (API)          │           │
│  └────────────────┘         └────────┬────────┘           │
│                                      │                     │
│                             ┌────────▼────────┐           │
│                             │ Durable Objects │           │
│                             │  (FixitRoom)    │           │
│                             │                 │           │
│                             │  ┌───────────┐  │           │
│                             │  │  SQLite   │  │           │
│                             │  │  Storage  │  │           │
│                             │  └───────────┘  │           │
│                             └─────────────────┘           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                                │
                                │ Webhooks
                                ▼
                        ┌───────────────┐
                        │    GitHub     │
                        │   (Issues,    │
                        │     PRs)      │
                        └───────────────┘
```

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 18 + TypeScript | UI components |
| **State Management** | React Context | Global state |
| **Routing** | React Router v6 | Client-side routing |
| **API Layer** | Cloudflare Workers | HTTP endpoints |
| **Real-time** | WebSockets | Live updates |
| **State Machine** | Durable Objects | Room state management |
| **Storage** | SQLite (DO) | Persistent data |
| **External API** | GitHub REST API v3 | Issue/PR integration |
| **Auth** | GitHub OAuth 2.0 | User authorization |
| **Deployment** | Cloudflare Pages + Workers | Hosting |

## Scaling Characteristics

### Durable Objects Scaling
- **Per-room isolation**: Each room gets its own Durable Object instance
- **Automatic scaling**: Cloudflare creates DO instances on-demand
- **No cold starts**: Durable Objects stay alive during active usage
- **Geographic distribution**: DOs automatically migrate closer to users

### Expected Load (per room)
- **WebSocket connections**: 5-20 concurrent users
- **Fixits per week**: 10-100
- **GitHub events per week**: 20-200
- **Leaderboard queries**: 50-500 per day

### Performance Targets
- **Fixit creation**: < 100ms
- **WebSocket broadcast**: < 50ms
- **GitHub webhook processing**: < 200ms
- **Leaderboard calculation**: < 100ms (cached in memory)

---

**Note**: This architecture is designed for **Option A (SQLite-only)**. For Option B (SQLite + D1), add D1 database nodes and event flow from Durable Object → D1 for historical storage.
