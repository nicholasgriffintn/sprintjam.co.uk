/**
 * Workspace authentication and team management types
 */
import type {
  organisations,
  teamSessions,
  teams,
  users,
  workspaceInvites,
} from "@sprintjam/db";
import type { RoundTransitionType } from "./room";

export type Team = typeof teams.$inferSelect;
export type TeamSession = typeof teamSessions.$inferSelect;
export type User = typeof users.$inferSelect;
export type Organisation = typeof organisations.$inferSelect;
export type WorkspaceInvite = typeof workspaceInvites.$inferSelect;

export type WorkspaceUser = Pick<
  User,
  "id" | "email" | "name" | "organisationId"
>;
export type WorkspaceOrganisation = Organisation;
export type WorkspaceMember = Pick<
  User,
  "id" | "email" | "name" | "createdAt" | "lastLoginAt"
>;

export interface SessionTimelineData {
  period: string;
  yearMonth: string;
  count: number;
}

export interface WorkspaceStats {
  totalTeams: number;
  totalSessions: number;
  activeSessions: number;
  completedSessions: number;
  sessionTimeline: SessionTimelineData[];
}

export interface WorkspaceProfile {
  user: WorkspaceUser;
  organisation: WorkspaceOrganisation;
  teams: Team[];
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
