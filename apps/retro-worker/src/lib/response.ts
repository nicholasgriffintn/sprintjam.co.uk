import type { Response as CfResponse } from "@cloudflare/workers-types";
import {
  createJsonResponse,
  jsonError as createJsonError,
} from "@sprintjam/utils";

export function jsonResponse(body: unknown, status = 200): CfResponse {
  return createJsonResponse(body, status);
}

export function jsonError(message: string, status = 400): CfResponse {
  return createJsonError(message, status);
}

export function rootResponse(): CfResponse {
  return jsonResponse({
    status: "success",
    message: "Sprintjam Retro Worker is running.",
  });
}

export function notFoundResponse(): CfResponse {
  return jsonResponse({ error: "Retro Route Not found" }, 404);
}
