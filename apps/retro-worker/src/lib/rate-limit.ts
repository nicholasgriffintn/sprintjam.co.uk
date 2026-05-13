import type { RetroWorkerEnv } from "@sprintjam/types";
import { jsonError } from "@sprintjam/utils";

export async function createRateLimit(
  request: Request,
  env: RetroWorkerEnv,
): Promise<Response | null> {
  if (env.ENABLE_RETRO_RATE_LIMIT !== "true") {
    return null;
  }

  if (!env.RETRO_CREATE_RATE_LIMITER || !env.RETRO_IP_RATE_LIMITER) {
    console.error(
      "Retro rate limiters are not configured but rate limiting is enabled",
    );
    return jsonError("Service temporarily unavailable", 503);
  }

  const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
  const [{ success: createSuccess }, { success: ipSuccess }] =
    await Promise.all([
      env.RETRO_CREATE_RATE_LIMITER.limit({ key: `retro-create:${ip}` }),
      env.RETRO_IP_RATE_LIMITER.limit({ key: `retro:ip:${ip}` }),
    ]);

  if (!createSuccess || !ipSuccess) {
    return jsonError(
      "Rate limit exceeded. Please wait before creating another retro.",
      429,
    );
  }

  return null;
}

export async function joinRateLimit(
  request: Request,
  env: RetroWorkerEnv,
): Promise<Response | null> {
  if (env.ENABLE_RETRO_RATE_LIMIT !== "true") {
    return null;
  }

  if (!env.RETRO_JOIN_RATE_LIMITER || !env.RETRO_IP_RATE_LIMITER) {
    console.error(
      "Retro rate limiters are not configured but rate limiting is enabled",
    );
    return jsonError("Service temporarily unavailable", 503);
  }

  const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
  const [{ success: joinSuccess }, { success: ipSuccess }] = await Promise.all([
    env.RETRO_JOIN_RATE_LIMITER.limit({ key: `retro-join:${ip}` }),
    env.RETRO_IP_RATE_LIMITER.limit({ key: `retro:ip:${ip}` }),
  ]);

  if (!joinSuccess || !ipSuccess) {
    return jsonError(
      "Rate limit exceeded. Please wait before joining another retro.",
      429,
    );
  }

  return null;
}
