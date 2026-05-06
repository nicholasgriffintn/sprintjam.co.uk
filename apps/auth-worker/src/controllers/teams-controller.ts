import type {
  AuthWorkerEnv,
  TeamAccessPolicy,
  WorkspaceTeam,
  WorkspaceTeamSessionFilter,
} from "@sprintjam/types";
import { sendWorkspaceInviteEmail } from "@sprintjam/services";
import {
  buildPaginationMeta,
  isPaginationError,
  normaliseOptionalString,
  parsePagination,
  resolveTeamSessionRecapAction,
  type LinkedSessionRecapActionKind,
} from "@sprintjam/utils";

import type { AuthResult } from "../lib/auth";
import { EMAIL_REGEX } from "../lib/auth-helpers";
import {
  forbiddenResponse,
  jsonError,
  jsonResponse,
  notFoundResponse,
} from "../lib/response";
import { buildWorkspaceTeam, canManageTeam } from "../lib/team-access";
import { normalizeOptionalHttpUrl } from "../lib/url-validation";
import { parseTeamSessionMetadata } from "./controller-parsing";
import { applySessionProcessLoopMetadata } from "./workspace-action-controllers";
import {
  getAuthOrError,
  getTeamViewer,
  getWorkspaceViewer,
  type TeamViewer,
  type WorkspaceViewer,
} from "./workspace-viewer";

const MAX_WORKSPACE_NAME_LENGTH = 120;
const MAX_LOGO_URL_LENGTH = 500;
const MAX_TEAM_NAME_LENGTH = 100;
const MAX_SESSION_NAME_LENGTH = 200;
const MAX_ROOM_KEY_LENGTH = 100;
const DEFAULT_TEAM_SESSIONS_LIMIT = 20;
const TEAM_SESSION_FILTERS = new Set<WorkspaceTeamSessionFilter>([
  "all",
  "planning",
  "standup",
  "wheel",
]);
type TeamMembershipRecord = NonNullable<
  Awaited<ReturnType<AuthResult["repo"]["getTeamMembership"]>>
>;

function parseTeamSessionFilter(
  url: URL,
): WorkspaceTeamSessionFilter | { error: string } {
  const rawType = url.searchParams.get("type") ?? "all";

  if (TEAM_SESSION_FILTERS.has(rawType as WorkspaceTeamSessionFilter)) {
    return rawType as WorkspaceTeamSessionFilter;
  }

  return { error: "type must be one of all, planning, standup, or wheel" };
}

