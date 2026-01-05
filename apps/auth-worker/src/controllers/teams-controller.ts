import type {
  Request as CfRequest,
  Response as CfResponse,
} from "@cloudflare/workers-types";
import type { AuthWorkerEnv } from "@sprintjam/types";
import {
  jsonError,
  createJsonResponse,
  hashToken,
  getSessionTokenFromRequest,
} from "@sprintjam/utils";

import { WorkspaceAuthRepository } from "../repositories/workspace-auth";

async function authenticateRequest(
  request: CfRequest,
  env: AuthWorkerEnv,
): Promise<
  | { userId: number; email: string; repo: WorkspaceAuthRepository }
  | { status: "error"; code: string }
> {
  const token = getSessionTokenFromRequest(request);
  if (!token) {
    return { status: "error", code: "unauthorized" };
  }

  const tokenHash = await hashToken(token);
  const repo = new WorkspaceAuthRepository(env.DB);

  const session = await repo.validateSession(tokenHash);
  if (!session) {
    return { status: "error", code: "expired" };
  }

  return { userId: session.userId, email: session.email, repo };
}

export async function listTeamsController(
  request: CfRequest,
  env: AuthWorkerEnv,
): Promise<CfResponse> {
  const auth = await authenticateRequest(request, env);

  if ("status" in auth) {
    if (auth.code === "unauthorized") {
      return jsonError("Unauthorized", 401);
    } else if (auth.code === "expired") {
      return jsonError("Session expired", 401);
    }
    return jsonError("Unknown authentication error", 401);
  }

  const { userId, repo } = auth;
  const teams = await repo.getUserTeams(userId);

  return createJsonResponse({ teams });
}

export async function createTeamController(
  request: CfRequest,
  env: AuthWorkerEnv,
): Promise<CfResponse> {
  const auth = await authenticateRequest(request, env);

  if ("status" in auth) {
    if (auth.code === "unauthorized") {
      return jsonError("Unauthorized", 401);
    } else if (auth.code === "expired") {
      return jsonError("Session expired", 401);
    }
    return jsonError("Unknown authentication error", 401);
  }

  const { userId, repo } = auth;
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
    return jsonError("User not found", 404);
  }

  const teamId = await repo.createTeam(user.organisationId, name, userId);
  const team = await repo.getTeamById(teamId);

  return createJsonResponse({ team }, 201);
}

export async function getTeamController(
  request: CfRequest,
  env: AuthWorkerEnv,
  teamId: number,
): Promise<CfResponse> {
  const auth = await authenticateRequest(request, env);

  if ("status" in auth) {
    if (auth.code === "unauthorized") {
      return jsonError("Unauthorized", 401);
    } else if (auth.code === "expired") {
      return jsonError("Session expired", 401);
    }
    return jsonError("Unknown authentication error", 401);
  }

  const { userId, repo } = auth;
  const team = await repo.getTeamById(teamId);

  if (!team) {
    return jsonError("Team not found", 404);
  }

  const user = await repo.getUserById(userId);
  if (!user || user.organisationId !== team.organisationId) {
    return jsonError("Access denied", 403);
  }

  return createJsonResponse({ team });
}

