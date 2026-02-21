import type {
  ExtraVoteOption,
  JudgeMetadata as SharedJudgeMetadata,
  RoomData as SharedRoomData,
  RoomSettings as SharedRoomSettings,
  TicketQueueItem as SharedTicketQueueItem,
  TicketVote as SharedTicketVote,
  SessionRoundHistoryItem,
  StructuredVote,
  TimerState,
  VoteValue,
  VotingCompletion,
  VotingCriterion,
  VotingSequenceTemplate,
  RoomGameSession,
  RoomStatus,
} from "@sprintjam/types";

export type ErrorKind =
  | "permission"
  | "auth"
  | "passcode"
  | "network"
  | "validation"
  | "unknown";

export type ConnectionStatusState = "connected" | "connecting" | "disconnected";

export type ErrorConnectionIssue = {
  type: string;
  message: string;
  reconnecting?: boolean;
};

export type JudgeAlgorithm =
  | "smartConsensus"
  | "conservativeMode"
  | "optimisticMode"
  | "simpleAverage";

export type AvatarId =
  | "user"
  | "robot"
  | "bear"
  | "bird"
  | "knight"
  | "alien"
  | "ninja"
  | "pirate"
  | "wizard"
  | "ghost"
  | "dragon"
  | "crown"
  | string;

export interface TicketMetadata {
  id?: string;
  key?: string;
  identifier?: string;
  summary?: string;
  title?: string;
  name?: string;
  description?: string;
  body?: string;
  status?: string;
  assignee?: string | null;
  storyPoints?: number | null;
  estimate?: number | null;
  labels?: string[];
  url?: string;
  html_url?: string;
  number?: number;
  [key: string]: unknown;
}

export interface ExternalBoardOption {
  id: string;
  name: string;
  key?: string;
}

export interface ExternalSprintOption {
  id: string;
  name: string;
  number?: number;
  state?: string;
  startDate?: string | null;
  endDate?: string | null;
}

export interface ExternalTicketSummary {
  id: string;
  key: string;
  title: string;
  description?: string;
  status?: string;
  assignee?: string | null;
  storyPoints?: number | null;
  estimate?: number | null;
  labels?: string[];
  url?: string;
  metadata: TicketMetadata;
}

type AppTicketVote = Omit<SharedTicketVote, "structuredVotePayload"> & {
  structuredVotePayload?: StructuredVote;
};

export type TicketQueueItem = Omit<
  SharedTicketQueueItem,
  | "roomKey"
  | "title"
  | "status"
  | "externalService"
  | "externalServiceMetadata"
  | "votes"
> & {
  title?: string;
  status: "pending" | "in_progress" | "completed";
  externalService: "jira" | "linear" | "github" | "none";
  externalServiceMetadata?: TicketMetadata;
  votes?: AppTicketVote[];
};

export type RoomSettings = Omit<
  SharedRoomSettings,
  "judgeAlgorithm" | "externalService"
> & {
  judgeAlgorithm: JudgeAlgorithm;
  externalService?: "jira" | "linear" | "github" | "none";
};

export interface ServerDefaults {
  roomSettings: RoomSettings;
  votingCriteria: VotingCriterion[];
  structuredVotingOptions: (string | number)[];
  votingSequences?: VotingSequenceTemplate[];
  extraVoteOptions?: ExtraVoteOption[];
}

export type JudgeMetadata = Omit<SharedJudgeMetadata, "algorithm"> & {
  algorithm: JudgeAlgorithm;
};

export type RoomData = Omit<
  SharedRoomData,
  | "settings"
  | "judgeScore"
  | "judgeMetadata"
  | "userAvatars"
  | "currentTicket"
  | "ticketQueue"
> & {
  createdAt?: string;
  lastActivity?: string;
  settings: RoomSettings;
  judgeScore: VoteValue | null;
  judgeMetadata?: JudgeMetadata;
  userAvatars?: Record<string, AvatarId>;
  currentTicket?: TicketQueueItem;
  ticketQueue?: TicketQueueItem[];
};

export type WebSocketErrorReason =
  | "auth"
  | "disconnect"
  | "permission"
  | "network";

