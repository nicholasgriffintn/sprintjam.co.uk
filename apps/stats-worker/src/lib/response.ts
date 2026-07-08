import type { Response as CfResponse } from "@cloudflare/workers-types";
import { CACHE_CONTROL, jsonError as createJsonError } from "@sprintjam/utils";

export function jsonError(message: string, status = 400): CfResponse {
  return createJsonError(message, status);
}

export function jsonResponse(
  data: unknown,
  status: number,
  headers: Record<string, string> = {},
): CfResponse {
  const responseHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    "Cache-Control": CACHE_CONTROL.NO_STORE,
    ...headers,
  };

  return new Response(JSON.stringify(data), {
    status,
    headers: responseHeaders,
  });
}

export function errorResponse(error: string, status: number): CfResponse {
  return jsonResponse({ error }, status);
}

export function successResponse(
  data: unknown,
  headers: Record<string, string> = {},
): CfResponse {
  return jsonResponse(data, 200, headers);
}
