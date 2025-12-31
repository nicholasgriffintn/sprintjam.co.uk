export type ErrorKind =
  | "permission"
  | "auth"
  | "passcode"
  | "network"
  | "validation"
  | "unknown";

export type ConnectionStatusState = 'connected' | 'connecting' | 'disconnected';

export type ErrorConnectionIssue = {
  type: string;
  message: string;
  reconnecting?: boolean;
};

export type VoteValue = string | number;

export type JudgeAlgorithm =
  | 'smartConsensus'
  | 'conservativeMode'
  | 'optimisticMode'
  | 'simpleAverage';

export type TaskSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export type VotingSequenceId =
  | 'fibonacci'
  | 'fibonacci-short'
  | 'doubling'
  | 'tshirt'
  | 'planet-scale'
  | 'yes-no'
  | 'simple'
  | 'hours'
  | 'custom';

export interface VotingSequenceTemplate {
  id: VotingSequenceId;
  label: string;
  description?: string;
  options: (string | number)[];
}

export interface ExtraVoteOption {
  id: string;
  label: string;
  value: string;
  description?: string;
  enabled?: boolean;
  aliases?: string[];
  impact?: 'none' | 'high-alert';
}

export type AvatarId =
  | 'user'
  | 'robot'
  | 'bear'
  | 'bird'
  | 'knight'
  | 'alien'
  | 'ninja'
  | 'pirate'
  | 'wizard'
  | 'ghost'
  | 'dragon'
  | 'crown'
  | string;

export interface TicketVote {
  id: number;
  ticketQueueId: number;
  userName: string;
  vote: VoteValue;
  structuredVotePayload?: StructuredVote;
  votedAt: number;
}

export type TicketMetadata = Record<string, any>;

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

export interface GithubIssue {
  id: string;
  key: string;
  repository: string;
  number: number;
  title: string;
  description?: string;
  status?: string;
  assignee?: string;
  estimate?: number | null;
  url?: string;
  labels?: string[];
}

export interface TicketQueueItem {
  id: number;
  ticketId: string;
  title?: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed';
  outcome?: string;
  createdAt: number;
  completedAt?: number;
  ordinal: number;
  externalService: 'jira' | 'linear' | 'github' | 'none';
  externalServiceId?: string;
  externalServiceMetadata?: TicketMetadata;
  votes?: TicketVote[];
}

export interface VoteOptionMetadata {
  value: VoteValue;
  background: string;
  taskSize: TaskSize | null;
}

export interface SummaryCardSetting {
  id: string;
  label: string;
  enabled: boolean;
}

export interface ConsensusLabelSettings {
  high?: string;
  medium?: string;
  low?: string;
}

export interface CriteriaBreakdownSettings {
  enabled: boolean;
  title: string;
  consensusLabels?: ConsensusLabelSettings;
}

export interface ResultsDisplaySettings {
  summaryCards?: SummaryCardSetting[];
  showVoteDistribution?: boolean;
  voteDistributionLabel?: string;
  criteriaBreakdown?: CriteriaBreakdownSettings;
}

export interface InfoToggleSettings {
  enabled: boolean;
  label: string;
  title?: string;
  rangesDescription?: string;
  rangesLabel?: string;
  showRangeDetails?: boolean;
  showContributionDetails?: boolean;
  showConversionRules?: boolean;
}

export interface StructuredSummarySettings {
  storyPointsLabel?: string;
  weightedScoreLabel?: string;
  showConversionCount?: boolean;
}

export interface StructuredVotingDisplaySettings {
  panelTitle?: string;
  infoToggle?: InfoToggleSettings;
  summary?: StructuredSummarySettings;
}

export interface StructuredVote {
  criteriaScores: Record<string, number>;
  calculatedStoryPoints?: VoteValue;
  percentageScore?: number;
  appliedConversionRules?: string[];
  contributions?: {
    id: string;
    weightPercent: number;
    score: number;
    maxScore: number;
    contributionPercent: number;
  }[];
}