export type WebSocketMessageType =
  | "initialize"
  | "userJoined"
  | "userLeft"
  | "userConnectionStatus"
  | "spectatorStatusChanged"
  | "vote"
  | "showVotes"
  | "resetVotes"
  | "newModerator"
  | "settingsUpdated"
  | "roomStatusUpdated"
  | "judgeScoreUpdated"
  | "error"
  | "disconnected"
  | "avatarChanged"
  | "strudelCodeGenerated"
  | "generateStrudelCode"
  | "toggleStrudelPlayback"
  | "strudelPlaybackToggled"
  | "nextTicket"
  | "ticketAdded"
  | "ticketUpdated"
  | "ticketDeleted"
  | "ticketCompleted"
  | "queueUpdated"
  | "timerStarted"
  | "timerPaused"
  | "timerReset"
  | "timerUpdated"
  | "clueboardSecret"
  | "gameStarted"
  | "gameMoveSubmitted"
  | "gameEnded";

interface WebSocketPayloads {
  initialize: {
    roomData: RoomData;
  };
  userJoined: {
    user: string;
    avatar?: AvatarId;
    roomData?: RoomData;
  };
  userLeft: {
    user: string;
  };
  userConnectionStatus: {
    user: string;
    isConnected: boolean;
  };
  spectatorStatusChanged: {
    user: string;
    isSpectator: boolean;
    users: string[];
    spectators: string[];
  };
  vote: {
    user: string;
    vote?: VoteValue | null;
    structuredVote?: StructuredVote | null;
    votingCompletion?: VotingCompletion;
  };
  showVotes: {
    showVotes: boolean;
  };
  resetVotes: {
    votingCompletion?: VotingCompletion;
    roundHistory?: SessionRoundHistoryItem[];
  };
  newModerator: {
    moderator: string;
  };
  settingsUpdated: {
    settings: RoomSettings;
  };
  roomStatusUpdated: {
    status: RoomStatus;
  };
  judgeScoreUpdated: {
    judgeScore?: VoteValue | null;
    judgeMetadata?: JudgeMetadata;
  };
  error: {
    error?: string;
    message?: string;
    reason?: WebSocketErrorReason;
    closeCode?: number;
    code?: number;
  };
  disconnected: {
    error?: string;
    reason?: WebSocketErrorReason;
    closeCode?: number;
  };
  avatarChanged: {
    user: string;
    avatar: AvatarId;
  };
  strudelCodeGenerated: {
    code: string;
    generationId?: string;
    phase?: string;
  };
  generateStrudelCode: Record<string, never>;
  toggleStrudelPlayback: Record<string, never>;
  strudelPlaybackToggled: {
    isPlaying: boolean;
  };
  nextTicket: {
    ticket: TicketQueueItem;
    queue?: TicketQueueItem[];
    roundHistory?: SessionRoundHistoryItem[];
  };
  ticketAdded: {
    ticket: TicketQueueItem;
    queue?: TicketQueueItem[];
  };
  ticketUpdated: {
    ticket: TicketQueueItem;
    updates?: Partial<TicketQueueItem>;
    queue?: TicketQueueItem[];
  };
  ticketDeleted: {
    ticketId: number;
    queue?: TicketQueueItem[];
  };
  ticketCompleted: {
    ticket?: TicketQueueItem;
    queue?: TicketQueueItem[];
    outcome?: string;
  };
  queueUpdated: {
    queue?: TicketQueueItem[];
  };
  timerStarted: {
    timerState: TimerState;
  };
  timerPaused: {
    timerState: TimerState;
  };
  timerReset: {
    timerState: TimerState;
  };
  timerUpdated: {
    timerState: TimerState;
  };
  clueboardSecret: {
    round: number;
    blockerIndex: number;
  };
  gameStarted: {
    gameSession: RoomGameSession;
    startedBy: string;
  };
  gameMoveSubmitted: {
    gameSession: RoomGameSession;
    user: string;
  };
  gameEnded: {
    gameSession?: RoomGameSession;
    endedBy: string;
  };
}

interface WebSocketEnvelope {
  error?: string;
  message?: string;
  reason?: WebSocketErrorReason;
  closeCode?: number;
}

export type WebSocketMessage = {
  [Type in WebSocketMessageType]: {
    type: Type;
  } & WebSocketPayloads[Type];
}[WebSocketMessageType] &
  WebSocketEnvelope;

export interface RoomStats {
  avg: number | string | null;
  mode: VoteValue | null;
  distribution: Record<string, number>;
  totalVotes: number;
  votedUsers: number;
  totalUsers: number;
  judgeScore: VoteValue | null;
  isNumericScale: boolean;
}

export interface CriteriaStats {
  criterionId: string;
  name: string;
  average: number;
  min: number;
  max: number;
  variance: number;
  consensus: "high" | "medium" | "low";
  maxScore?: number;
}
