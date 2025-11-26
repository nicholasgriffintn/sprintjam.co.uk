import type { Response as CfResponse } from "@cloudflare/workers-types";

import type { Env } from "../../types";
import { createJsonResponse, jsonError } from "../../utils/http";
import { FixitLeaderboardRepository } from "../../repositories/fixit-leaderboard";

export async function getFixitLeaderboardController(
  url: URL,
  env: Env,
): Promise<CfResponse> {
  if (!env.FIXITS_DB) {
    return jsonError("Fixits database is not configured", 500);
  }

  const fixitId = url.searchParams.get("fixitId") || env.FIXITS_DEFAULT_RUN_ID;
  if (!fixitId) {
    return jsonError("Missing fixitId query parameter", 400);
  }

  const limitParam = url.searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : 100;
  const sanitizedLimit =
    Number.isFinite(limit) && limit > 0 ? Math.min(limit, 500) : 100;

  const leaderboardRepo = new FixitLeaderboardRepository(env.FIXITS_DB);
  const entries = await leaderboardRepo.getLeaderboard(
    fixitId,
    sanitizedLimit,
  );

  return createJsonResponse({
    fixitId,
    entries,
  });
}
