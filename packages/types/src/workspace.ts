/**
 * Workspace authentication and team management types
 */
import type {
  organisations,
  teamMemberships,
  teamIntegrations,
  teamSessions,
  teamSettings,
  teams,
  users,
  workspaceInvites,
  workspaceMemberships,
} from "@sprintjam/db";
import type { RoomSettings, RoundTransitionType } from "./room";
import type { OAuthProvider } from "./external";

export type Team = typeof teams.$inferSelect;
export type TeamMembershipRow = typeof teamMemberships.$inferSelect;
export type TeamSession = typeof teamSessions.$inferSelect;
export type TeamSettingsRow = typeof teamSettings.$inferSelect;
export type TeamIntegrationRow = typeof teamIntegrations.$inferSelect;
export type User = typeof users.$inferSelect;
export type Organisation = typeof organisations.$inferSelect;
export type WorkspaceInvite = typeof workspaceInvites.$inferSelect;
export type WorkspaceMembershipRow = typeof workspaceMemberships.$inferSelect;
export type WorkspaceRole = WorkspaceMembershipRow["role"];
export type MembershipStatus = WorkspaceMembershipRow["status"];
export type TeamRole = TeamMembershipRow["role"];
export type TeamAccessPolicy = Team["accessPolicy"];

export interface TeamWithSettings extends Team {
  settings?: RoomSettings;
}

export interface TeamIntegrationStatus {
  provider: OAuthProvider;
  connected: boolean;
  authorizedBy?: string;
  expiresAt?: number;
  metadata?: Record<string, unknown>;
}

export type WorkspaceUser = Pick<
  User,
  "id" | "email" | "name" | "organisationId" | "avatar"
>;
export type WorkspaceMembershipSummary = Pick<
  WorkspaceMembershipRow,
  "role" | "status"
>;
export type WorkspaceOrganisation = Organisation;
export type WorkspaceMember = Pick<
  User,
  "id" | "email" | "name" | "avatar" | "createdAt" | "lastLoginAt"
> & {
  role: WorkspaceRole;
  status: MembershipStatus;
  approvedAt: number | null;
};

export type TeamMember = Pick<
  User,
  "id" | "email" | "name" | "avatar" | "createdAt" | "lastLoginAt"
> & {
  role: TeamRole;
  status: MembershipStatus;
  approvedAt: number | null;
};

export type WorkspaceTeam = Team & {
  currentUserRole: TeamRole | null;
  currentUserStatus: MembershipStatus | null;
  canAccess: boolean;
  canManage: boolean;
};

export interface SessionTimelineData {
  period: string;
  yearMonth: string;
  count: number;
  avgConsensusRate?: number;
  avgVelocity?: number | null;
  totalVotes?: number;
}

export interface WorkspaceStats {
  totalTeams: number;
  totalSessions: number;
  activeSessions: number;
  completedSessions: number;
  sessionTimeline: SessionTimelineData[];
}

export interface WorkspaceAuthProfile {
  user: WorkspaceUser;
  membership: WorkspaceMembershipSummary;
  teams: WorkspaceTeam[];
}

export interface WorkspaceProfile {
  membership: WorkspaceMembershipRow;
  organisation: WorkspaceOrganisation;
  members: WorkspaceMember[];
  invites: WorkspaceInvite[];
}

export interface TeamInsights {
  sessionsAnalyzed: number;
  totalTickets: number;
  totalRounds: number;
  participationRate: number;
  firstRoundConsensusRate: number;
  discussionRate: number;
  estimationVelocity: number | null;
  questionMarkRate: number;
}

export interface WorkspaceInsightsContributor {
  userName: string;
  totalVotes: number;
  participationRate: number;
  consensusAlignment: number;
}

export interface WorkspaceInsights {
  totalVotes: number;
  totalRounds: number;
  totalTickets: number;
  participationRate: number;
  firstRoundConsensusRate: number;
  discussionRate: number;
  estimationVelocity: number | null;
  questionMarkRate: number;
  teamCount: number;
  sessionsAnalyzed: number;
  topContributors: WorkspaceInsightsContributor[];
}

export interface SessionStats {
  roomKey: string;
  totalRounds: number;
  totalVotes: number;
  uniqueParticipants: number;
  participationRate: number;
  consensusRate: number;
  firstRoundConsensusRate: number;
  discussionRate: number;
  estimationVelocity: number | null;
  durationMinutes: number | null;
}

export interface RoundIngestVote {
  userName: string;
  vote: string;
  structuredVote?: object;
  votedAt: number;
}

export interface RoundIngestPayload {
  roomKey: string;
  roundId: string;
  ticketId?: string;
  votes: RoundIngestVote[];
  judgeScore?: string;
  judgeMetadata?: object;
  roundEndedAt: number;
  type: Extract<RoundTransitionType, "reset" | "next_ticket">;
}
