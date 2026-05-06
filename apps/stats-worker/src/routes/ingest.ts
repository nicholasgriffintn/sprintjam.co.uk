import type {
  Request as CfRequest,
  Response as CfResponse,
} from "@cloudflare/workers-types";
import type {
  RecordStandupSessionStatsInput,
  RecordWheelSessionStatsInput,
  RoundIngestPayload,
  StatsWorkerEnv,
} from "@sprintjam/types";

import { StatsRepository } from "../repositories/stats";
import {
  validateRoundIngestPayload,
  validateStandupSessionStatsPayload,
  validateWheelSessionStatsPayload,
} from "../lib/validation";
import { successResponse, errorResponse } from "../lib/response";
import {
  authenticateRequest,
  canUserAccessRoom,
  isAuthError,
} from "../lib/auth";

function validateToken(request: CfRequest, env: StatsWorkerEnv): boolean {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;
  const token = authHeader.substring(7);
  return token === env.STATS_INGEST_TOKEN;
}

export async function ingestRoundController(
  request: CfRequest,
  env: StatsWorkerEnv,
): Promise<CfResponse> {
  if (!validateToken(request, env)) {
    return errorResponse("Unauthorized", 401);
  }

  const body = await request.json();
  const validation = validateRoundIngestPayload(body);

  if (!validation.valid) {
    return errorResponse(validation.error, 400);
  }

  const payload = body as RoundIngestPayload;
  const repo = new StatsRepository(env.DB);

  await repo.ingestRound(payload);

  return successResponse({ status: "ingested" });
}

export async function recordStandupSessionStatsController(
  request: CfRequest,
  env: StatsWorkerEnv,
): Promise<CfResponse> {
  const authResult = await authenticateRequest(request, env.DB);
  if (isAuthError(authResult)) {
    return errorResponse(
      authResult.code === "unauthorized" ? "Unauthorized" : "Session expired",
      401,
    );
  }

  const body = await request.json();
  const validation = validateStandupSessionStatsPayload(body);
  if (!validation.valid) {
    return errorResponse(validation.error, 400);
  }

  const payload = body as RecordStandupSessionStatsInput;
  const auth = authResult;
  const hasAccess = await canUserAccessRoom(
    env.DB,
    auth.userId,
    auth.organisationId,
    auth.workspaceRole === "admin",
    payload.roomKey,
  );
  if (!hasAccess) {
    return errorResponse(
      "You do not have access to this standup's stats",
      403,
    );
  }

  const repo = new StatsRepository(env.DB);
  await repo.recordStandupSessionStats(payload);

  return successResponse({ status: "recorded" });
}

export async function recordWheelSessionStatsController(
  request: CfRequest,
  env: StatsWorkerEnv,
): Promise<CfResponse> {
  const authResult = await authenticateRequest(request, env.DB);
  if (isAuthError(authResult)) {
    return errorResponse(
      authResult.code === "unauthorized" ? "Unauthorized" : "Session expired",
      401,
    );
  }

  const body = await request.json();
  const validation = validateWheelSessionStatsPayload(body);
  if (!validation.valid) {
    return errorResponse(validation.error, 400);
  }

  const payload = body as RecordWheelSessionStatsInput;
  const hasAccess = await canUserAccessRoom(
    env.DB,
    authResult.userId,
    authResult.organisationId,
    authResult.workspaceRole === "admin",
    payload.roomKey,
  );
  if (!hasAccess) {
    return errorResponse("You do not have access to this wheel's stats", 403);
  }

  const repo = new StatsRepository(env.DB);
  await repo.recordWheelSessionStats(payload);

  return successResponse({ status: "recorded" });
}
