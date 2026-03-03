import type {
  AuthWorkerEnv,
  TeamAccessPolicy,
  WorkspaceTeam,
} from "@sprintjam/types";
import { sendWorkspaceInviteEmail } from "@sprintjam/services";

import { authenticateRequest, isAuthError, type AuthResult } from "../lib/auth";
import { EMAIL_REGEX } from "../lib/auth-helpers";
import {
  forbiddenResponse,
  jsonError,
  jsonResponse,
  notFoundResponse,
  unauthorizedResponse,
} from "../lib/response";
import {
  buildWorkspaceTeam,
  canAccessTeam,
  canManageTeam,
  isActiveTeamMember,
} from "../lib/team-access";

const MAX_WORKSPACE_NAME_LENGTH = 120;
const MAX_LOGO_URL_LENGTH = 500;
const MAX_TEAM_NAME_LENGTH = 100;

type WorkspaceViewer = {
  user: NonNullable<Awaited<ReturnType<AuthResult["repo"]["getUserById"]>>>;
  membership: NonNullable<
    Awaited<ReturnType<AuthResult["repo"]["getOrganisationMembership"]>>
  >;
  isWorkspaceAdmin: boolean;
};

type TeamViewer = WorkspaceViewer & {
  team: NonNullable<Awaited<ReturnType<AuthResult["repo"]["getTeamById"]>>>;
  teamMembership: Awaited<
    ReturnType<AuthResult["repo"]["getTeamMembership"]>
  > | null;
  isTeamAdmin: boolean;
  isTeamMember: boolean;
  canAccess: boolean;
};

type TeamMembershipRecord = NonNullable<
  Awaited<ReturnType<AuthResult["repo"]["getTeamMembership"]>>
>;

async function getAuthOrError(
  request: Request,
  env: AuthWorkerEnv,
): Promise<{ result: AuthResult } | { response: Response }> {
  const result = await authenticateRequest(request, env.DB);

  if (isAuthError(result)) {
    if (result.code === "unauthorized") {
      return { response: unauthorizedResponse() };
    }

    return { response: unauthorizedResponse("Session expired") };
  }

  return { result };
}

async function getWorkspaceViewer(
  result: AuthResult,
): Promise<{ viewer: WorkspaceViewer } | { response: Response }> {
  const user = await result.repo.getUserById(result.userId);
  if (!user) {
    return { response: notFoundResponse("User not found") };
  }

  const membership = await result.repo.getOrganisationMembership(
    result.userId,
    user.organisationId,
  );
  if (!membership || membership.status !== "active") {
    return { response: forbiddenResponse("Workspace access is not active") };
  }

  const isWorkspaceAdmin = await result.repo.isOrganisationAdmin(
    result.userId,
    user.organisationId,
  );

  return {
    viewer: {
      user,
      membership,
      isWorkspaceAdmin,
    },
  };
}

async function getTeamViewer(
  result: AuthResult,
  teamId: number,
): Promise<{ viewer: TeamViewer } | { response: Response }> {
  const workspace = await getWorkspaceViewer(result);
  if ("response" in workspace) {
    return workspace;
  }

  const team = await result.repo.getTeamById(teamId);
  if (!team) {
    return { response: notFoundResponse("Team not found") };
  }

  if (team.organisationId !== workspace.viewer.user.organisationId) {
    return { response: forbiddenResponse() };
  }

  const teamMembership = await result.repo.getTeamMembership(
    teamId,
    result.userId,
  );
  const isTeamMember = isActiveTeamMember(team, teamMembership, result.userId);
  const isTeamAdmin = canManageTeam(
    team,
    teamMembership,
    result.userId,
    workspace.viewer.isWorkspaceAdmin,
  );
  const canAccess = canAccessTeam(
    team,
    teamMembership,
    result.userId,
    workspace.viewer.isWorkspaceAdmin,
  );

  return {
    viewer: {
      ...workspace.viewer,
      team,
      teamMembership,
      isTeamAdmin,
      isTeamMember,
      canAccess,
    },
  };
}

async function buildTeamResponse(
  repo: AuthResult["repo"],
  viewer: WorkspaceViewer,
  team: Awaited<ReturnType<AuthResult["repo"]["getTeamById"]>>,
): Promise<WorkspaceTeam> {
  const membership = await repo.getTeamMembership(team!.id, viewer.user.id);
  return buildWorkspaceTeam(
    team!,
    membership,
    viewer.user.id,
    viewer.isWorkspaceAdmin,
  );
}

function parseAccessPolicy(value: unknown): TeamAccessPolicy | null {
  return value === "open" || value === "restricted" ? value : null;
}

function parseRole(value: unknown): "admin" | "member" | null {
  return value === "admin" || value === "member" ? value : null;
}

