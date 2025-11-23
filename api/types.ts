import type {
  DurableObjectNamespace,
  Fetcher,
  WebSocket as CfWebSocket,
} from "@cloudflare/workers-types";

export interface Env {
  PLANNING_ROOM: DurableObjectNamespace;
  ASSETS: Fetcher;
  JIRA_OAUTH_CLIENT_ID?: string;
  JIRA_OAUTH_CLIENT_SECRET?: string;
  JIRA_OAUTH_REDIRECT_URI?: string;
  LINEAR_OAUTH_CLIENT_ID?: string;
  LINEAR_OAUTH_CLIENT_SECRET?: string;
  LINEAR_OAUTH_REDIRECT_URI?: string;
  POLYCHAT_API_TOKEN?: string;
}

export type ClientMessage =
  | { type: 'vote'; vote: string | number | StructuredVote }
  | { type: 'showVotes' }
  | { type: 'resetVotes' }
  | { type: 'updateSettings'; settings: Partial<RoomData['settings']> }
  | { type: 'generateStrudelCode' }
  | { type: 'toggleStrudelPlayback' }
  | { type: 'nextTicket' }
  | { type: 'addTicket'; ticket: Partial<TicketQueueItem> }
  | {
      type: 'updateTicket';
      ticketId: number;
      updates: Partial<TicketQueueItem>;
    }
  | { type: 'deleteTicket'; ticketId: number }
  | { type: 'completeTicket'; outcome?: string }
  | { type: 'ping' };

export type VoteValue = string | number | null | '?' | 'coffee';

export interface VoteOptionMetadata {
  value: string | number;
  background: string;
  taskSize: TaskSize | null;
}

export type TaskSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export enum JudgeAlgorithm {
  SMART_CONSENSUS = 'smartConsensus',
  CONSERVATIVE_MODE = 'conservativeMode',
  OPTIMISTIC_MODE = 'optimisticMode',
  SIMPLE_AVERAGE = 'simpleAverage',
}

export interface JudgeResult {
  score: number | null;
  confidence: 'high' | 'medium' | 'low';
  needsDiscussion: boolean;
  reasoning: string;
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

export interface RoomSettings {
  estimateOptions: (string | number)[];
  voteOptionsMetadata?: VoteOptionMetadata[];
  allowOthersToShowEstimates: boolean;
  allowOthersToDeleteEstimates: boolean;
  allowOthersToManageQueue?: boolean;
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
  externalService?: 'jira' | 'linear' | 'none';
  enableStructuredVoting?: boolean;
  votingCriteria?: VotingCriterion[];
  autoUpdateJiraStoryPoints?: boolean;
  resultsDisplay?: ResultsDisplaySettings;
  structuredVotingDisplay?: StructuredVotingDisplaySettings;
  autoHandoverModerator?: boolean;
  enableStrudelPlayer?: boolean;
  strudelAutoGenerate?: boolean;
  enableTicketQueue?: boolean;
}

export interface VotingCriterion {
  id: string;
  name: string;
  description: string;
  minScore: number;
  maxScore: number;
}

export interface StructuredVote {
  criteriaScores: Record<string, number>;
  calculatedStoryPoints?: string | number;
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

export interface JiraTicket {
  id: string;
  key: string;
  summary: string;
  description?: string;
  status?: string;
  storyPoints?: number;
  url?: string;
}

export interface JiraOAuthCredentials {
  id: number;
  roomKey: string;
  accessToken: string;
  refreshToken: string | null;
  tokenType: string;
  expiresAt: number;
  scope: string | null;
  jiraDomain: string;
  jiraCloudId: string | null;
  jiraUserId: string | null;
  jiraUserEmail: string | null;
  storyPointsField: string | null;
  sprintField: string | null;
  authorizedBy: string;
  createdAt: number;
  updatedAt: number;
}

export interface JiraFieldDefinition {
  id: string;
  name: string;
  schema?: {
    type?: string;
    system?: string;
    custom?: string;
    items?: string;
  };
}

export interface LinearOAuthCredentials {
  id: number;
  roomKey: string;
  accessToken: string;
  refreshToken: string | null;
  tokenType: string;
  expiresAt: number;
  scope: string | null;
  linearOrganizationId: string | null;
  linearUserId: string | null;
  linearUserEmail: string | null;
  estimateField: string | null;
  authorizedBy: string;
  createdAt: number;
  updatedAt: number;
}

export interface LinearIssue {
  id: string;
  identifier: string;
  title: string;
  description?: string;
  state?: string;
  estimate?: number;
  url?: string;
}

export interface TicketVote {
  id: number;
  ticketQueueId: number;
  userName: string;
  vote: VoteValue;
  structuredVotePayload?: StructuredVote;
  votedAt: number;
}

export interface TicketQueueItem {
  id: number;
  ticketId: string;
  title?: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  outcome?: string;
  createdAt: number;
  completedAt?: number;
  ordinal: number;
  externalService: 'jira' | 'linear' | 'none';
  externalServiceId?: string;
  externalServiceMetadata?: Record<string, unknown>;
  votes?: TicketVote[];
}

export interface TeamsMetadata {
  channelId: string;
  teamId: string;
  channelName?: string;
}

export interface RoomData {
  key: string;
  users: string[];
  votes: Record<string, VoteValue>;
  structuredVotes?: Record<string, StructuredVote>;
  showVotes: boolean;
  moderator: string;
  connectedUsers: Record<string, boolean>;
  judgeScore?: string | number | null;
  judgeMetadata?: Record<string, unknown>;
  settings: RoomSettings;
  passcodeHash?: string;
  userAvatars?: Record<string, string>;
  currentStrudelCode?: string;
  currentStrudelGenerationId?: string;
  strudelPhase?: string;
  strudelIsPlaying?: boolean;
  currentTicket?: TicketQueueItem;
  ticketQueue?: TicketQueueItem[];
  teamsMetadata?: TeamsMetadata;
}

export interface BroadcastMessage {
  type: string;
  [key: string]: unknown;
}

export interface SessionInfo {
  webSocket: CfWebSocket;
  roomKey: string;
  userName: string;
}
