import type { RoomWorkerEnv } from '@sprintjam/types';
import { jsonError } from '@sprintjam/utils';

export async function checkOAuthRateLimit(
  request: Request,
  env: RoomWorkerEnv,
): Promise<Response | null> {
  if (env.ENABLE_JOIN_RATE_LIMIT !== 'true') {
    return null;
  }

  if (!env.OAUTH_RATE_LIMITER) {
    console.error(
      'Rate limiters are not configured but rate limiting is enabled',
    );
    return jsonError('Service temporarily unavailable', 503);
  }

  const ip = request.headers.get('cf-connecting-ip') ?? 'unknown';

  const { success } = await env.OAUTH_RATE_LIMITER.limit({
    key: `oauth:${ip}`,
  });

  if (!success) {
    return jsonError('Rate limit exceeded. Please wait before retrying.', 429);
  }

  return null;
}