function parseRecapActionBody(body: {
  actionId?: unknown;
  kind?: unknown;
}):
  | { actionId: string; kind: LinkedSessionRecapActionKind }
  | { error: string } {
  const actionId = normaliseOptionalString(body.actionId);
  if (!actionId) {
    return { error: "Recap action id is required" };
  }

  if (body.kind === "planning_follow_up" || body.kind === "wheel_outcome") {
    return { actionId, kind: body.kind };
  }

  return {
    error: "Recap action kind must be planning_follow_up or wheel_outcome",
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

async function buildTeamResponsesBatch(
  repo: AuthResult["repo"],
  viewer: WorkspaceViewer,
  teams: Awaited<ReturnType<AuthResult["repo"]["getOrganisationTeams"]>>,
): Promise<WorkspaceTeam[]> {
  const teamIds = teams.map((t) => t.id);
  const memberships = await repo.getTeamMembershipsForUser(
    viewer.user.id,
    teamIds,
  );
  const membershipMap = new Map(memberships.map((m) => [m.teamId, m]));

  return teams.map((team) =>
    buildWorkspaceTeam(
      team,
      membershipMap.get(team.id) ?? null,
      viewer.user.id,
      viewer.isWorkspaceAdmin,
    ),
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
  const members = await repo.getOrganisationMembers(organisationId, "active");
  const activeAdmins = members.filter((member) => member.role === "admin");

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
  const hydrated = await buildTeamResponsesBatch(repo, workspace.viewer, teams);

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
    logoUrl?: string | null;
  }>();
  const name = body?.name?.trim();
  const accessPolicy = parseAccessPolicy(body?.accessPolicy) ?? "open";
  const logoUrl = normalizeOptionalHttpUrl(body?.logoUrl, {
    label: "Logo URL",
    maxLength: MAX_LOGO_URL_LENGTH,
  });

  if (!name) {
    return jsonError("Team name is required", 400);
  }

  if (name.length > MAX_TEAM_NAME_LENGTH) {
    return jsonError(
      `Team name must be ${MAX_TEAM_NAME_LENGTH} characters or less`,
      400,
    );
  }

  if (!logoUrl.ok) {
    return jsonError(logoUrl.message, 400);
  }

  const teamId = await auth.result.repo.createTeam(
    workspace.viewer.user.organisationId,
    name,
    workspace.viewer.user.id,
    accessPolicy,
    logoUrl.value,
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
    logoUrl?: string | null;
  }>();
  const nextName = body?.name?.trim();
  const nextAccessPolicy = body?.accessPolicy
    ? parseAccessPolicy(body.accessPolicy)
    : null;
  const hasLogoUpdate = Object.prototype.hasOwnProperty.call(body, "logoUrl");
  const nextLogoUrl = hasLogoUpdate
    ? normalizeOptionalHttpUrl(body.logoUrl, {
        label: "Logo URL",
        maxLength: MAX_LOGO_URL_LENGTH,
      })
    : null;

  if (!nextName && !nextAccessPolicy && !hasLogoUpdate) {
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

  if (nextLogoUrl && !nextLogoUrl.ok) {
    return jsonError(nextLogoUrl.message, 400);
  }

  await auth.result.repo.updateTeam(teamId, {
    ...(nextName ? { name: nextName } : {}),
    ...(nextAccessPolicy ? { accessPolicy: nextAccessPolicy } : {}),
    ...(nextLogoUrl?.ok ? { logoUrl: nextLogoUrl.value } : {}),
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

  const created = await auth.result.repo.getTeamMemberById(teamId, userId);
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

  if (membership.status !== "pending") {
    return jsonError("Member is not pending approval", 409);
  }

  await auth.result.repo.approveTeamMembership(
    teamId,
    memberUserId,
    auth.result.userId,
  );

  const member = await auth.result.repo.getTeamMemberById(teamId, memberUserId);
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

  const member = await auth.result.repo.getTeamMemberById(teamId, memberUserId);
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

  const movedMember = await auth.result.repo.getTeamMemberById(
    targetTeamId,
    memberUserId,
  );

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

  const url = new URL(request.url);
  const pagination = parsePagination(url, {
    defaultLimit: DEFAULT_TEAM_SESSIONS_LIMIT,
  });

  if (isPaginationError(pagination)) {
    return jsonError(pagination.error, 400);
  }

  const type = parseTeamSessionFilter(url);
  if (typeof type === "object") {
    return jsonError(type.error, 400);
  }

  const [sessions, counts] = await Promise.all([
    auth.result.repo.getTeamSessions(teamId, pagination, type),
    auth.result.repo.getTeamSessionCounts(teamId),
  ]);

  return jsonResponse({
    sessions,
    pagination: buildPaginationMeta(pagination, counts[type]),
    counts,
  });
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

  if (name.length > MAX_SESSION_NAME_LENGTH) {
    return jsonError(
      `Session name must be ${MAX_SESSION_NAME_LENGTH} characters or less`,
      400,
    );
  }

  if (!roomKey) {
    return jsonError("Room key is required", 400);
  }

  if (roomKey.length > MAX_ROOM_KEY_LENGTH) {
    return jsonError(
      `Room key must be ${MAX_ROOM_KEY_LENGTH} characters or less`,
      400,
    );
  }

  if (body?.metadata) {
    const metadataString = JSON.stringify(body.metadata);
    if (metadataString.length > 10000) {
      return jsonError("Metadata is too large (max 10KB)", 400);
    }
  }

  const existingSession =
    await auth.result.repo.getOrganisationTeamSessionByRoomKey(
      roomKey,
      teamViewer.viewer.user.organisationId,
    );
  if (existingSession) {
    return jsonError(
      "This room is already saved to your workspace",
      409,
      "session_already_linked",
    );
  }

  const sessionId = await auth.result.repo.createTeamSession(
    teamId,
    roomKey,
    name,
    auth.result.userId,
    body?.metadata,
  );
  await applySessionProcessLoopMetadata({
    repo: auth.result.repo,
    teamId,
    sessionId,
    createdById: auth.result.userId,
    metadata: body?.metadata,
  });
  const session = await auth.result.repo.getTeamSessionById(sessionId);

  return jsonResponse({ session }, 201);
}

export async function getTeamSessionByRoomKeyController(
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

  const roomKey = new URL(request.url).searchParams.get("roomKey")?.trim();
  if (!roomKey) {
    return jsonError("Room key is required", 400);
  }

  const session = await auth.result.repo.getAccessibleTeamSessionByRoomKey(
    roomKey,
    workspace.viewer.user.organisationId,
    auth.result.userId,
    workspace.viewer.isWorkspaceAdmin,
  );
  if (!session) {
    return notFoundResponse("Session not found");
  }

  return jsonResponse({ session });
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

export async function updateTeamSessionController(
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

  const body = await request.json<{ name?: string }>();
  const name = body?.name?.trim();
  if (!name) {
    return jsonError("Session name is required", 400);
  }

  if (name.length > MAX_SESSION_NAME_LENGTH) {
    return jsonError(
      `Session name must be ${MAX_SESSION_NAME_LENGTH} characters or less`,
      400,
    );
  }

  await auth.result.repo.updateTeamSessionName(sessionId, name);
  const updatedSession = await auth.result.repo.getTeamSessionById(sessionId);

  return jsonResponse({ session: updatedSession });
}

export async function resolveTeamSessionRecapActionController(
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

  const body = await request.json<{
    actionId?: unknown;
    kind?: unknown;
  }>();
  const parsedBody = parseRecapActionBody(body);
  if ("error" in parsedBody) {
    return jsonError(parsedBody.error, 400);
  }

  const resolved = resolveTeamSessionRecapAction({
    metadata: parseTeamSessionMetadata(session.metadata),
    kind: parsedBody.kind,
    sessionId,
    actionId: parsedBody.actionId,
    resolvedAt: Date.now(),
    resolvedById: auth.result.userId,
  });

  if (!resolved.matched) {
    return notFoundResponse("Recap action not found");
  }

  const metadataString = JSON.stringify(resolved.metadata);
  if (metadataString.length > 10000) {
    return jsonError("Metadata is too large (max 10KB)", 400);
  }

  await auth.result.repo.updateTeamSessionMetadata(sessionId, resolved.metadata);
  const updatedSession = await auth.result.repo.getTeamSessionById(sessionId);

  return jsonResponse({ session: updatedSession });
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

  const body = await request.json<{
    roomKey?: string;
  }>();
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

  const members = await auth.result.repo.getOrganisationMembers(
    workspace.viewer.user.organisationId,
    workspace.viewer.isWorkspaceAdmin ? undefined : "active",
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
    const logoUrl = normalizeOptionalHttpUrl(body.logoUrl, {
      label: "Logo URL",
      maxLength: MAX_LOGO_URL_LENGTH,
    });
    if (!logoUrl.ok) {
      return jsonError(logoUrl.message, 400);
    }
    normalizedLogoUrl = logoUrl.value;
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

  if (membership.status !== "pending") {
    return jsonError("Member is not pending approval", 409);
  }

  await auth.result.repo.approveWorkspaceMembership(
    workspace.viewer.user.organisationId,
    memberUserId,
    auth.result.userId,
  );

  const member = await auth.result.repo.getOrganisationMemberById(
    workspace.viewer.user.organisationId,
    memberUserId,
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

  const member = await auth.result.repo.getOrganisationMemberById(
    workspace.viewer.user.organisationId,
    memberUserId,
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
      sendEmail: env.SEND_EMAIL,
    });
  } catch (error) {
    console.error("Failed to send workspace invite email:", error);
    return jsonError("Invite created but email could not be sent", 500);
  }

  return jsonResponse({ invite }, 201);
}
