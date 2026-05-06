/**
 * Workspace authentication and team management types
 */
import type {
  organisations,
  teamMemberships,
  teamIntegrations,
  teamCollaborationInstallations,
  teamSessions,
  teamSettings,
  teams,
  users,
  workspaceActionEvents,
  workspaceActionItems,
  workspaceInvites,
  workspaceMemberships,
  workspaceProcessLoops,
  workspaceSessionLinks,
} from "@sprintjam/db";
import type { RoomSettings, RoundTransitionType } from "./room";
import type { OAuthProvider } from "./external";
import type { WheelMode } from "./wheel";
import type { LinkedTicket } from "./standup";

export type Team = typeof teams.$inferSelect;
export type TeamMembershipRow = typeof teamMemberships.$inferSelect;
export type TeamSession = typeof teamSessions.$inferSelect;
export type TeamSettingsRow = typeof teamSettings.$inferSelect;
export type TeamIntegrationRow = typeof teamIntegrations.$inferSelect;
export type TeamCollaborationInstallationRow =
  typeof teamCollaborationInstallations.$inferSelect;
export type WorkspaceProcessLoop = typeof workspaceProcessLoops.$inferSelect;
export type WorkspaceSessionLink = typeof workspaceSessionLinks.$inferSelect;
export type WorkspaceActionItem = typeof workspaceActionItems.$inferSelect;
export type WorkspaceActionEvent = typeof workspaceActionEvents.$inferSelect;
export type User = typeof users.$inferSelect;
export type Organisation = typeof organisations.$inferSelect;
export type WorkspaceInvite = typeof workspaceInvites.$inferSelect;
export type WorkspaceMembershipRow = typeof workspaceMemberships.$inferSelect;
export type WorkspaceRole = WorkspaceMembershipRow["role"];
export type MembershipStatus = WorkspaceMembershipRow["status"];
export type TeamRole = TeamMembershipRow["role"];
export type TeamAccessPolicy = Team["accessPolicy"];

export interface WorkspacePaginationMeta {
  limit: number;
  offset: number;
  total: number;
  hasMore: boolean;
  nextOffset: number | null;
}

export type WorkspaceTeamSessionType = "planning" | "standup" | "wheel";
export type WorkspaceTeamSessionFilter = "all" | WorkspaceTeamSessionType;

export type WorkspaceProcessLoopStatus =
  WorkspaceProcessLoop["status"];
export type WorkspaceActionSource = WorkspaceActionItem["source"];
export type WorkspaceActionStatus = WorkspaceActionItem["status"];
export type WorkspaceActionPriority = WorkspaceActionItem["priority"];

export type WorkspaceActionStatusFilter = "all" | WorkspaceActionStatus;
export type WorkspaceActionSourceFilter = "all" | WorkspaceActionSource;

export type TeamSessionCounts = Record<WorkspaceTeamSessionFilter, number>;

export interface TeamSessionsPage {
  sessions: TeamSession[];
  pagination: WorkspacePaginationMeta;
  counts: TeamSessionCounts;
}

export interface WorkspaceActionFilters {
  status?: WorkspaceActionStatusFilter;
  source?: WorkspaceActionSourceFilter;
  processLoopId?: number;
}

export interface WorkspaceActionsPage {
  actions: WorkspaceActionItem[];
  pagination: WorkspacePaginationMeta;
  counts: Record<WorkspaceActionStatusFilter, number>;
}

export interface CreateWorkspaceProcessLoopInput {
  key?: string;
  name: string;
  goal?: string | null;
  status?: WorkspaceProcessLoopStatus;
  startsAt?: number | null;
  endsAt?: number | null;
}

export interface CreateWorkspaceActionInput {
  processLoopId?: number | null;
  source?: WorkspaceActionSource;
  sourceSessionId?: number | null;
  sourceRef?: string;
  title: string;
  detail?: string | null;
  priority?: WorkspaceActionPriority;
  ownerUserId?: number | null;
  ownerName?: string | null;
  dueAt?: number | null;
  externalProvider?: string | null;
  externalTicketKey?: string | null;
  externalTicketUrl?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface UpdateWorkspaceActionInput {
  processLoopId?: number | null;
  title?: string;
  detail?: string | null;
  status?: WorkspaceActionStatus;
  priority?: WorkspaceActionPriority;
  ownerUserId?: number | null;
  ownerName?: string | null;
  dueAt?: number | null;
  externalProvider?: string | null;
  externalTicketKey?: string | null;
  externalTicketUrl?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface CreateWorkspaceActionEventInput {
  eventType?: WorkspaceActionEvent["eventType"];
  note?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface RecordStandupWorkspaceActionsInput {
  roomKey: string;
  blockers: Array<{
    userName: string;
    description?: string | null;
    linkedTickets?: LinkedTicket[];
  }>;
  nextSteps: Array<{
    userName: string;
    description?: string | null;
    linkedTickets?: LinkedTicket[];
  }>;
}

export interface RecordPlanningWorkspaceActionsInput {
  roomKey: string;
  followUps: Array<{
    title: string;
    detail?: string | null;
    ticketKey?: string | null;
  }>;
}

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

export type CollaborationPlatform = "teams" | "slack";

export interface TeamCollaborationInstallation {
  id: number;
  teamId: number;
  platform: CollaborationPlatform;
  tenantId: string;
  externalTeamId: string | null;
  externalChannelId: string | null;
  externalChatId: string | null;
  externalMeetingId: string | null;
  externalUserId: string | null;
  displayName: string | null;
  installedById: number;
  metadata: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

export interface SaveTeamsCollaborationInstallationInput {
  tenantId: string;
  externalTeamId?: string | null;
  externalChannelId?: string | null;
  externalChatId?: string | null;
  externalMeetingId?: string | null;
  externalUserId?: string | null;
  displayName?: string | null;
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

export type WorkspaceWheelMode = Extract<
  WheelMode,
  "decision" | "reviewer" | "facilitator"
>;

export interface WorkspaceWheelAutomationSuggestion {
  label: string;
  detail: string;
  provider?: OAuthProvider | CollaborationPlatform;
}

export interface WorkspaceWheelOutcome {
  id: string;
  sessionId?: number;
  mode: WorkspaceWheelMode;
  resultLabel: string;
  winner: string;
  timestamp: number;
  removedAfter: boolean;
  recordedAt: number;
  status?: "resolved";
  resolvedAt?: number;
  resolvedById?: number;
  automation: WorkspaceWheelAutomationSuggestion[];
}

export interface WorkspaceStats {
  totalTeams: number;
  totalSessions: number;
  activeSessions: number;
  completedSessions: number;
  sessionTypeCounts: TeamSessionCounts;
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
