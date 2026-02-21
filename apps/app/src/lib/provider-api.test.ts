import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/constants", () => ({
  API_BASE_URL: "http://localhost",
}));

import { providerRequestJson, providerRequestVoid } from "@/lib/provider-api";

describe("provider-api", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns parsed json for successful requests", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true, value: 42 }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    const result = await providerRequestJson<{ ok: boolean; value: number }>(
      "/jira/boards",
      {
        method: "POST",
        body: { roomKey: "room", userName: "sam" },
        fallbackError: "Failed to fetch boards",
      },
    );

    expect(result).toEqual({ ok: true, value: 42 });
    expect(fetch).toHaveBeenCalledWith("http://localhost/jira/boards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomKey: "room", userName: "sam" }),
      credentials: "include",
    });
  });

  it("uses response error message when available", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "No access" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    await expect(
      providerRequestJson("/jira/boards", {
        method: "POST",
        body: { roomKey: "room", userName: "sam" },
        fallbackError: "Failed to fetch boards",
      }),
    ).rejects.toThrow("No access");
  });

  it("includes status in fallback message when configured", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(
        new Response("{}", {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    await expect(
      providerRequestVoid("/jira/oauth/revoke", {
        method: "DELETE",
        body: { roomKey: "room", userName: "sam" },
        fallbackError: "Failed to revoke",
        includeStatusInFallback: true,
      }),
    ).rejects.toThrow("Failed to revoke: 500");
  });
});