export async function updateTeamController(
  request: CfRequest,
  env: AuthWorkerEnv,
  teamId: number,
): Promise<CfResponse> {
  const auth = await authenticateRequest(request, env);

  if ("status" in auth) {
    if (auth.code === "unauthorized") {
      return jsonError("Unauthorized", 401);
    } else if (auth.code === "expired") {
      return jsonError("Session expired", 401);
    }
    return jsonError("Unknown authentication error", 401);
  }

  const { userId, repo } = auth;
  const team = await repo.getTeamById(teamId);

  if (!team) {
    return jsonError("Team not found", 404);
  }

  if (team.ownerId !== userId) {
    return jsonError("Only the team owner can update the team", 403);
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

  return createJsonResponse({ team: updatedTeam });
}

export async function deleteTeamController(
  request: CfRequest,
  env: AuthWorkerEnv,
  teamId: number,
): Promise<CfResponse> {
  const auth = await authenticateRequest(request, env);

  if ("status" in auth) {
    if (auth.code === "unauthorized") {
      return jsonError("Unauthorized", 401);
    } else if (auth.code === "expired") {
      return jsonError("Session expired", 401);
    }
    return jsonError("Unknown authentication error", 401);
  }

  const { userId, repo } = auth;
  const team = await repo.getTeamById(teamId);

  if (!team) {
    return jsonError("Team not found", 404);
  }

  if (team.ownerId !== userId) {
    return jsonError("Only the team owner can delete the team", 403);
  }

  await repo.deleteTeam(teamId);

  return createJsonResponse({ message: "Team deleted successfully" });
}

export async function listTeamSessionsController(
  request: CfRequest,
  env: AuthWorkerEnv,
  teamId: number,
): Promise<CfResponse> {
  const auth = await authenticateRequest(request, env);

  if ("status" in auth) {
    if (auth.code === "unauthorized") {
      return jsonError("Unauthorized", 401);
    } else if (auth.code === "expired") {
      return jsonError("Session expired", 401);
    }
    return jsonError("Unknown authentication error", 401);
  }

  const { userId, repo } = auth;
  const team = await repo.getTeamById(teamId);

  if (!team) {
    return jsonError("Team not found", 404);
  }

  const isOwner = await repo.isTeamOwner(teamId, userId);
  if (!isOwner) {
    return jsonError("Only the team owner can access team sessions", 403);
  }

  const sessions = await repo.getTeamSessions(teamId);

  return createJsonResponse({ sessions });
}

export async function createTeamSessionController(
  request: CfRequest,
  env: AuthWorkerEnv,
  teamId: number,
): Promise<CfResponse> {
  const auth = await authenticateRequest(request, env);

  if ("status" in auth) {
    if (auth.code === "unauthorized") {
      return jsonError("Unauthorized", 401);
    } else if (auth.code === "expired") {
      return jsonError("Session expired", 401);
    }
    return jsonError("Unknown authentication error", 401);
  }

  const { userId, repo } = auth;
  const team = await repo.getTeamById(teamId);

  if (!team) {
    return jsonError("Team not found", 404);
  }

  const isOwner = await repo.isTeamOwner(teamId, userId);
  if (!isOwner) {
    return jsonError("Only the team owner can create team sessions", 403);
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

  return createJsonResponse({ session }, 201);
}

export async function getTeamSessionController(
  request: CfRequest,
  env: AuthWorkerEnv,
  teamId: number,
  sessionId: number,
): Promise<CfResponse> {
  const auth = await authenticateRequest(request, env);

  if ("status" in auth) {
    if (auth.code === "unauthorized") {
      return jsonError("Unauthorized", 401);
    } else if (auth.code === "expired") {
      return jsonError("Session expired", 401);
    }
    return jsonError("Unknown authentication error", 401);
  }

  const { userId, repo } = auth;
  const team = await repo.getTeamById(teamId);

  if (!team) {
    return jsonError("Team not found", 404);
  }

  const isOwner = await repo.isTeamOwner(teamId, userId);
  if (!isOwner) {
    return jsonError("Only the team owner can access team sessions", 403);
  }

  const session = await repo.getTeamSessionById(sessionId);

  if (!session || session.teamId !== teamId) {
    return jsonError("Session not found", 404);
  }

  return createJsonResponse({ session });
}

export async function getWorkspaceStatsController(
  request: CfRequest,
  env: AuthWorkerEnv,
): Promise<CfResponse> {
  const auth = await authenticateRequest(request, env);

  if ("status" in auth) {
    if (auth.code === "unauthorized") {
      return jsonError("Unauthorized", 401);
    } else if (auth.code === "expired") {
      return jsonError("Session expired", 401);
    }
    return jsonError("Unknown authentication error", 401);
  }

  const { userId, repo } = auth;
  const stats = await repo.getWorkspaceStats(userId);

  return createJsonResponse({ stats });
}
