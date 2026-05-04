import type { StandupWorkerEnv } from "@sprintjam/types";
import { jsonError } from "@sprintjam/utils";

export async function createRateLimit(
  request: Request,
  env: StandupWorkerEnv,
): Promise<Response | null> {
  if (env.ENABLE_STANDUP_RATE_LIMIT !== "true") {
    return null;
  }

  if (!env.STANDUP_CREATE_RATE_LIMITER || !env.STANDUP_IP_RATE_LIMITER) {
    console.error(
      "Rate limiters are not configured but rate limiting is enabled",
    );
    return jsonError("Service temporarily unavailable", 503);
  }

  const ip = request.headers.get("cf-connecting-ip") ?? "unknown";

  const { success: createRateLimitSuccess } =
    await env.STANDUP_CREATE_RATE_LIMITER.limit({
      key: `standup-create:${ip}`,
    });

  const { success: ipRateLimitSuccess } =
    await env.STANDUP_IP_RATE_LIMITER.limit({
      key: `standup:ip:${ip}`,
    });

  if (!createRateLimitSuccess || !ipRateLimitSuccess) {
    return jsonError(
      "Rate limit exceeded. Please wait before creating another standup.",
      429,
    );
  }

  return null;
}

export async function joinRateLimit(
  request: Request,
  env: StandupWorkerEnv,
): Promise<Response | null> {
  if (env.ENABLE_STANDUP_RATE_LIMIT !== "true") {
    return null;
  }

  if (!env.STANDUP_JOIN_RATE_LIMITER || !env.STANDUP_IP_RATE_LIMITER) {
    console.error(
      "Rate limiters are not configured but rate limiting is enabled",
    );
    return jsonError("Service temporarily unavailable", 503);
  }

  const ip = request.headers.get("cf-connecting-ip") ?? "unknown";

  const { success: joinRateLimitSuccess } =
    await env.STANDUP_JOIN_RATE_LIMITER.limit({
      key: `standup-join:${ip}`,
    });

  const { success: ipRateLimitSuccess } =
    await env.STANDUP_IP_RATE_LIMITER.limit({
      key: `standup:ip:${ip}`,
    });

  if (!joinRateLimitSuccess || !ipRateLimitSuccess) {
    return jsonError(
      "Rate limit exceeded. Please wait before joining another standup.",
      429,
    );
  }

  return null;
}
