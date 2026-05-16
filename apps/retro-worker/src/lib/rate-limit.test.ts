import { describe, expect, it, vi } from "vitest";

import {
  createRateLimit,
  joinRateLimit,
  type RetroRateLimitEnv,
} from "./rate-limit";

const createLimiter = (success: boolean) => ({
  limit: vi.fn(async () => ({ success })),
});

const createRequest = () =>
  new Request("https://example.com/api/retros", {
    headers: { "cf-connecting-ip": "203.0.113.10" },
  });

const createEnv = (
  overrides: Partial<RetroRateLimitEnv> = {},
): RetroRateLimitEnv => ({
  ENABLE_RETRO_RATE_LIMIT: "true",
  RETRO_CREATE_RATE_LIMITER: createLimiter(true),
  RETRO_JOIN_RATE_LIMITER: createLimiter(true),
  RETRO_IP_RATE_LIMITER: createLimiter(true),
  ...overrides,
});

describe("retro rate limiting", () => {
  it("skips checks when retro rate limiting is disabled", async () => {
    const response = await createRateLimit(
      createRequest(),
      createEnv({ ENABLE_RETRO_RATE_LIMIT: "false" }),
    );

    expect(response).toBeNull();
  });

  it("returns service unavailable when staging rate limit bindings are missing", async () => {
    const response = await createRateLimit(
      createRequest(),
      createEnv({ RETRO_CREATE_RATE_LIMITER: undefined }),
    );

    expect(response?.status).toBe(503);
    await expect(response?.json()).resolves.toEqual({
      error: "Service temporarily unavailable",
    });
  });

  it("uses create and IP keys for create requests", async () => {
    const createLimiterBinding = createLimiter(true);
    const ipLimiterBinding = createLimiter(true);

    const response = await createRateLimit(
      createRequest(),
      createEnv({
        RETRO_CREATE_RATE_LIMITER: createLimiterBinding,
        RETRO_IP_RATE_LIMITER: ipLimiterBinding,
      }),
    );

    expect(response).toBeNull();
    expect(createLimiterBinding.limit).toHaveBeenCalledWith({
      key: "retro-create:203.0.113.10",
    });
    expect(ipLimiterBinding.limit).toHaveBeenCalledWith({
      key: "retro:ip:203.0.113.10",
    });
  });

  it("returns rate-limit feedback when join requests exceed a limit", async () => {
    const response = await joinRateLimit(
      createRequest(),
      createEnv({ RETRO_JOIN_RATE_LIMITER: createLimiter(false) }),
    );

    expect(response?.status).toBe(429);
    await expect(response?.json()).resolves.toEqual({
      error: "Rate limit exceeded. Please wait before joining another retro.",
    });
  });
});
