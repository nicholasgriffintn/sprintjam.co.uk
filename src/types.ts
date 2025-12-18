export type ErrorKind = string;

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

export interface WebSocketErrorData {
  error?: string;
  message?: string;
  code?: number;
}

export type WebSocketMessageType =
  | 'initialize'
  | 'userJoined'
  | 'userLeft'
  | 'userConnectionStatus'
  | 'vote'
  | 'showVotes'
  | 'resetVotes'
  | 'newModerator'
  | 'settingsUpdated'
  | 'judgeScoreUpdated'
  | 'error'
  | 'disconnected'
  | 'avatarChanged'
  | 'strudelCodeGenerated'
  | 'generateStrudelCode'
  | 'toggleStrudelPlayback'
  | 'strudelPlaybackToggled'
  | 'nextTicket'
  | 'ticketAdded'
  | 'ticketUpdated'
  | 'ticketDeleted'
  | 'ticketCompleted'
  | 'queueUpdated'
  | 'timerStarted'
  | 'timerPaused'
  | 'timerReset'
  | 'timerUpdated';

export interface WebSocketMessage {
  type: WebSocketMessageType;
  userAvatar?: AvatarId;
  avatar?: AvatarId;
  roomData?: RoomData;
  settings?: RoomSettings;
  error?: string;
  message?: string;
  user?: string;
  vote?: VoteValue | null;
  structuredVote?: StructuredVote | null;
  showVotes?: boolean;
  isConnected?: boolean;
  judgeScore?: VoteValue | null;
  judgeMetadata?: JudgeMetadata;
  moderator?: string;
  ticket?: TicketQueueItem | undefined;
  ticketId?: number;
  queue?: TicketQueueItem[];
  code?: string;
  generationId?: string;
  phase?: string;
  isPlaying?: boolean;
  updates?: Partial<TicketQueueItem>;
  outcome?: string;
  closeCode?: number;
  reason?: string;
  timerState?: TimerState;
}

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
