import type { Response as CfResponse } from "@cloudflare/workers-types";

import { jsonError } from "@sprintjam/utils";

export function jsonResponse(data: unknown, status = 200): CfResponse {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  }) as unknown as CfResponse;
}

export function unauthorizedResponse(message = "Unauthorized"): CfResponse {
  return jsonError(message, 401);
}

export function forbiddenResponse(message = "Access denied"): CfResponse {
  return jsonError(message, 403);
}

export function notFoundResponse(message = "Not found"): CfResponse {
  return jsonError(message, 404);
}
