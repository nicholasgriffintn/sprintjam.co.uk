import type { Response as CfResponse } from "@cloudflare/workers-types";

import type { Env } from "../../types";
import { createJsonResponse, jsonError } from "../../utils/http";
import { FixitEventsRepository } from "../../repositories/fixit-events";

export async function getFixitEventsController(
  url: URL,
  env: Env,
): Promise<CfResponse> {
  if (!env.FIXITS_DB) {
    return jsonError("Fixits database is not configured", 500);
  }

  const fixitId = url.searchParams.get("fixitId") ?? env.FIXITS_DEFAULT_RUN_ID;
  if (!fixitId) {
    return jsonError("Missing fixitId query parameter", 400);
  }

  const limitParam = Number(url.searchParams.get("limit"));
  const limit = Number.isFinite(limitParam)
    ? Math.min(Math.max(1, limitParam), 200)
    : 50;

  const repo = new FixitEventsRepository(env.FIXITS_DB);
  const events = await repo.listRecentEvents(fixitId, limit);

  return createJsonResponse({ fixitId, events });
}
