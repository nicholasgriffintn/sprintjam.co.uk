import type { AuthWorkerEnv } from "@sprintjam/types";

import { authenticateRequest, isAuthError, type AuthResult } from "../lib/auth";
import { parseTeamsInstallationPayload } from "../lib/collaboration";
import {
  forbiddenResponse,
  jsonError,
  jsonResponse,
  notFoundResponse,
  unauthorizedResponse,
} from "../lib/response";
import { canAccessTeam, canManageTeam } from "../lib/team-access";
import { TeamCollaborationRepository } from "../repositories/team-collaboration-repository";

async function getAuthOrError(
  request: Request,
  env: AuthWorkerEnv,
): Promise<{ result: AuthResult } | { response: Response }> {
  const result = await authenticateRequest(request, env.DB);
  if (isAuthError(result)) {
    return { response: unauthorizedResponse() };
  }
  return { result };
}

async function getTeamAccess(
  result: AuthResult,
  teamId: number,
): Promise<
  | { canManage: boolean; canAccess: boolean }
  | { response: Response }
> {
  const team = await result.repo.getTeamById(teamId);
  if (!team) {
    return { response: notFoundResponse("Team not found") };
  }

  const user = await result.repo.getUserById(result.userId);
  if (!user || user.organisationId !== team.organisationId) {
    return { response: forbiddenResponse() };
  }

  const isWorkspaceAdmin = await result.repo.isOrganisationAdmin(
    result.userId,
    user.organisationId,
  );
  const membership = await result.repo.getTeamMembership(
    teamId,
    result.userId,
  );

  return {
    canAccess: canAccessTeam(team, membership, result.userId, isWorkspaceAdmin),
    canManage: canManageTeam(team, membership, result.userId, isWorkspaceAdmin),
  };
}

export async function listTeamCollaborationInstallationsController(
  request: Request,
  env: AuthWorkerEnv,
  teamId: number,
): Promise<Response> {
  const auth = await getAuthOrError(request, env);
  if ("response" in auth) return auth.response;

  const access = await getTeamAccess(auth.result, teamId);
  if ("response" in access) return access.response;
  if (!access.canAccess) {
    return forbiddenResponse("You do not have access to this team");
  }

  const repo = new TeamCollaborationRepository(env.DB);
  const installations = await repo.listForTeam(teamId);
  return jsonResponse({ installations });
}

export async function saveTeamsCollaborationInstallationController(
  request: Request,
  env: AuthWorkerEnv,
  teamId: number,
): Promise<Response> {
  const auth = await getAuthOrError(request, env);
  if ("response" in auth) return auth.response;

  const access = await getTeamAccess(auth.result, teamId);
  if ("response" in access) return access.response;
  if (!access.canManage) {
    return forbiddenResponse("Only team admins can connect Teams");
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return jsonError("Invalid request body", 400);
  }

  const parsed = parseTeamsInstallationPayload(raw);
  if (!parsed.ok) {
    return jsonError(parsed.error, 400);
  }

  const repo = new TeamCollaborationRepository(env.DB);
  const installation = await repo.saveTeamsInstallation({
    teamId,
    installedById: auth.result.userId,
    input: parsed.value,
  });

  return jsonResponse({ installation }, 201);
}

export async function resolveTeamsCollaborationInstallationController(
  request: Request,
  env: AuthWorkerEnv,
): Promise<Response> {
  const auth = await getAuthOrError(request, env);
  if ("response" in auth) return auth.response;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return jsonError("Invalid request body", 400);
  }

  const parsed = parseTeamsInstallationPayload(raw);
  if (!parsed.ok) {
    return jsonError(parsed.error, 400);
  }

  const repo = new TeamCollaborationRepository(env.DB);
  const installation = await repo.getTeamsInstallationByContext(parsed.value);
  if (!installation) {
    return jsonResponse({ installation: null });
  }

  const access = await getTeamAccess(auth.result, installation.teamId);
  if ("response" in access) return access.response;
  if (!access.canAccess) {
    return forbiddenResponse("You do not have access to this team");
  }

  return jsonResponse({ installation });
}

export async function deleteTeamCollaborationInstallationController(
  request: Request,
  env: AuthWorkerEnv,
  teamId: number,
  installationId: number,
): Promise<Response> {
  const auth = await getAuthOrError(request, env);
  if ("response" in auth) return auth.response;

  const access = await getTeamAccess(auth.result, teamId);
  if ("response" in access) return access.response;
  if (!access.canManage) {
    return forbiddenResponse("Only team admins can disconnect Teams");
  }

  const repo = new TeamCollaborationRepository(env.DB);
  const deleted = await repo.deleteForTeam(teamId, installationId);
  if (!deleted) {
    return notFoundResponse("Collaboration installation not found");
  }

  return jsonResponse({ message: "Collaboration installation disconnected" });
}
