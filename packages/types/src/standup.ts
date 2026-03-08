export interface LinkedTicket {
  id: string;
  key: string;
  title: string;
  url?: string;
  provider: 'jira' | 'linear' | 'github';
}

export interface StandupResponsePayload {
  yesterday: string;
  today: string;
  hasBlocker: boolean;
  blockerDescription?: string;
  healthCheck: number;
  linkedTickets?: LinkedTicket[];
}

export interface StandupResponse extends StandupResponsePayload {
  userName: string;
  submittedAt: number;
  updatedAt: number;
}

export interface StandupData {
  key: string;
  users: string[];
  moderator: string;
  connectedUsers: Record<string, boolean>;
  status: 'active' | 'locked' | 'presenting' | 'completed';
  responses: StandupResponse[]; // all for facilitator, own only for respondent
  respondedUsers: string[]; // usernames who have submitted
  userAvatars?: Record<string, string>;
  teamId?: number;
  focusedUser?: string;
}