async function ensureNotLastWorkspaceAdmin(
  repo: AuthResult["repo"],
  organisationId: number,
  userId: number,
): Promise<Response | null> {
  const members = await repo.getOrganisationMembers(organisationId);
  const activeAdmins = members.filter(
    (member) => member.status === "active" && member.role === "admin",
  );

  if (activeAdmins.length === 1 && activeAdmins[0]?.id === userId) {
    return jsonError("At least one workspace admin is required", 409);
  }

  return null;
}

async function ensureNotLastTeamAdmin(
  repo: AuthResult["repo"],
  teamId: number,
  userId: number,
): Promise<Response | null> {
  const members = await repo.listTeamMembers(teamId);
  const activeAdmins = members.filter(
    (member) => member.status === "active" && member.role === "admin",
  );

  if (activeAdmins.length === 1 && activeAdmins[0]?.id === userId) {
    return jsonError("At least one team admin is required", 409);
  }

  return null;
}

function ensureNotTeamOwnerMembershipRemoval(
  team: TeamViewer["team"],
  memberUserId: number,
): Response | null {
  if (team.ownerId === memberUserId) {
    return jsonError("Team owner membership cannot be removed", 409);
  }

  return null;
}

async function restoreTeamMembership(
  repo: AuthResult["repo"],
  teamId: number,
  userId: number,
  membership: TeamMembershipRecord | null,
): Promise<void> {
  if (!membership) {
    await repo.removeTeamMembership(teamId, userId);
    return;
  }

  await repo.upsertTeamMembership({
    teamId,
    userId,
    role: membership.role,
    status: membership.status,
    approvedById: membership.approvedById ?? null,
  });
}

export async function listTeamsController(
  request: Request,
  env: AuthWorkerEnv,
): Promise<Response> {
  const auth = await getAuthOrError(request, env);
  if ("response" in auth) {
    return auth.response;
  }

  const workspace = await getWorkspaceViewer(auth.result);
  if ("response" in workspace) {
    return workspace.response;
  }

  const repo = auth.result.repo;
  const teams = await repo.getOrganisationTeams(
    workspace.viewer.user.organisationId,
  );
  const hydrated = await Promise.all(
    teams.map((team) => buildTeamResponse(repo, workspace.viewer, team)),
  );

  return jsonResponse({ teams: hydrated });
}

export async function createTeamController(
  request: Request,
  env: AuthWorkerEnv,
): Promise<Response> {
  const auth = await getAuthOrError(request, env);
  if ("response" in auth) {
    return auth.response;
  }

  const workspace = await getWorkspaceViewer(auth.result);
  if ("response" in workspace) {
    return workspace.response;
  }

  const body = await request.json<{
    name?: string;
    accessPolicy?: TeamAccessPolicy;
  }>();
  const name = body?.name?.trim();
  const accessPolicy = parseAccessPolicy(body?.accessPolicy) ?? "open";

  if (!name) {
    return jsonError("Team name is required", 400);
  }

  if (name.length > MAX_TEAM_NAME_LENGTH) {
    return jsonError(
      `Team name must be ${MAX_TEAM_NAME_LENGTH} characters or less`,
      400,
    );
  }

  const teamId = await auth.result.repo.createTeam(
    workspace.viewer.user.organisationId,
    name,
    workspace.viewer.user.id,
    accessPolicy,
  );
  const team = await auth.result.repo.getTeamById(teamId);

  return jsonResponse(
    {
      team: await buildTeamResponse(auth.result.repo, workspace.viewer, team),
    },
    201,
  );
}

export async function getTeamController(
  request: Request,
  env: AuthWorkerEnv,
  teamId: number,
): Promise<Response> {
  const auth = await getAuthOrError(request, env);
  if ("response" in auth) {
    return auth.response;
  }

  const teamViewer = await getTeamViewer(auth.result, teamId);
  if ("response" in teamViewer) {
    return teamViewer.response;
  }

  if (!teamViewer.viewer.canAccess) {
    return forbiddenResponse("You do not have access to this team");
  }

  return jsonResponse({
    team: await buildTeamResponse(
      auth.result.repo,
      teamViewer.viewer,
      teamViewer.viewer.team,
    ),
  });
}

