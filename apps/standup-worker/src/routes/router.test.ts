import { describe, it, expect, vi, beforeEach } from "vitest";
import type { StandupWorkerEnv } from "@sprintjam/types";
import { handleRequest } from "./router";

describe("Standup Worker Rate Limiting", () => {
  const userAgent =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
  let mockEnv: StandupWorkerEnv;

  beforeEach(() => {
    mockEnv = {
      STANDUP_ROOM: {
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
      ENABLE_STANDUP_RATE_LIMIT: "true",
      STANDUP_CREATE_RATE_LIMITER: {
        limit: vi.fn().mockResolvedValue({ success: true }),
      } as any,
      STANDUP_JOIN_RATE_LIMITER: {
        limit: vi.fn().mockResolvedValue({ success: true }),
      } as any,
      STANDUP_IP_RATE_LIMITER: {
        limit: vi.fn().mockResolvedValue({ success: true }),
      } as any,
    };
  });

  describe("Bot Protection", () => {
    it("blocks requests without user-agent header when enabled", async () => {
      const request = new Request("https://example.com/api/standups", {
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
      const request = new Request("https://example.com/api/standups", {
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
      mockEnv.ENABLE_STANDUP_RATE_LIMIT = "false";

      const request = new Request("https://example.com/api/standups", {
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
    it("blocks create standup when rate limit exceeded", async () => {
      mockEnv.STANDUP_CREATE_RATE_LIMITER.limit = vi
        .fn()
        .mockResolvedValue({ success: false });

      const request = new Request("https://example.com/api/standups", {
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

    it("blocks join standup when rate limit exceeded", async () => {
      mockEnv.STANDUP_JOIN_RATE_LIMITER.limit = vi
        .fn()
        .mockResolvedValue({ success: false });

      const request = new Request("https://example.com/api/standups/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "user-agent": userAgent,
          "cf-connecting-ip": "1.2.3.4",
        },
        body: JSON.stringify({ name: "Test User", standupKey: "ABC123" }),
      });

      const response = await handleRequest(request as any, mockEnv);

      expect(response.status).toBe(429);
      const body = (await response.json()) as { error: string };
      expect(body.error).toContain("Rate limit exceeded");
    });

    it("uses IP address for rate limiting", async () => {
      const request = new Request("https://example.com/api/standups", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "user-agent": userAgent,
          "cf-connecting-ip": "5.6.7.8",
        },
        body: JSON.stringify({ name: "Test User" }),
      });

      await handleRequest(request as any, mockEnv);

      expect(mockEnv.STANDUP_CREATE_RATE_LIMITER.limit).toHaveBeenCalledWith({
        key: "standup-create:5.6.7.8",
      });
      expect(mockEnv.STANDUP_IP_RATE_LIMITER.limit).toHaveBeenCalledWith({
        key: "standup:ip:5.6.7.8",
      });
    });
  });

  describe("Routing", () => {
    it("returns health check on root", async () => {
      const request = new Request("https://example.com/", {
        method: "GET",
      });

      const response = await handleRequest(request as any, mockEnv);

      expect(response.status).toBe(200);
      const body = (await response.json()) as { message: string };
      expect(body.message).toContain("Standup Worker");
    });

    it("returns 404 for unknown routes", async () => {
      const request = new Request("https://example.com/api/unknown", {
        method: "GET",
      });

      const response = await handleRequest(request as any, mockEnv);

      expect(response.status).toBe(404);
    });

    it("rejects create without name", async () => {
      mockEnv.ENABLE_STANDUP_RATE_LIMIT = "false";

      const request = new Request("https://example.com/api/standups", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "user-agent": userAgent,
        },
        body: JSON.stringify({}),
      });

      const response = await handleRequest(request as any, mockEnv);

      expect(response.status).toBe(400);
      const body = (await response.json()) as { error: string };
      expect(body.error).toBe("Name is required");
    });

    it("rejects join without name or key", async () => {
      mockEnv.ENABLE_STANDUP_RATE_LIMIT = "false";

      const request = new Request("https://example.com/api/standups/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "user-agent": userAgent,
        },
        body: JSON.stringify({ name: "Alice" }),
      });

      const response = await handleRequest(request as any, mockEnv);

      expect(response.status).toBe(400);
      const body = (await response.json()) as { error: string };
      expect(body.error).toBe("Name and standup key are required");
    });
  });
});
