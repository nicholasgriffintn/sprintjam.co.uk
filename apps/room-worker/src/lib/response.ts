import type { Response as CfResponse } from '@cloudflare/workers-types';
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

export function rootResponse(serviceName: string): CfResponse {
  return jsonResponse({
    status: 'success',
    message: `Sprintjam ${serviceName} is running.`,
  });
}

export function notFoundResponse(prefix = 'Room'): CfResponse {
  return jsonResponse({ error: `${prefix} Route Not found` }, 404);
}

export function internalErrorResponse(prefix = 'room-worker'): CfResponse {
  return jsonResponse({ error: `[${prefix}] Internal Server Error` }, 500);
}