export async function updateTeamController(
  request: Request,
  env: AuthWorkerEnv,
  teamId: number,
): Promise<Response> {
  const auth = await getAuthOrError(request, env);
  if ("response" in auth) {
    return auth.response;
  }

  const teamViewer = await getTeamViewer(auth.result, teamId);
  if ("response" in teamViewer) {
    return teamViewer.response;
  }

  if (!teamViewer.viewer.isTeamAdmin) {
    return forbiddenResponse("Only team admins can update the team");
  }

  const body = await request.json<{
    name?: string;
    accessPolicy?: TeamAccessPolicy;
  }>();
  const nextName = body?.name?.trim();
  const nextAccessPolicy = body?.accessPolicy
    ? parseAccessPolicy(body.accessPolicy)
    : null;

  if (!nextName && !nextAccessPolicy) {
    return jsonError("At least one field is required", 400);
  }

  if (nextName && nextName.length > MAX_TEAM_NAME_LENGTH) {
    return jsonError(
      `Team name must be ${MAX_TEAM_NAME_LENGTH} characters or less`,
      400,
    );
  }

  if (body?.accessPolicy && !nextAccessPolicy) {
    return jsonError("Invalid team access policy", 400);
  }

  await auth.result.repo.updateTeam(teamId, {
    ...(nextName ? { name: nextName } : {}),
    ...(nextAccessPolicy ? { accessPolicy: nextAccessPolicy } : {}),
  });

  const updatedTeam = await auth.result.repo.getTeamById(teamId);
  return jsonResponse({
    team: await buildTeamResponse(
      auth.result.repo,
      teamViewer.viewer,
      updatedTeam,
    ),
  });
}

export async function deleteTeamController(
  request: Request,
  env: AuthWorkerEnv,
  teamId: number,
): Promise<Response> {
  const auth = await getAuthOrError(request, env);
  if ("response" in auth) {
    return auth.response;
  }

  const teamViewer = await getTeamViewer(auth.result, teamId);
  if ("response" in teamViewer) {
    return teamViewer.response;
  }

  if (!teamViewer.viewer.isTeamAdmin) {
    return forbiddenResponse("Only team admins can delete the team");
  }

  await auth.result.repo.deleteTeam(teamId);
  return jsonResponse({ message: "Team deleted successfully" });
}

export async function listTeamMembersController(
  request: Request,
  env: AuthWorkerEnv,
  teamId: number,
): Promise<Response> {
  const auth = await getAuthOrError(request, env);
  if ("response" in auth) {
    return auth.response;
  }

  const teamViewer = await getTeamViewer(auth.result, teamId);
  if ("response" in teamViewer) {
    return teamViewer.response;
  }

  if (!teamViewer.viewer.isTeamAdmin) {
    return forbiddenResponse("Only team admins can manage team members");
  }

  const members = await auth.result.repo.listTeamMembers(teamId);
  return jsonResponse({ members });
}

export async function addTeamMemberController(
  request: Request,
  env: AuthWorkerEnv,
  teamId: number,
): Promise<Response> {
  const auth = await getAuthOrError(request, env);
  if ("response" in auth) {
    return auth.response;
  }

  const teamViewer = await getTeamViewer(auth.result, teamId);
  if ("response" in teamViewer) {
    return teamViewer.response;
  }

  if (!teamViewer.viewer.isTeamAdmin) {
    return forbiddenResponse("Only team admins can manage team members");
  }

  const body = await request.json<{
    userId?: number;
    role?: "admin" | "member";
  }>();
  const userId = body?.userId;
  const role = parseRole(body?.role) ?? "member";

  if (!userId || !Number.isInteger(userId) || userId <= 0) {
    return jsonError("Valid userId is required", 400);
  }

  const member = await auth.result.repo.getUserById(userId);
  if (
    !member ||
    member.organisationId !== teamViewer.viewer.user.organisationId
  ) {
    return notFoundResponse("Workspace member not found");
  }

  const workspaceMembership = await auth.result.repo.getOrganisationMembership(
    userId,
    member.organisationId,
  );
  if (!workspaceMembership || workspaceMembership.status !== "active") {
    return jsonError("User must be an active workspace member", 409);
  }

  await auth.result.repo.upsertTeamMembership({
    teamId,
    userId,
    role,
    status: "active",
    approvedById: auth.result.userId,
  });

  const members = await auth.result.repo.listTeamMembers(teamId);
  const created = members.find((teamMember) => teamMember.id === userId);
  return jsonResponse({ member: created }, 201);
}

