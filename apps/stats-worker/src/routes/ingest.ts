import type {
  Request as CfRequest,
  Response as CfResponse,
} from "@cloudflare/workers-types";
import type { RoundIngestPayload, StatsWorkerEnv } from "@sprintjam/types";

import { StatsRepository } from "../repositories/stats";
import { validateRoundIngestPayload } from "../lib/validation";
import { successResponse, errorResponse } from "../lib/response";

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
