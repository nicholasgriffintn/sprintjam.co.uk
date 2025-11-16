import type { Response as CfResponse } from '@cloudflare/workers-types';

export function createJsonResponse(body: unknown, status = 200): CfResponse {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  }) as unknown as CfResponse;
}