export interface VotingCriterion {
  id: string;
  name: string;
  description: string;
  minScore: number;
  maxScore: number;
}

export interface RoomSettings {
  estimateOptions: (string | number)[];
  voteOptionsMetadata?: VoteOptionMetadata[];
  allowOthersToShowEstimates: boolean;
  allowOthersToDeleteEstimates: boolean;
  allowOthersToManageQueue?: boolean;
  allowVotingAfterReveal?: boolean;
  showTimer: boolean;
  showUserPresence: boolean;
  showAverage: boolean;
  showMedian: boolean;
  showTopVotes: boolean;
  topVotesCount: number;
  anonymousVotes: boolean;
  enableJudge: boolean;
  judgeAlgorithm: JudgeAlgorithm;
  hideParticipantNames?: boolean;
  externalService?: 'jira' | 'linear' | 'github' | 'none';
  autoSyncEstimates?: boolean;
  enableTicketQueue?: boolean;
  enableStructuredVoting?: boolean;
  votingCriteria?: VotingCriterion[];
  resultsDisplay?: ResultsDisplaySettings;
  structuredVotingDisplay?: StructuredVotingDisplaySettings;
  autoHandoverModerator?: boolean;
  enableStrudelPlayer?: boolean;
  strudelAutoGenerate?: boolean;
  enableAutoReveal?: boolean;
  alwaysRevealVotes?: boolean;
  votingSequenceId?: VotingSequenceId;
  customEstimateOptions?: (string | number)[];
  extraVoteOptions?: ExtraVoteOption[];
}

export interface ServerDefaults {
  roomSettings: RoomSettings;
  votingCriteria: VotingCriterion[];
  structuredVotingOptions: (string | number)[];
  votingSequences?: VotingSequenceTemplate[];
  extraVoteOptions?: ExtraVoteOption[];
}

export interface JudgeMetadata {
  confidence: 'high' | 'medium' | 'low';
  needsDiscussion: boolean;
  reasoning: string;
  algorithm: JudgeAlgorithm;
  questionMarkCount?: number;
  numericVoteCount?: number;
  totalVoteCount?: number;
}

export interface TimerState {
  running: boolean;
  seconds: number;
  lastUpdateTime: number;
  targetDurationSeconds?: number | null;
  roundAnchorSeconds?: number;
  autoResetOnVotesReset?: boolean;
}

export interface RoomData {
  key: string;
  users: string[];
  spectators?: string[];
  votes: Record<string, VoteValue | null>;
  structuredVotes?: Record<string, StructuredVote>;
  showVotes: boolean;
  moderator: string;
  connectedUsers: Record<string, boolean>;
  createdAt?: string;
  lastActivity?: string;
  settings: RoomSettings;
  judgeScore: VoteValue | null;
  judgeMetadata?: JudgeMetadata;
  userAvatars?: Record<string, AvatarId>;
  currentStrudelCode?: string;
  currentStrudelGenerationId?: string;
  strudelPhase?: string;
  strudelIsPlaying?: boolean;
  currentTicket?: TicketQueueItem;
  ticketQueue?: TicketQueueItem[];
  timerState?: TimerState;
}

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
  | "timerUpdated";

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
  };
  showVotes: {
    showVotes: boolean;
  };
  resetVotes: Record<string, never>;
  newModerator: {
    moderator: string;
  };
  settingsUpdated: {
    settings: RoomSettings;
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
}

interface WebSocketEnvelope {
  error?: string;
  message?: string;
  reason?: WebSocketErrorReason;
  closeCode?: number;
}

export type WebSocketMessage = ({
  [Type in WebSocketMessageType]: {
    type: Type;
  } & WebSocketPayloads[Type];
}[WebSocketMessageType]) &
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
  consensus: 'high' | 'medium' | 'low';
  maxScore?: number;
}
