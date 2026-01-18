import type { Response as CfResponse } from "@cloudflare/workers-types";
import {
  jsonError as createJsonError,
  createJsonResponse,
} from '@sprintjam/utils';

export function jsonResponse(body: unknown, status = 200): CfResponse {
  return createJsonResponse(body, status);
}

export function jsonError(message: string, status = 400): CfResponse {
  return createJsonError(message, status);
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
