export type VoteValue = string | number;

export type JudgeAlgorithm = 'weightedConsensus' | 'majorityBias' | 'confidenceInterval';

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
}