export async function requestTeamAccessController(
  request: Request,
  env: AuthWorkerEnv,
  teamId: number,
): Promise<Response> {
  const auth = await getAuthOrError(request, env);
  if ("response" in auth) {
    return auth.response;
  }

  const workspace = await getWorkspaceViewer(auth.result);
  if ("response" in workspace) {
    return workspace.response;
  }

  const team = await auth.result.repo.getTeamById(teamId);
  if (!team) {
    return notFoundResponse("Team not found");
  }

  if (team.organisationId !== workspace.viewer.user.organisationId) {
    return forbiddenResponse();
  }

  if (workspace.viewer.isWorkspaceAdmin) {
    return jsonError("Workspace admins already have access to all teams", 409);
  }

  if (team.accessPolicy === "open") {
    return jsonError("Open teams do not require an access request", 409);
  }

  const existingMembership = await auth.result.repo.getTeamMembership(
    teamId,
    auth.result.userId,
  );

  if (existingMembership?.status === "active") {
    return jsonError("You already have access to this team", 409);
  }

  if (existingMembership?.status === "pending") {
    return jsonResponse({ member: existingMembership }, 202);
  }

  await auth.result.repo.upsertTeamMembership({
    teamId,
    userId: auth.result.userId,
    role: "member",
    status: "pending",
  });

  const membership = await auth.result.repo.getTeamMembership(
    teamId,
    auth.result.userId,
  );
  return jsonResponse({ member: membership }, 202);
}

export async function approveTeamMemberController(
  request: Request,
  env: AuthWorkerEnv,
  teamId: number,
  memberUserId: number,
): Promise<Response> {
  const auth = await getAuthOrError(request, env);
  if ("response" in auth) {
    return auth.response;
  }

  const teamViewer = await getTeamViewer(auth.result, teamId);
  if ("response" in teamViewer) {
    return teamViewer.response;
  }

  if (!teamViewer.viewer.isTeamAdmin) {
    return forbiddenResponse("Only team admins can manage team members");
  }

  const membership = await auth.result.repo.getTeamMembership(
    teamId,
    memberUserId,
  );
  if (!membership) {
    return notFoundResponse("Team member not found");
  }

  await auth.result.repo.approveTeamMembership(
    teamId,
    memberUserId,
    auth.result.userId,
  );

  const members = await auth.result.repo.listTeamMembers(teamId);
  const member = members.find((teamMember) => teamMember.id === memberUserId);
  return jsonResponse({ member });
}

export async function updateTeamMemberController(
  request: Request,
  env: AuthWorkerEnv,
  teamId: number,
  memberUserId: number,
): Promise<Response> {
  const auth = await getAuthOrError(request, env);
  if ("response" in auth) {
    return auth.response;
  }

  const teamViewer = await getTeamViewer(auth.result, teamId);
  if ("response" in teamViewer) {
    return teamViewer.response;
  }

  if (!teamViewer.viewer.isTeamAdmin) {
    return forbiddenResponse("Only team admins can manage team members");
  }

  const body = await request.json<{ role?: "admin" | "member" }>();
  const role = parseRole(body?.role);
  if (!role) {
    return jsonError("Valid role is required", 400);
  }

  const membership = await auth.result.repo.getTeamMembership(
    teamId,
    memberUserId,
  );
  if (!membership || membership.status !== "active") {
    return notFoundResponse("Active team member not found");
  }

  if (membership.role === "admin" && role === "member") {
    const lastAdminResponse = await ensureNotLastTeamAdmin(
      auth.result.repo,
      teamId,
      memberUserId,
    );
    if (lastAdminResponse) {
      return lastAdminResponse;
    }
  }

  await auth.result.repo.updateTeamMembershipRole(teamId, memberUserId, role);

  const members = await auth.result.repo.listTeamMembers(teamId);
  const member = members.find((teamMember) => teamMember.id === memberUserId);
  return jsonResponse({ member });
}

export async function removeTeamMemberController(
  request: Request,
  env: AuthWorkerEnv,
  teamId: number,
  memberUserId: number,
): Promise<Response> {
  const auth = await getAuthOrError(request, env);
  if ("response" in auth) {
    return auth.response;
  }

  const teamViewer = await getTeamViewer(auth.result, teamId);
  if ("response" in teamViewer) {
    return teamViewer.response;
  }

  if (!teamViewer.viewer.isTeamAdmin) {
    return forbiddenResponse("Only team admins can manage team members");
  }

  const membership = await auth.result.repo.getTeamMembership(
    teamId,
    memberUserId,
  );
  if (!membership) {
    return notFoundResponse("Team member not found");
  }

  const ownerRemovalResponse = ensureNotTeamOwnerMembershipRemoval(
    teamViewer.viewer.team,
    memberUserId,
  );
  if (ownerRemovalResponse) {
    return ownerRemovalResponse;
  }

  if (membership.role === "admin") {
    const lastAdminResponse = await ensureNotLastTeamAdmin(
      auth.result.repo,
      teamId,
      memberUserId,
    );
    if (lastAdminResponse) {
      return lastAdminResponse;
    }
  }

  await auth.result.repo.removeTeamMembership(teamId, memberUserId);
  return jsonResponse({ message: "Team member removed" });
}

