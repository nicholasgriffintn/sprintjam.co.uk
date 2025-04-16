export type VoteValue = string | number;

export interface RoomSettings {
  estimateOptions: (string | number)[];
  allowOthersToShowEstimates: boolean;
  allowOthersToDeleteEstimates: boolean;
  allowOthersToClearUsers: boolean;
  showTimer: boolean;
  showUserPresence: boolean;
  showAverage: boolean;
  showMedian: boolean;
}

export interface RoomData {
  key: string;
  users: string[];
  votes: Record<string, VoteValue | null>;
  showVotes: boolean;
  moderator: string;
  createdAt?: string;
  lastActivity?: string;
  settings: RoomSettings;
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
}