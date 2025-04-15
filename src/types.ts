export type VoteValue = '1' | '2' | '3' | '5' | '8' | '13' | '21' | '?';

export interface RoomData {
  key: string;
  users: string[];
  votes: Record<string, VoteValue | null>;
  showVotes: boolean;
  moderator: string;
  createdAt?: string;
  lastActivity?: string;
}

export interface WebSocketErrorData {
  error?: string;
  message?: string;
  code?: number;
}

export interface WebSocketMessage {
  type: string;
  roomData?: RoomData;
  error?: string;
  message?: string;
}