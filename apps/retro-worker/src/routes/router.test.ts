import type {
  DurableObjectNamespace,
  RateLimit,
} from "@cloudflare/workers-types";
import type { RetroWorkerEnv } from "@sprintjam/types";
import { describe, expect, it, vi } from "vitest";

import { handleRequest } from "./router";

function createEnv(fetch: (request: Request) => Promise<Response>) {
  const get = vi.fn(() => ({ fetch }));
  const idFromName = vi.fn((name: string) => name);

  return {
    ENVIRONMENT: "development",
    ENABLE_RETRO_RATE_LIMIT: "false",
    RETRO_ROOM: { idFromName, get } as unknown as DurableObjectNamespace,
    TOKEN_ENCRYPTION_SECRET: "test-secret",
    RETRO_CREATE_RATE_LIMITER: {} as RateLimit,
    RETRO_JOIN_RATE_LIMITER: {} as RateLimit,
    RETRO_IP_RATE_LIMITER: {} as RateLimit,
    __retroRoomGet: get,
  } satisfies RetroWorkerEnv & { __retroRoomGet: typeof get };
}

function createRetroRequest(body: string) {
  return new Request("https://sprintjam.co.uk/api/retros", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
}

function joinRetroRequest(body: unknown, cookie?: string) {
  return new Request("https://sprintjam.co.uk/api/retros/join", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify(body),
  });
}

describe("retro router", () => {
  it("returns a controlled error for malformed create JSON", async () => {
    const env = createEnv(vi.fn());

    const response = await handleRequest(createRetroRequest("{bad"), env);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid JSON" });
  });

  it("retries retro creation when a generated room code already exists", async () => {
    const fetch = vi
      .fn<(request: Request) => Promise<Response>>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "Retro already exists" }), {
          status: 409,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    const env = createEnv(fetch);

    const response = await handleRequest(
      createRetroRequest(JSON.stringify({ name: "Alice" })),
      env,
    );

    expect(response.status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(env.__retroRoomGet).toHaveBeenCalledTimes(2);
  });

  it("returns service unavailable after repeated retro code collisions", async () => {
    const fetch = vi.fn(async () => new Response(null, { status: 409 }));
    const env = createEnv(fetch);

    const response = await handleRequest(
      createRetroRequest(JSON.stringify({ name: "Alice" })),
      env,
    );

    expect(response.status).toBe(503);
    expect(fetch).toHaveBeenCalledTimes(5);
    await expect(response.json()).resolves.toEqual({
      error: "Unable to allocate a retro code. Please try again.",
    });
  });

  it("forwards matching structured retro session cookies to joins", async () => {
    const fetch = vi.fn<(request: Request) => Promise<Response>>(
      async () => new Response(null, { status: 200 }),
    );
    const env = createEnv(fetch);

    const response = await handleRequest(
      joinRetroRequest(
        { name: "Alice", retroKey: "retro1" },
        "retro_session=RETRO1:cookie-token",
      ),
      env,
    );

    expect(response.status).toBe(200);
    const forwardedRequest = fetch.mock.calls[0]?.[0] as Request;
    expect(forwardedRequest.headers.get("Cookie")).toBe(
      "retro_session=cookie-token",
    );
  });

  it("does not forward mismatched structured retro session cookies to joins", async () => {
    const fetch = vi.fn<(request: Request) => Promise<Response>>(
      async () => new Response(null, { status: 200 }),
    );
    const env = createEnv(fetch);

    const response = await handleRequest(
      joinRetroRequest(
        { name: "Alice", retroKey: "RETRO1" },
        "retro_session=RETRO2:cookie-token",
      ),
      env,
    );

    expect(response.status).toBe(200);
    const forwardedRequest = fetch.mock.calls[0]?.[0] as Request;
    expect(forwardedRequest.headers.get("Cookie")).toBeNull();
  });
});
