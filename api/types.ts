import type {
  DurableObjectNamespace,
  Fetcher,
  WebSocket as CfWebSocket,
  RateLimit,
  D1Database,
} from "@cloudflare/workers-types";

import { TicketQueueItem, OauthCredentialsItem } from "./db/types";

export interface Env {
  ENABLE_JOIN_RATE_LIMIT?: string;
  ENVIRONMENT?: string;
  JOIN_RATE_LIMITER: RateLimit;
  PLANNING_ROOM: DurableObjectNamespace;
  ASSETS: Fetcher;
  TOKEN_ENCRYPTION_SECRET: string;
  DB: D1Database;
  RESEND_API_KEY: string;
  JIRA_OAUTH_CLIENT_ID?: string;
  JIRA_OAUTH_CLIENT_SECRET?: string;
  JIRA_OAUTH_REDIRECT_URI?: string;
  LINEAR_OAUTH_CLIENT_ID?: string;
  LINEAR_OAUTH_CLIENT_SECRET?: string;
  LINEAR_OAUTH_REDIRECT_URI?: string;
  GITHUB_OAUTH_CLIENT_ID?: string;
  GITHUB_OAUTH_CLIENT_SECRET?: string;
  GITHUB_OAUTH_REDIRECT_URI?: string;
  FEEDBACK_GITHUB_TOKEN?: string;
  POLYCHAT_API_TOKEN?: string;
}

export type ClientMessage =
  | { type: "vote"; vote: string | number | StructuredVote }
  | { type: "showVotes" }
  | { type: "resetVotes" }
  | { type: "updateSettings"; settings: Partial<RoomData["settings"]> }
  | { type: "generateStrudelCode" }
  | { type: "toggleStrudelPlayback" }
  | { type: "selectTicket"; ticketId: number }
  | { type: "nextTicket" }
  | { type: "addTicket"; ticket: Partial<TicketQueueItem> }
  | {
      type: "updateTicket";
      ticketId: number;
      updates: Partial<TicketQueueItem>;
    }
  | { type: "deleteTicket"; ticketId: number }
  | { type: "completeTicket"; outcome?: string }
  | { type: "startTimer" }
  | { type: "pauseTimer" }
  | { type: "resetTimer" }
  | {
      type: "configureTimer";
      config: {
        targetDurationSeconds?: number;
        autoResetOnVotesReset?: boolean;
        resetCountdown?: boolean;
      };
    }
  | { type: "toggleSpectator"; isSpectator: boolean }
  | { type: "ping" };

export type VoteValue = string | number;

export interface VoteOptionMetadata {
  value: string | number;
  background: string;
  taskSize: TaskSize | null;
}

export type TaskSize = "xs" | "sm" | "md" | "lg" | "xl";

export enum JudgeAlgorithm {
  SMART_CONSENSUS = "smartConsensus",
  CONSERVATIVE_MODE = "conservativeMode",
  OPTIMISTIC_MODE = "optimisticMode",
  SIMPLE_AVERAGE = "simpleAverage",
}

export interface JudgeResult {
  score: number | null;
  confidence: "high" | "medium" | "low";
  needsDiscussion: boolean;
  reasoning: string;
}

export interface JudgeMetadata {
  confidence: "high" | "medium" | "low";
  needsDiscussion: boolean;
  reasoning: string;
  algorithm: JudgeAlgorithm;
  questionMarkCount?: number;
  numericVoteCount?: number;
  totalVoteCount?: number;
}

export type VotingSequenceId =
  | "fibonacci"
  | "fibonacci-short"
  | "doubling"
  | "tshirt"
  | "planet-scale"
  | "yes-no"
  | "simple"
  | "hours"
  | "custom";

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
  impact?: "none" | "high-alert";
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
  allowVotingAfterReveal?: boolean;
  enableAutoReveal?: boolean;
  alwaysRevealVotes?: boolean;
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
  externalService?: "jira" | "linear" | "github" | "none";
  autoSyncEstimates?: boolean;
  enableTicketQueue?: boolean;
  enableStructuredVoting?: boolean;
  votingCriteria?: VotingCriterion[];
  resultsDisplay?: ResultsDisplaySettings;
  structuredVotingDisplay?: StructuredVotingDisplaySettings;
  autoHandoverModerator?: boolean;
  enableStrudelPlayer?: boolean;
  strudelAutoGenerate?: boolean;
  votingSequenceId?: VotingSequenceId;
  customEstimateOptions?: (string | number)[];
  extraVoteOptions?: ExtraVoteOption[];
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

type BaseOAuthCredentials = Pick<
  OauthCredentialsItem,
  | "id"
  | "roomKey"
  | "accessToken"
  | "refreshToken"
  | "tokenType"
  | "expiresAt"
  | "scope"
  | "authorizedBy"
  | "createdAt"
  | "updatedAt"
>;

export interface JiraOAuthCredentials extends BaseOAuthCredentials {
  jiraDomain: string;
  jiraCloudId: string | null;
  jiraUserId: string | null;
  jiraUserEmail: string | null;
  storyPointsField: string | null;
  sprintField: string | null;
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

export interface GithubOAuthCredentials extends BaseOAuthCredentials {
  githubLogin: string | null;
  githubUserEmail: string | null;
  defaultOwner: string | null;
  defaultRepo: string | null;
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

export interface LinearOAuthCredentials extends BaseOAuthCredentials {
  linearOrganizationId: string | null;
  linearUserId: string | null;
  linearUserEmail: string | null;
  estimateField: string | null;
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

export type TicketQueueWithVotes = TicketQueueItem & {
  votes?: TicketVote[];
};

export interface TimerState {
  running: boolean;
  seconds: number;
  lastUpdateTime: number;
  targetDurationSeconds?: number | null;
  roundAnchorSeconds?: number;
  autoResetOnVotesReset?: boolean;
}

export interface PasscodeHashPayload {
  hash: string;
  salt: string;
  iterations: number;
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
  judgeScore?: string | number | null;
  judgeMetadata?: JudgeMetadata;
  settings: RoomSettings;
  passcodeHash?: PasscodeHashPayload;
  userAvatars?: Record<string, string>;
  currentStrudelCode?: string;
  currentStrudelGenerationId?: string;
  strudelPhase?: string;
  strudelIsPlaying?: boolean;
  currentTicket?: TicketQueueWithVotes;
  ticketQueue?: TicketQueueWithVotes[];
  timerState?: TimerState;
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
