import { describe, it, expect, vi, beforeEach } from "vitest";
import type { WheelWorkerEnv } from "@sprintjam/types";
import { handleRequest } from "./router";

describe("Wheel Worker Rate Limiting", () => {
  const userAgent =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
  let mockEnv: WheelWorkerEnv;

  beforeEach(() => {
    mockEnv = {
      WHEEL_ROOM: {
        idFromName: vi.fn().mockReturnValue("mock-id"),
        get: vi.fn().mockReturnValue({
          fetch: vi.fn().mockResolvedValue(
            new Response(JSON.stringify({ success: true }), {
              status: 200,
            }),
          ),
        }),
      } as any,
      TOKEN_ENCRYPTION_SECRET: "test-secret",
      ENABLE_WHEEL_RATE_LIMIT: "true",
      WHEEL_CREATE_RATE_LIMITER: {
        limit: vi.fn().mockResolvedValue({ success: true }),
      } as any,
      WHEEL_JOIN_RATE_LIMITER: {
        limit: vi.fn().mockResolvedValue({ success: true }),
      } as any,
      WHEEL_IP_RATE_LIMITER: {
        limit: vi.fn().mockResolvedValue({ success: true }),
      } as any,
    };
  });

  describe("Bot Protection", () => {
    it("blocks requests without user-agent header when enabled", async () => {
      const request = new Request("https://example.com/api/wheels", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "cf-connecting-ip": "1.2.3.4",
        },
        body: JSON.stringify({ name: "Test User" }),
      });

      const response = await handleRequest(request as any, mockEnv);

      expect(response.status).toBe(403);
      const body = (await response.json()) as { error: string };
      expect(body).toEqual({ error: "Invalid client" });
    });

    it("allows requests with valid user-agent header", async () => {
      const request = new Request("https://example.com/api/wheels", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "user-agent": userAgent,
          "cf-connecting-ip": "1.2.3.4",
        },
        body: JSON.stringify({ name: "Test User" }),
      });

      const response = await handleRequest(request as any, mockEnv);

      expect(response.status).toBe(200);
    });

    it("allows requests when rate limiting is disabled", async () => {
      mockEnv.ENABLE_WHEEL_RATE_LIMIT = "false";

      const request = new Request("https://example.com/api/wheels", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "user-agent": userAgent,
          "cf-connecting-ip": "1.2.3.4",
        },
        body: JSON.stringify({ name: "Test User" }),
      });

      const response = await handleRequest(request as any, mockEnv);

      expect(response.status).toBe(200);
    });
  });

  describe("Rate Limiting", () => {
    it("blocks create wheel when rate limit exceeded", async () => {
      mockEnv.WHEEL_CREATE_RATE_LIMITER.limit = vi
        .fn()
        .mockResolvedValue({ success: false });

      const request = new Request("https://example.com/api/wheels", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "user-agent": userAgent,
          "cf-connecting-ip": "1.2.3.4",
        },
        body: JSON.stringify({ name: "Test User" }),
      });

      const response = await handleRequest(request as any, mockEnv);

      expect(response.status).toBe(429);
      const body = (await response.json()) as { error: string };
      expect(body.error).toContain("Rate limit exceeded");
    });

    it("blocks join wheel when rate limit exceeded", async () => {
      mockEnv.WHEEL_JOIN_RATE_LIMITER.limit = vi
        .fn()
        .mockResolvedValue({ success: false });

      const request = new Request("https://example.com/api/wheels/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "user-agent": userAgent,
          "cf-connecting-ip": "1.2.3.4",
        },
        body: JSON.stringify({ name: "Test User", wheelKey: "ABC123" }),
      });

      const response = await handleRequest(request as any, mockEnv);

      expect(response.status).toBe(429);
      const body = (await response.json()) as { error: string };
      expect(body.error).toContain("Rate limit exceeded");
    });

    it("uses IP address for rate limiting", async () => {
      const request = new Request("https://example.com/api/wheels", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "user-agent": userAgent,
          "cf-connecting-ip": "5.6.7.8",
        },
        body: JSON.stringify({ name: "Test User" }),
      });

      await handleRequest(request as any, mockEnv);

      expect(mockEnv.WHEEL_CREATE_RATE_LIMITER.limit).toHaveBeenCalledWith({
        key: "wheel-create:5.6.7.8",
      });
      expect(mockEnv.WHEEL_IP_RATE_LIMITER.limit).toHaveBeenCalledWith({
        key: "wheel:ip:5.6.7.8",
      });
    });
  });
});
