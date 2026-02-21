import type { Response as CfResponse } from "@cloudflare/workers-types";
import { jsonError as createJsonError } from "@sprintjam/utils";

export function jsonError(message: string, status = 400): CfResponse {
  return createJsonError(message, status);
}

const CACHE_MAX_AGE = 60;

export function jsonResponse(
  data: unknown,
  status: number,
  cacheable = false,
): CfResponse {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (cacheable && status === 200) {
    headers["Cache-Control"] = `private, max-age=${CACHE_MAX_AGE}`;
  }

  return new Response(JSON.stringify(data), {
    status,
    headers,
  }) as unknown as CfResponse;
}

export function errorResponse(error: string, status: number): CfResponse {
  return jsonResponse({ error }, status, false);
}

export function successResponse(data: unknown, cacheable = false): CfResponse {
  return jsonResponse(data, 200, cacheable);
}