export async function moveTeamMemberController(
  request: Request,
  env: AuthWorkerEnv,
  sourceTeamId: number,
  memberUserId: number,
): Promise<Response> {
  const auth = await getAuthOrError(request, env);
  if ("response" in auth) {
    return auth.response;
  }

  const workspace = await getWorkspaceViewer(auth.result);
  if ("response" in workspace) {
    return workspace.response;
  }

  const body = await request.json<{
    targetTeamId?: number;
    role?: "admin" | "member";
  }>();
  const targetTeamId = body?.targetTeamId;

  if (!targetTeamId || !Number.isInteger(targetTeamId) || targetTeamId <= 0) {
    return jsonError("Valid targetTeamId is required", 400);
  }

  if (targetTeamId === sourceTeamId) {
    return jsonError("Source and target teams must be different", 400);
  }

  const [sourceTeam, targetTeam] = await Promise.all([
    auth.result.repo.getTeamById(sourceTeamId),
    auth.result.repo.getTeamById(targetTeamId),
  ]);

  if (!sourceTeam) {
    return notFoundResponse("Source team not found");
  }

  if (!targetTeam) {
    return notFoundResponse("Target team not found");
  }

  if (
    sourceTeam.organisationId !== workspace.viewer.user.organisationId ||
    targetTeam.organisationId !== workspace.viewer.user.organisationId
  ) {
    return forbiddenResponse();
  }

  const [sourceViewerMembership, targetViewerMembership] = await Promise.all([
    auth.result.repo.getTeamMembership(sourceTeamId, auth.result.userId),
    auth.result.repo.getTeamMembership(targetTeamId, auth.result.userId),
  ]);

  const canManageSource = canManageTeam(
    sourceTeam,
    sourceViewerMembership,
    auth.result.userId,
    workspace.viewer.isWorkspaceAdmin,
  );
  const canManageTarget = canManageTeam(
    targetTeam,
    targetViewerMembership,
    auth.result.userId,
    workspace.viewer.isWorkspaceAdmin,
  );

  if (!canManageSource || !canManageTarget) {
    return forbiddenResponse(
      "Only team admins can move team members between teams",
    );
  }

  const sourceMembership = await auth.result.repo.getTeamMembership(
    sourceTeamId,
    memberUserId,
  );
  if (!sourceMembership || sourceMembership.status !== "active") {
    return notFoundResponse("Active team member not found");
  }

  const ownerRemovalResponse = ensureNotTeamOwnerMembershipRemoval(
    sourceTeam,
    memberUserId,
  );
  if (ownerRemovalResponse) {
    return ownerRemovalResponse;
  }

  if (sourceMembership.role === "admin") {
    const lastAdminResponse = await ensureNotLastTeamAdmin(
      auth.result.repo,
      sourceTeamId,
      memberUserId,
    );
    if (lastAdminResponse) {
      return lastAdminResponse;
    }
  }

  const member = await auth.result.repo.getUserById(memberUserId);
  if (
    !member ||
    member.organisationId !== workspace.viewer.user.organisationId
  ) {
    return notFoundResponse("Workspace member not found");
  }

  const workspaceMembership = await auth.result.repo.getOrganisationMembership(
    memberUserId,
    member.organisationId,
  );
  if (!workspaceMembership || workspaceMembership.status !== "active") {
    return jsonError("User must be an active workspace member", 409);
  }

  const role = parseRole(body?.role) ?? sourceMembership.role;
  const targetMembership = await auth.result.repo.getTeamMembership(
    targetTeamId,
    memberUserId,
  );

  await auth.result.repo.upsertTeamMembership({
    teamId: targetTeamId,
    userId: memberUserId,
    role,
    status: "active",
    approvedById: auth.result.userId,
  });

  try {
    await auth.result.repo.removeTeamMembership(sourceTeamId, memberUserId);
  } catch (error) {
    try {
      await restoreTeamMembership(
        auth.result.repo,
        targetTeamId,
        memberUserId,
        targetMembership ?? null,
      );
    } catch (rollbackError) {
      console.error("Failed to rollback moved team member", rollbackError);
    }

    console.error("Failed to move team member", error);
    return jsonError("Unable to move team member", 500);
  }

  const members = await auth.result.repo.listTeamMembers(targetTeamId);
  const movedMember = members.find((teamMember) => teamMember.id === memberUserId);

  return jsonResponse({ member: movedMember, message: "Team member moved" });
}

export async function listTeamSessionsController(
  request: Request,
  env: AuthWorkerEnv,
  teamId: number,
): Promise<Response> {
  const auth = await getAuthOrError(request, env);
  if ("response" in auth) {
    return auth.response;
  }

  const teamViewer = await getTeamViewer(auth.result, teamId);
  if ("response" in teamViewer) {
    return teamViewer.response;
  }

  if (!teamViewer.viewer.canAccess) {
    return forbiddenResponse("You do not have access to team sessions");
  }

  const sessions = await auth.result.repo.getTeamSessions(teamId);
  return jsonResponse({ sessions });
}

