export interface LinkedTicket {
  id: string;
  key: string;
  title: string;
  url?: string;
  provider: "jira" | "linear" | "github";
}

export interface StandupResponsePayload {
  isInPerson?: boolean;
  yesterday?: string;
  today?: string;
  hasBlocker: boolean;
  blockerDescription?: string;
  healthCheck: number;
  isHealthCheckPrivate?: boolean;
  linkedTickets?: LinkedTicket[];
  kudos?: string;
  icebreakerAnswer?: string;
  icebreakerQuestion?: string;
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
  status: "active" | "locked" | "presenting" | "completed";
  responses: StandupResponse[];
  respondedUsers: string[];
  userAvatars?: Record<string, string>;
  teamId?: number;
  focusedUser?: string;
  reactions?: Record<string, Record<string, string[]>>;
}
