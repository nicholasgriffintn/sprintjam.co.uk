import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Fetcher } from "@cloudflare/workers-types";
import { postRoundStats, type RoundStatsPayload } from "./stats-client";

const samplePayload: RoundStatsPayload = {
  roomKey: "room-123",
  roundId: "round-456",
  ticketId: "ticket-789",
  votes: [
    {
      userName: "Alex",
      vote: "5",
      structuredVote: { complexity: 3 },
      votedAt: 1700000000000,
    },
  ],
  judgeScore: "5",
  judgeMetadata: { consensus: true, max: 8, min: 3, totalVotes: 4 },
  roundEndedAt: 1700000001000,
};

const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  console.warn = originalConsoleWarn;
  console.error = originalConsoleError;
});

describe("postRoundStats", () => {
  it("skips posting when token is missing", async () => {
    const fetcher: Fetcher = {
      fetch: vi.fn(),
    } as unknown as Fetcher;

    await postRoundStats(fetcher, undefined, samplePayload);

    expect(console.warn).toHaveBeenCalledWith(
      "[stats-client] No STATS_INGEST_TOKEN configured, skipping",
    );
    expect(fetcher.fetch).not.toHaveBeenCalled();
  });

  it("posts stats payload with auth header", async () => {
    const fetcher: Fetcher = {
      fetch: vi.fn().mockResolvedValue({ ok: true } as Response),
    } as unknown as Fetcher;

    await postRoundStats(fetcher, "token-123", samplePayload);

    expect(fetcher.fetch).toHaveBeenCalledWith(
      "https://stats-worker/ingest/round",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer token-123",
          "Content-Type": "application/json",
        }),
        body: JSON.stringify(samplePayload),
      }),
    );
  });

  it("logs a helpful error when response is not ok", async () => {
    const responseText = "unauthorized";
    const fetcher: Fetcher = {
      fetch: vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: vi.fn().mockResolvedValue(responseText),
      } as unknown as Response),
    } as unknown as Fetcher;

    await postRoundStats(fetcher, "token-123", samplePayload);

    expect(console.error).toHaveBeenCalledWith(
      `[stats-client] Failed to post stats: 401 ${responseText}`,
    );
  });

  it("logs errors thrown by the fetcher", async () => {
    const fetcher: Fetcher = {
      fetch: vi.fn().mockRejectedValue(new Error("network down")),
    } as unknown as Fetcher;

    await postRoundStats(fetcher, "token-123", samplePayload);

    expect(console.error).toHaveBeenCalledWith(
      "[stats-client] Error posting stats:",
      expect.any(Error),
    );
  });
});
