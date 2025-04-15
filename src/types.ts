export type VoteValue = '1' | '2' | '3' | '5' | '8' | '13' | '21' | '?';

export interface RoomData {
  key: string;
  users: string[];
  votes: Record<string, VoteValue | null>;
  showVotes: boolean;
  moderator: string;
}

export interface WebSocketErrorData {
  error?: string;
  message?: string;
} 