import type { WheelWorkerEnv } from "@sprintjam/types";
import { jsonError } from "@sprintjam/utils";

export async function createRateLimit(
  request: Request,
  env: WheelWorkerEnv,
): Promise<Response | null> {
  if (env.ENABLE_WHEEL_RATE_LIMIT !== "true") {
    return null;
  }

  if (!env.WHEEL_CREATE_RATE_LIMITER || !env.WHEEL_IP_RATE_LIMITER) {
    console.error(
      "Rate limiters are not configured but rate limiting is enabled",
    );
    return jsonError("Service temporarily unavailable", 503);
  }

  const ip = request.headers.get("cf-connecting-ip") ?? "unknown";

  const { success: createRateLimitSuccess } =
    await env.WHEEL_CREATE_RATE_LIMITER.limit({
      key: `wheel-create:${ip}`,
    });

  const { success: ipRateLimitSuccess } = await env.WHEEL_IP_RATE_LIMITER.limit(
    {
      key: `wheel:ip:${ip}`,
    },
  );

  if (!createRateLimitSuccess || !ipRateLimitSuccess) {
    return jsonError(
      "Rate limit exceeded. Please wait before creating another wheel.",
      429,
    );
  }

  return null;
}

export async function joinRateLimit(
  request: Request,
  env: WheelWorkerEnv,
): Promise<Response | null> {
  if (env.ENABLE_WHEEL_RATE_LIMIT !== "true") {
    return null;
  }

  if (!env.WHEEL_JOIN_RATE_LIMITER || !env.WHEEL_IP_RATE_LIMITER) {
    console.error(
      "Rate limiters are not configured but rate limiting is enabled",
    );
    return jsonError("Service temporarily unavailable", 503);
  }

  const ip = request.headers.get("cf-connecting-ip") ?? "unknown";

  const { success: joinRateLimitSuccess } =
    await env.WHEEL_JOIN_RATE_LIMITER.limit({
      key: `wheel-join:${ip}`,
    });

  const { success: ipRateLimitSuccess } = await env.WHEEL_IP_RATE_LIMITER.limit(
    {
      key: `wheel:ip:${ip}`,
    },
  );

  if (!joinRateLimitSuccess || !ipRateLimitSuccess) {
    return jsonError(
      "Rate limit exceeded. Please wait before joining another wheel.",
      429,
    );
  }

  return null;
}
