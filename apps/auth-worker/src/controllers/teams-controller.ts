import type { AuthWorkerEnv } from "@sprintjam/types";
import { jsonError } from "../lib/response";

import { authenticateRequest, isAuthError, type AuthResult } from "../lib/auth";
import {
  jsonResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
} from "../lib/response";

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

export async function listTeamsController(
  request: Request,
  env: AuthWorkerEnv,
): Promise<Response> {
  const auth = await getAuthOrError(request, env);

  if ("response" in auth) {
    return auth.response;
  }

  const { userId, repo } = auth.result;
  const teams = await repo.getUserTeams(userId);

  return jsonResponse({ teams });
}

export async function createTeamController(
  request: Request,
  env: AuthWorkerEnv,
): Promise<Response> {
  const auth = await getAuthOrError(request, env);

  if ("response" in auth) {
    return auth.response;
  }

  const { userId, repo } = auth.result;
  const body = await request.json<{ name?: string }>();
  const name = body?.name?.trim();

  if (!name) {
    return jsonError("Team name is required", 400);
  }

  if (name.length > 100) {
    return jsonError("Team name must be 100 characters or less", 400);
  }

  const user = await repo.getUserById(userId);
  if (!user) {
    return notFoundResponse("User not found");
  }

  const teamId = await repo.createTeam(user.organisationId, name, userId);
  const team = await repo.getTeamById(teamId);

  return jsonResponse({ team }, 201);
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

  const { userId, repo } = auth.result;
  const team = await repo.getTeamById(teamId);

  if (!team) {
    return notFoundResponse("Team not found");
  }

  const user = await repo.getUserById(userId);
  if (!user || user.organisationId !== team.organisationId) {
    return forbiddenResponse();
  }

  return jsonResponse({ team });
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

  const { userId, repo } = auth.result;
  const team = await repo.getTeamById(teamId);

  if (!team) {
    return notFoundResponse("Team not found");
  }

  if (team.ownerId !== userId) {
    return forbiddenResponse("Only the team owner can update the team");
  }

  const body = await request.json<{ name?: string }>();
  const name = body?.name?.trim();

  if (!name) {
    return jsonError("Team name is required", 400);
  }

  if (name.length > 100) {
    return jsonError("Team name must be 100 characters or less", 400);
  }

  await repo.updateTeam(teamId, { name });
  const updatedTeam = await repo.getTeamById(teamId);

  return jsonResponse({ team: updatedTeam });
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

  const { userId, repo } = auth.result;
  const team = await repo.getTeamById(teamId);

  if (!team) {
    return notFoundResponse("Team not found");
  }

  if (team.ownerId !== userId) {
    return forbiddenResponse("Only the team owner can delete the team");
  }

  await repo.deleteTeam(teamId);

  return jsonResponse({ message: "Team deleted successfully" });
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

  const { userId, repo } = auth.result;
  const team = await repo.getTeamById(teamId);

  if (!team) {
    return notFoundResponse("Team not found");
  }

  const isOwner = await repo.isTeamOwner(teamId, userId);
  if (!isOwner) {
    return forbiddenResponse("Only the team owner can access team sessions");
  }

  const sessions = await repo.getTeamSessions(teamId);

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

  const { userId, repo } = auth.result;
  const team = await repo.getTeamById(teamId);

  if (!team) {
    return notFoundResponse("Team not found");
  }

  const isOwner = await repo.isTeamOwner(teamId, userId);
  if (!isOwner) {
    return forbiddenResponse("Only the team owner can access team sessions");
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

  const sessionId = await repo.createTeamSession(
    teamId,
    roomKey,
    name,
    userId,
    body?.metadata,
  );

  const session = await repo.getTeamSessionById(sessionId);

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

  const { userId, repo } = auth.result;
  const team = await repo.getTeamById(teamId);

  if (!team) {
    return notFoundResponse("Team not found");
  }

  const isOwner = await repo.isTeamOwner(teamId, userId);
  if (!isOwner) {
    return forbiddenResponse("Only the team owner can access team sessions");
  }

  const session = await repo.getTeamSessionById(sessionId);

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

  const { userId, repo } = auth.result;
  const body = await request.json<{ roomKey?: string }>();
  const roomKey = body?.roomKey?.trim();

  if (!roomKey) {
    return jsonError("Room key is required", 400);
  }

  const updatedSession = await repo.completeLatestSessionByRoomKey(
    roomKey,
    userId,
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

  const { userId, repo } = auth.result;
  const stats = await repo.getWorkspaceStats(userId);

  return jsonResponse(stats);
}
