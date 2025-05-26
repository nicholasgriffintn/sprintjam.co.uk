export type VoteValue = string | number;

export type JudgeAlgorithm = 'smartConsensus' | 'conservativeMode' | 'optimisticMode' | 'simpleAverage';

export type TaskSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface VoteOptionMetadata {
  value: VoteValue;
  background: string;
  taskSize: TaskSize | null;
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
  anonymousVotes: boolean;
  enableJudge: boolean;
  judgeAlgorithm: JudgeAlgorithm;
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
  showVotes: boolean;
  moderator: string;
  connectedUsers: Record<string, boolean>;
  createdAt?: string;
  lastActivity?: string;
  settings: RoomSettings;
  judgeScore: VoteValue | null;
  judgeMetadata?: JudgeMetadata;
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
