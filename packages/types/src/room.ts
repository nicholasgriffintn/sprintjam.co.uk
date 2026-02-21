import type { WebSocket as CfWebSocket } from "@cloudflare/workers-types";

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
  capacityPoints?: number | null;
  showTimer: boolean;
  showUserPresence: boolean;
  showAverage: boolean;
  showMedian: boolean;
  showTopVotes: boolean;
  topVotesCount: number;
  anonymousVotes: boolean;
  enableFacilitationGuidance?: boolean;
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
  roomKey: string;
  ticketId: string;
  title: string;
  description?: string;
  status?: "pending" | "in_progress" | "blocked" | "completed";
  outcome?: string | null;
  createdAt: number;
  completedAt?: number | null;
  ordinal: number;
  externalService:
    | "jira"
    | "linear"
    | "github"
    | "clickup"
    | "asana"
    | "youtrack"
    | "zoho"
    | "trello"
    | "monday"
    | "none";
  externalServiceId?: string | null;
  externalServiceMetadata?: string | null;
}

export type TicketQueueWithVotes = TicketQueueItem & {
  votes?: TicketVote[];
};

export type RoundTransitionType = "reset" | "next_ticket" | "complete_session";

export interface SessionRoundVote {
  userName: string;
  vote: VoteValue;
  structuredVotePayload?: StructuredVote;
  votedAt: number;
}

export interface SessionRoundHistoryItem {
  id: string;
  ticketId?: string;
  ticketTitle?: string;
  outcome?: string;
  type: RoundTransitionType;
  endedAt: number;
  votes: SessionRoundVote[];
}

export interface TimerState {
  running: boolean;
  seconds: number;
  lastUpdateTime: number;
  targetDurationSeconds?: number | null;
  roundAnchorSeconds?: number;
  autoResetOnVotesReset?: boolean;
}

export const ROOM_GAME_TYPES = [
  "guess-the-number",
  "word-chain",
  "emoji-story",
  "one-word-pitch",
  "category-blitz",
  "clueboard",
] as const;

export type RoomGameType = (typeof ROOM_GAME_TYPES)[number];

export interface RoomGameDefinition {
  type: RoomGameType;
  title: string;
  description: string;
  accent: string;
  objective: string;
}

export interface RoomGameMove {
  id: string;
  user: string;
  submittedAt: number;
  value: string;
  round: number;
}

export interface RoomGameEvent {
  id: string;
  message: string;
  createdAt: number;
}

export interface RoomGameSession {
  type: RoomGameType;
  startedBy: string;
  startedAt: number;
  round: number;
  status: "active" | "completed";
  participants: string[];
  leaderboard: Record<string, number>;
  moves: RoomGameMove[];
  events: RoomGameEvent[];
  numberTarget?: number;
  lastWord?: string | null;
  oneWordPitchPrompt?: string;
  oneWordPitchPromptHistory?: string[];
  oneWordPitchPhase?: "submit" | "vote";
  oneWordPitchRoundSubmissions?: Record<string, string>;
  oneWordPitchRoundVotes?: Record<string, string>;
  oneWordPitchRoundHistory?: Array<{
    round: number;
    prompt: string;
    submissions: Record<string, string>;
    votes?: Record<string, string>;
    voteWinners?: string[];
  }>;
  categoryBlitzCategory?: string;
  categoryBlitzLetter?: string;
  categoryBlitzHistory?: string[];
  categoryBlitzRoundHistory?: Array<{
    round: number;
    category: string;
    letter: string;
    submissions: Record<string, string>;
  }>;
  codenamesBoard?: string[];
  codenamesRevealedIndices?: number[];
  codenamesRoundPhase?: "clue" | "guess";
  codenamesClueGiver?: string | null;
  codenamesCurrentClue?: string | null;
  codenamesCurrentClueTarget?: number;
  codenamesCurrentGuesses?: number;
  codenamesTargetIndices?: number[];
  codenamesAssassinIndex?: number;
  winner?: string;
}

export type RoomStatus = "active" | "completed";

export interface VotingCompletion {
  allVotesComplete: boolean;
  completedCount: number;
  totalCount: number;
  incompleteUsers?: string[];
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
  votingCompletion?: VotingCompletion;
  settings: RoomSettings;
  status?: RoomStatus;
  passcodeHash?: PasscodeHashPayload;
  userAvatars?: Record<string, string>;
  currentStrudelCode?: string;
  currentStrudelGenerationId?: string;
  strudelPhase?: string;
  strudelIsPlaying?: boolean;
  currentTicket?: TicketQueueWithVotes;
  ticketQueue?: TicketQueueWithVotes[];
  roundHistory?: SessionRoundHistoryItem[];
  timerState?: TimerState;
  gameSession?: RoomGameSession;
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
  | { type: "completeSession" }
  | { type: "startGame"; gameType: RoomGameType }
  | { type: "submitGameMove"; value: string }
  | { type: "endGame" }
  | { type: "ping" };
