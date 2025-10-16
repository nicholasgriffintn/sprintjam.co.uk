export type VoteValue = string | number;

export type JudgeAlgorithm = 'smartConsensus' | 'conservativeMode' | 'optimisticMode' | 'simpleAverage';

export type TaskSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export type AvatarId = 'user' | 'robot' | 'bear' | 'bird' | 'knight' | 'alien' | 'ninja' | 'pirate' | 'wizard' | 'ghost' | 'dragon' | 'crown';

export interface JiraTicket {
  id: string;
  key: string;
  summary: string;
  description: string;
  status: string;
  assignee: string | null;
  storyPoints: number | null;
  url: string;
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
  summaryCards: SummaryCardSetting[];
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
  enableJiraIntegration?: boolean;
  autoUpdateJiraStoryPoints?: boolean;
  enableStructuredVoting?: boolean;
  votingCriteria?: VotingCriterion[];
  resultsDisplay?: ResultsDisplaySettings;
  structuredVotingDisplay?: StructuredVotingDisplaySettings;
  autoHandoverModerator?: boolean;
}

export interface ServerDefaults {
  roomSettings: RoomSettings;
  votingCriteria: VotingCriterion[];
  structuredVotingOptions: (string | number)[];
  deploymentConfig?: {
    hasCustomVotingOptions?: boolean;
    judgeEnabledByDefault?: boolean;
    structuredVotingEnabledByDefault?: boolean;
    [key: string]: unknown;
  };
}

export interface JudgeMetadata {
  confidence: 'high' | 'medium' | 'low';
  needsDiscussion: boolean;
  reasoning: string;
  algorithm: JudgeAlgorithm;
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
  jiraTicket?: JiraTicket;
  passcode?: string;
  userAvatars?: Record<string, AvatarId>;
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
  | 'jiraTicketUpdated'
  | 'jiraTicketCleared'
  | 'error'
  | 'disconnected'
  | 'avatarChanged';

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
  ticket?: JiraTicket | undefined;
}

export interface RoomStats {
  avg: number | string;
  mode: VoteValue | null;
  distribution: Record<VoteValue, number>;
  totalVotes: number;
  votedUsers: number;
  totalUsers: number;
  judgeScore: VoteValue | null;
}