export async function createTeamSessionController(
  request: Request,
  env: AuthWorkerEnv,
  teamId: number,
): Promise<Response> {
  const auth = await getAuthOrError(request, env);
  if ("response" in auth) {
    return auth.response;
  }

  const teamViewer = await getTeamViewer(auth.result, teamId);
  if ("response" in teamViewer) {
    return teamViewer.response;
  }

  if (!teamViewer.viewer.canAccess) {
    return forbiddenResponse(
      "You must be a team member to create sessions in this team",
    );
  }

  const body = await request.json<{
    name?: string;
    roomKey?: string;
    metadata?: Record<string, unknown>;
  }>();
  const name = body?.name?.trim();
  const roomKey = body?.roomKey?.trim();

  if (!name) {
    return jsonError("Session name is required", 400);
  }

  if (!roomKey) {
    return jsonError("Room key is required", 400);
  }

  if (body?.metadata) {
    const metadataString = JSON.stringify(body.metadata);
    if (metadataString.length > 10000) {
      return jsonError("Metadata is too large (max 10KB)", 400);
    }
  }

  const sessionId = await auth.result.repo.createTeamSession(
    teamId,
    roomKey,
    name,
    auth.result.userId,
    body?.metadata,
  );
  const session = await auth.result.repo.getTeamSessionById(sessionId);

  return jsonResponse({ session }, 201);
}

export async function getTeamSessionController(
  request: Request,
  env: AuthWorkerEnv,
  teamId: number,
  sessionId: number,
): Promise<Response> {
  const auth = await getAuthOrError(request, env);
  if ("response" in auth) {
    return auth.response;
  }

  const teamViewer = await getTeamViewer(auth.result, teamId);
  if ("response" in teamViewer) {
    return teamViewer.response;
  }

  if (!teamViewer.viewer.canAccess) {
    return forbiddenResponse("You do not have access to team sessions");
  }

  const session = await auth.result.repo.getTeamSessionById(sessionId);
  if (!session || session.teamId !== teamId) {
    return notFoundResponse("Session not found");
  }

  return jsonResponse({ session });
}

export async function completeSessionByRoomKeyController(
  request: Request,
  env: AuthWorkerEnv,
): Promise<Response> {
  const auth = await getAuthOrError(request, env);
  if ("response" in auth) {
    return auth.response;
  }

  const workspace = await getWorkspaceViewer(auth.result);
  if ("response" in workspace) {
    return workspace.response;
  }

  const body = await request.json<{ roomKey?: string }>();
  const roomKey = body?.roomKey?.trim();
  if (!roomKey) {
    return jsonError("Room key is required", 400);
  }

  const repo = auth.result.repo;
  const updatedSession = await repo.completeLatestSessionByRoomKey(
    roomKey,
    workspace.viewer.user.organisationId,
    auth.result.userId,
    workspace.viewer.isWorkspaceAdmin,
  );

  if (!updatedSession) {
    return notFoundResponse("Session not found");
  }

  return jsonResponse({ session: updatedSession });
}

export async function getWorkspaceStatsController(
  request: Request,
  env: AuthWorkerEnv,
): Promise<Response> {
  const auth = await getAuthOrError(request, env);
  if ("response" in auth) {
    return auth.response;
  }

  const workspace = await getWorkspaceViewer(auth.result);
  if ("response" in workspace) {
    return workspace.response;
  }

  const repo = auth.result.repo;
  const stats = await repo.getWorkspaceStats(
    workspace.viewer.user.organisationId,
    auth.result.userId,
    workspace.viewer.isWorkspaceAdmin,
  );

  return jsonResponse(stats);
}

export async function getWorkspaceProfileController(
  request: Request,
  env: AuthWorkerEnv,
): Promise<Response> {
  const auth = await getAuthOrError(request, env);
  if ("response" in auth) {
    return auth.response;
  }

  const workspace = await getWorkspaceViewer(auth.result);
  if ("response" in workspace) {
    return workspace.response;
  }

  const organisation = await auth.result.repo.getOrganisationById(
    workspace.viewer.user.organisationId,
  );
  if (!organisation) {
    return notFoundResponse("Organisation not found");
  }

  const members = (
    await auth.result.repo.getOrganisationMembers(
      workspace.viewer.user.organisationId,
    )
  ).filter(
    (member) => member.status === "active" || workspace.viewer.isWorkspaceAdmin,
  );
  const invites = workspace.viewer.isWorkspaceAdmin
    ? await auth.result.repo.listPendingWorkspaceInvites(
        workspace.viewer.user.organisationId,
      )
    : [];

  return jsonResponse({
    membership: workspace.viewer.membership,
    organisation,
    members,
    invites,
  });
}

