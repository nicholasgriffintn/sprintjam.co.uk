import type {
  MembershipStatus,
  TeamRole,
  WorkspaceTeam,
} from "@sprintjam/types";

type TeamLike = {
  id: number;
  ownerId: number;
  accessPolicy: "open" | "restricted";
};

type WorkspaceTeamSource = Omit<
  WorkspaceTeam,
  "currentUserRole" | "currentUserStatus" | "canAccess" | "canManage"
>;

type TeamMembershipLike = {
  role: TeamRole;
  status: MembershipStatus;
} | null | undefined;

export function isActiveTeamMember(
  team: TeamLike,
  membership: TeamMembershipLike,
  userId: number,
): boolean {
  return membership?.status === "active" || team.ownerId === userId;
}

export function canAccessTeam(
  team: TeamLike,
  membership: TeamMembershipLike,
  userId: number,
  isWorkspaceAdmin: boolean,
): boolean {
  return (
    isWorkspaceAdmin ||
    team.accessPolicy === "open" ||
    isActiveTeamMember(team, membership, userId)
  );
}

export function canManageTeam(
  team: TeamLike,
  membership: TeamMembershipLike,
  userId: number,
  isWorkspaceAdmin: boolean,
): boolean {
  return (
    isWorkspaceAdmin ||
    membership?.role === "admin" ||
    team.ownerId === userId
  );
}

export function buildWorkspaceTeam(
  team: WorkspaceTeamSource,
  membership: TeamMembershipLike,
  userId: number,
  isWorkspaceAdmin: boolean,
): WorkspaceTeam {
  return {
    ...team,
    currentUserRole: membership?.role ?? null,
    currentUserStatus: membership?.status ?? null,
    canAccess: canAccessTeam(team, membership, userId, isWorkspaceAdmin),
    canManage: canManageTeam(team, membership, userId, isWorkspaceAdmin),
  };
}
