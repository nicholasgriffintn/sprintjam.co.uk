import type {
  Request as CfRequest,
  Response as CfResponse,
} from "@cloudflare/workers-types";
import type { StatsWorkerEnv } from "@sprintjam/types";

import { StatsRepository } from "../repositories/stats";
import {
  authenticateRequest,
  isUserInTeam,
  canUserAccessRoom,
  filterAccessibleRoomKeys,
  type AuthResult,
} from "../lib/auth";
import { errorResponse, successResponse } from "../lib/response";

function getAuthError(code: "unauthorized" | "expired"): string {
  return code === "unauthorized" ? "Unauthorized" : "Session expired";
}

export async function getRoomStatsController(
  request: CfRequest,
  env: StatsWorkerEnv,
  roomKey: string,
): Promise<CfResponse> {
  const authResult = await authenticateRequest(request, env.DB);
  if ("status" in authResult && authResult.status === "error") {
    return errorResponse(getAuthError(authResult.code), 401);
  }

  const auth = authResult as AuthResult;
  const hasAccess = await canUserAccessRoom(
    env.DB,
    auth.organisationId,
    roomKey,
  );
  if (!hasAccess) {
    return errorResponse("You do not have access to this room's stats", 403);
  }

  const repo = new StatsRepository(env.DB);
  const stats = await repo.getRoomStats(roomKey);

  if (!stats) {
    return errorResponse("Room not found", 404);
  }

  return successResponse({ stats }, true);
}

export async function getUserRoomStatsController(
  request: CfRequest,
  env: StatsWorkerEnv,
  roomKey: string,
  userName: string,
): Promise<CfResponse> {
  const authResult = await authenticateRequest(request, env.DB);
  if ("status" in authResult && authResult.status === "error") {
    return errorResponse(getAuthError(authResult.code), 401);
  }

  const auth = authResult as AuthResult;
  const hasAccess = await canUserAccessRoom(
    env.DB,
    auth.organisationId,
    roomKey,
  );
  if (!hasAccess) {
    return errorResponse("You do not have access to this room's stats", 403);
  }

  const repo = new StatsRepository(env.DB);
  const stats = await repo.getUserRoomStats(roomKey, userName);

  if (!stats) {
    return errorResponse("User stats not found", 404);
  }

  return successResponse({ stats }, true);
}

export async function getBatchRoomStatsController(
  request: CfRequest,
  env: StatsWorkerEnv,
): Promise<CfResponse> {
  const authResult = await authenticateRequest(request, env.DB);
  if ("status" in authResult && authResult.status === "error") {
    return errorResponse(getAuthError(authResult.code), 401);
  }

  const url = new URL(request.url);
  const keysParam = url.searchParams.get("keys");

  if (!keysParam) {
    return errorResponse("Missing keys query parameter", 400);
  }

  const roomKeys = keysParam.split(",").filter(Boolean);

  const auth = authResult as AuthResult;
  const accessibleRoomKeys = await filterAccessibleRoomKeys(
    env.DB,
    auth.organisationId,
    roomKeys,
  );

  const repo = new StatsRepository(env.DB);
  const statsMap = await repo.getBatchRoomStats(accessibleRoomKeys);

  const stats = Object.fromEntries(statsMap);

  return successResponse({ stats }, true);
}

export async function getTeamStatsController(
  request: CfRequest,
  env: StatsWorkerEnv,
  teamId: number,
): Promise<CfResponse> {
  const authResult = await authenticateRequest(request, env.DB);
  if ("status" in authResult && authResult.status === "error") {
    return errorResponse(getAuthError(authResult.code), 401);
  }

  const isMember = await isUserInTeam(env.DB, authResult.userId, teamId);
  if (!isMember) {
    return errorResponse("You do not have access to this team's stats", 403);
  }

  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get("limit") || "50", 10);
  const offset = parseInt(url.searchParams.get("offset") || "0", 10);

  const repo = new StatsRepository(env.DB);
  const stats = await repo.getTeamStats(teamId, { limit, offset });

  if (!stats) {
    return errorResponse("Team stats not found", 404);
  }

  return successResponse({ stats }, true);
}

export async function getTeamInsightsController(
  request: CfRequest,
  env: StatsWorkerEnv,
  teamId: number,
): Promise<CfResponse> {
  const authResult = await authenticateRequest(request, env.DB);
  if ("status" in authResult && authResult.status === "error") {
    return errorResponse(getAuthError(authResult.code), 401);
  }

  const isMember = await isUserInTeam(env.DB, authResult.userId, teamId);
  if (!isMember) {
    return errorResponse("You do not have access to this team's stats", 403);
  }

  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get("limit") || "6", 10);

  const repo = new StatsRepository(env.DB);
  const insights = await repo.getTeamInsights(teamId, { limit });

  if (!insights) {
    return successResponse({ insights: null }, true);
  }

  return successResponse({ insights }, true);
}