export async function updateWorkspaceProfileController(
  request: Request,
  env: AuthWorkerEnv,
): Promise<Response> {
  const auth = await getAuthOrError(request, env);
  if ("response" in auth) {
    return auth.response;
  }

  const workspace = await getWorkspaceViewer(auth.result);
  if ("response" in workspace) {
    return workspace.response;
  }

  if (!workspace.viewer.isWorkspaceAdmin) {
    return forbiddenResponse(
      "Only workspace admins can update workspace profile",
    );
  }

  const body = await request.json<{
    name?: string;
    logoUrl?: string | null;
    requireMemberApproval?: boolean;
  }>();
  const nextName = body?.name?.trim();
  const hasNameUpdate = typeof nextName === "string";
  const hasLogoUpdate = Object.prototype.hasOwnProperty.call(body, "logoUrl");
  const hasApprovalUpdate = typeof body?.requireMemberApproval === "boolean";

  if (!hasNameUpdate && !hasLogoUpdate && !hasApprovalUpdate) {
    return jsonError("At least one field is required", 400);
  }

  if (hasNameUpdate) {
    if (!nextName) {
      return jsonError("Workspace name is required", 400);
    }

    if (nextName.length > MAX_WORKSPACE_NAME_LENGTH) {
      return jsonError(
        `Workspace name must be ${MAX_WORKSPACE_NAME_LENGTH} characters or less`,
        400,
      );
    }
  }

  let normalizedLogoUrl: string | null | undefined;
  if (hasLogoUpdate) {
    if (body.logoUrl === null) {
      normalizedLogoUrl = null;
    } else {
      const trimmed = body.logoUrl?.trim() ?? "";
      if (!trimmed) {
        normalizedLogoUrl = null;
      } else {
        if (trimmed.length > MAX_LOGO_URL_LENGTH) {
          return jsonError(
            `Logo URL must be ${MAX_LOGO_URL_LENGTH} characters or less`,
            400,
          );
        }

        let parsed: URL;
        try {
          parsed = new URL(trimmed);
        } catch {
          return jsonError("Logo URL must be a valid URL", 400);
        }

        if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
          return jsonError("Logo URL must start with http:// or https://", 400);
        }

        normalizedLogoUrl = parsed.toString();
      }
    }
  }

  await auth.result.repo.updateOrganisation(
    workspace.viewer.user.organisationId,
    {
      ...(hasNameUpdate ? { name: nextName } : {}),
      ...(hasLogoUpdate ? { logoUrl: normalizedLogoUrl ?? null } : {}),
      ...(hasApprovalUpdate
        ? { requireMemberApproval: body.requireMemberApproval }
        : {}),
    },
  );

  const organisation = await auth.result.repo.getOrganisationById(
    workspace.viewer.user.organisationId,
  );
  return jsonResponse({ organisation });
}

export async function approveWorkspaceMemberController(
  request: Request,
  env: AuthWorkerEnv,
  memberUserId: number,
): Promise<Response> {
  const auth = await getAuthOrError(request, env);
  if ("response" in auth) {
    return auth.response;
  }

  const workspace = await getWorkspaceViewer(auth.result);
  if ("response" in workspace) {
    return workspace.response;
  }

  if (!workspace.viewer.isWorkspaceAdmin) {
    return forbiddenResponse("Only workspace admins can manage members");
  }

  const membership = await auth.result.repo.getOrganisationMembership(
    memberUserId,
    workspace.viewer.user.organisationId,
  );
  if (!membership) {
    return notFoundResponse("Workspace member not found");
  }

  await auth.result.repo.approveWorkspaceMembership(
    workspace.viewer.user.organisationId,
    memberUserId,
    auth.result.userId,
  );

  const members = await auth.result.repo.getOrganisationMembers(
    workspace.viewer.user.organisationId,
  );
  const member = members.find(
    (workspaceMember) => workspaceMember.id === memberUserId,
  );
  return jsonResponse({ member });
}

