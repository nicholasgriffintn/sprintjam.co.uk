export type VoteValue = string | number;

export type JudgeAlgorithm = 'smartConsensus' | 'conservativeMode' | 'optimisticMode' | 'simpleAverage';

export type TaskSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

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
  enableJiraIntegration?: boolean;
  autoUpdateJiraStoryPoints?: boolean;
  enableStructuredVoting?: boolean;
  votingCriteria?: VotingCriterion[];
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
}

export interface WebSocketErrorData {
  error?: string;
  message?: string;
  code?: number;
}

export interface WebSocketMessage {
  type: string;
  roomData?: RoomData;
  settings?: RoomSettings;
  error?: string;
  message?: string;
  user?: string;
  isConnected?: boolean;
  judgeScore?: VoteValue | null;
  judgeMetadata?: JudgeMetadata;
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