export async function updateWorkspaceMemberController(
  request: Request,
  env: AuthWorkerEnv,
  memberUserId: number,
): Promise<Response> {
  const auth = await getAuthOrError(request, env);
  if ("response" in auth) {
    return auth.response;
  }

  const workspace = await getWorkspaceViewer(auth.result);
  if ("response" in workspace) {
    return workspace.response;
  }

  if (!workspace.viewer.isWorkspaceAdmin) {
    return forbiddenResponse("Only workspace admins can manage members");
  }

  const body = await request.json<{ role?: "admin" | "member" }>();
  const role = parseRole(body?.role);
  if (!role) {
    return jsonError("Valid role is required", 400);
  }

  const membership = await auth.result.repo.getOrganisationMembership(
    memberUserId,
    workspace.viewer.user.organisationId,
  );
  if (!membership || membership.status !== "active") {
    return notFoundResponse("Active workspace member not found");
  }

  if (membership.role === "admin" && role === "member") {
    const lastAdminResponse = await ensureNotLastWorkspaceAdmin(
      auth.result.repo,
      workspace.viewer.user.organisationId,
      memberUserId,
    );
    if (lastAdminResponse) {
      return lastAdminResponse;
    }
  }

  await auth.result.repo.updateWorkspaceMembershipRole(
    memberUserId,
    workspace.viewer.user.organisationId,
    role,
  );

  const members = await auth.result.repo.getOrganisationMembers(
    workspace.viewer.user.organisationId,
  );
  const member = members.find(
    (workspaceMember) => workspaceMember.id === memberUserId,
  );
  return jsonResponse({ member });
}

export async function removeWorkspaceMemberController(
  request: Request,
  env: AuthWorkerEnv,
  memberUserId: number,
): Promise<Response> {
  const auth = await getAuthOrError(request, env);
  if ("response" in auth) {
    return auth.response;
  }

  const workspace = await getWorkspaceViewer(auth.result);
  if ("response" in workspace) {
    return workspace.response;
  }

  if (!workspace.viewer.isWorkspaceAdmin) {
    return forbiddenResponse("Only workspace admins can manage members");
  }

  const membership = await auth.result.repo.getOrganisationMembership(
    memberUserId,
    workspace.viewer.user.organisationId,
  );
  if (!membership) {
    return notFoundResponse("Workspace member not found");
  }

  if (membership.role === "admin") {
    const lastAdminResponse = await ensureNotLastWorkspaceAdmin(
      auth.result.repo,
      workspace.viewer.user.organisationId,
      memberUserId,
    );
    if (lastAdminResponse) {
      return lastAdminResponse;
    }
  }

  await auth.result.repo.removeUserFromTeams(memberUserId);
  await auth.result.repo.removeWorkspaceMembership(
    workspace.viewer.user.organisationId,
    memberUserId,
  );
  await auth.result.repo.invalidateSessionsForUser(memberUserId);

  return jsonResponse({ message: "Workspace member removed" });
}

export async function inviteWorkspaceMemberController(
  request: Request,
  env: AuthWorkerEnv,
): Promise<Response> {
  const auth = await getAuthOrError(request, env);
  if ("response" in auth) {
    return auth.response;
  }

  const workspace = await getWorkspaceViewer(auth.result);
  if ("response" in workspace) {
    return workspace.response;
  }

  if (!workspace.viewer.isWorkspaceAdmin) {
    return forbiddenResponse("Only workspace admins can invite members");
  }

  const body = await request.json<{ email?: string }>();
  const email = body?.email?.toLowerCase().trim();
  if (!email) {
    return jsonError("Email is required", 400);
  }

  if (!EMAIL_REGEX.test(email)) {
    return jsonError("Invalid email format", 400);
  }

  if (email === workspace.viewer.user.email.toLowerCase()) {
    return jsonError("You are already a workspace member", 409);
  }

  const existingUser = await auth.result.repo.getUserByEmail(email);
  if (
    existingUser &&
    existingUser.organisationId === workspace.viewer.user.organisationId
  ) {
    const membership = await auth.result.repo.getOrganisationMembership(
      existingUser.id,
      existingUser.organisationId,
    );

    if (membership?.status === "active") {
      return jsonError("This user is already in your workspace", 409);
    }

    if (membership?.status === "pending") {
      return jsonError("This user is already pending workspace approval", 409);
    }
  }

  const invite = await auth.result.repo.createOrUpdateWorkspaceInvite(
    workspace.viewer.user.organisationId,
    email,
    workspace.viewer.user.id,
  );
  if (!invite) {
    return jsonError("Unable to create invite", 500);
  }

  const organisation = await auth.result.repo.getOrganisationById(
    workspace.viewer.user.organisationId,
  );
  const workspaceName = organisation?.name ?? "your workspace";
  const inviterName =
    workspace.viewer.user.name?.trim() || workspace.viewer.user.email;
  const loginUrl = `${new URL(request.url).origin}/login`;

  try {
    await sendWorkspaceInviteEmail({
      email,
      workspaceName,
      inviterName,
      loginUrl,
      resendApiKey: env.RESEND_API_KEY,
    });
  } catch (error) {
    console.error("Failed to send workspace invite email:", error);
    return jsonError("Invite created but email could not be sent", 500);
  }

  return jsonResponse({ invite }, 201);
}
