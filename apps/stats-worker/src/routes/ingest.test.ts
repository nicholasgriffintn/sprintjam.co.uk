import { describe, it, expect, vi, beforeEach } from "vitest";
import type { StatsWorkerEnv } from "@sprintjam/types";

import {
  ingestRoundController,
  recordStandupSessionStatsController,
  recordWheelSessionStatsController,
} from "./ingest";
import { StatsRepository } from "../repositories/stats";
import { authenticateRequest, canUserAccessRoom } from "../lib/auth";

vi.mock("../repositories/stats", () => ({
  StatsRepository: vi.fn(),
}));

vi.mock("../lib/auth", () => ({
  authenticateRequest: vi.fn(),
  canUserAccessRoom: vi.fn(),
  isAuthError: (result: { status?: string }) => result.status === "error",
}));

describe("ingestRoundController", () => {
  let mockEnv: StatsWorkerEnv;
  let mockRepo: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockEnv = {
      DB: {} as any,
      STATS_INGEST_TOKEN: "test-secret-token",
    } as StatsWorkerEnv;

    mockRepo = {
      ingestRound: vi.fn(),
    };

    vi.mocked(StatsRepository).mockImplementation(function () {
      return mockRepo;
    });
  });

  it("should return 401 when no authorization header", async () => {
    const request = new Request("https://test.com/ingest/round", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const response = await ingestRoundController(request as any, mockEnv);
    const data = (await response.json()) as any;

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 401 when token is invalid", async () => {
    const request = new Request("https://test.com/ingest/round", {
      method: "POST",
      headers: { Authorization: "Bearer wrong-token" },
      body: JSON.stringify({}),
    });

    const response = await ingestRoundController(request as any, mockEnv);
    const data = (await response.json()) as any;

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 400 when required fields are missing", async () => {
    const request = new Request("https://test.com/ingest/round", {
      method: "POST",
      headers: { Authorization: "Bearer test-secret-token" },
      body: JSON.stringify({ roomKey: "room1" }),
    });

    const response = await ingestRoundController(request as any, mockEnv);
    const data = (await response.json()) as any;

    expect(response.status).toBe(400);
    expect(data.error).toBe("Missing required fields");
  });

  it("should return 400 when roundId is missing", async () => {
    const request = new Request("https://test.com/ingest/round", {
      method: "POST",
      headers: { Authorization: "Bearer test-secret-token" },
      body: JSON.stringify({
        roomKey: "room1",
        votes: [],
        roundEndedAt: 1700000000,
      }),
    });

    const response = await ingestRoundController(request as any, mockEnv);
    const data = (await response.json()) as any;

    expect(response.status).toBe(400);
    expect(data.error).toBe("Missing required fields");
  });

  it("should successfully ingest round data", async () => {
    mockRepo.ingestRound.mockResolvedValue(undefined);

    const request = new Request("https://test.com/ingest/round", {
      method: "POST",
      headers: { Authorization: "Bearer test-secret-token" },
      body: JSON.stringify({
        roomKey: "room1",
        roundId: "round-uuid-123",
        votes: [
          { userName: "alice", vote: "5", votedAt: 1700000000 },
          { userName: "bob", vote: "3", votedAt: 1700000001 },
        ],
        roundEndedAt: 1700000010,
        type: "reset" as const,
      }),
    });

    const response = await ingestRoundController(request as any, mockEnv);
    const data = (await response.json()) as any;

    expect(response.status).toBe(200);
    expect(data.status).toBe("ingested");
    expect(mockRepo.ingestRound).toHaveBeenCalledWith({
      roomKey: "room1",
      roundId: "round-uuid-123",
      ticketId: undefined,
      votes: [
        { userName: "alice", vote: "5", votedAt: 1700000000 },
        { userName: "bob", vote: "3", votedAt: 1700000001 },
      ],
      judgeScore: undefined,
      judgeMetadata: undefined,
      roundEndedAt: 1700000010,
      type: "reset",
    });
  });

  it("should include optional fields when provided", async () => {
    mockRepo.ingestRound.mockResolvedValue(undefined);

    const request = new Request("https://test.com/ingest/round", {
      method: "POST",
      headers: { Authorization: "Bearer test-secret-token" },
      body: JSON.stringify({
        roomKey: "room1",
        roundId: "round-uuid-123",
        ticketId: "TICKET-1",
        votes: [{ userName: "alice", vote: "5", votedAt: 1700000000 }],
        judgeScore: "5",
        judgeMetadata: { confidence: 0.8, reasoning: "High consensus" },
        roundEndedAt: 1700000010,
        type: "next_ticket" as const,
      }),
    });

    const response = await ingestRoundController(request as any, mockEnv);
    const data = (await response.json()) as any;

    expect(response.status).toBe(200);
    expect(data.status).toBe("ingested");
    expect(mockRepo.ingestRound).toHaveBeenCalledWith({
      roomKey: "room1",
      roundId: "round-uuid-123",
      ticketId: "TICKET-1",
      votes: [{ userName: "alice", vote: "5", votedAt: 1700000000 }],
      judgeScore: "5",
      judgeMetadata: { confidence: 0.8, reasoning: "High consensus" },
      roundEndedAt: 1700000010,
      type: "next_ticket",
    });
  });

  it("should handle empty votes array", async () => {
    mockRepo.ingestRound.mockResolvedValue(undefined);

    const request = new Request("https://test.com/ingest/round", {
      method: "POST",
      headers: { Authorization: "Bearer test-secret-token" },
      body: JSON.stringify({
        roomKey: "room1",
        roundId: "round-uuid-123",
        votes: [],
        roundEndedAt: 1700000010,
        type: "reset" as const,
      }),
    });

    const response = await ingestRoundController(request as any, mockEnv);
    const data = (await response.json()) as any;

    expect(response.status).toBe(200);
    expect(data.status).toBe("ingested");
  });
});

describe("recordStandupSessionStatsController", () => {
  let mockEnv: StatsWorkerEnv;
  let mockRepo: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockEnv = {
      DB: {} as any,
      STATS_INGEST_TOKEN: "test-secret-token",
    } as StatsWorkerEnv;

    mockRepo = {
      recordStandupSessionStats: vi.fn().mockResolvedValue(undefined),
      recordWheelSessionStats: vi.fn().mockResolvedValue(undefined),
    };

    vi.mocked(StatsRepository).mockImplementation(function () {
      return mockRepo;
    });
    vi.mocked(authenticateRequest).mockResolvedValue({
      userId: 10,
      email: "ava@example.com",
      organisationId: 2,
      workspaceRole: "member",
    });
    vi.mocked(canUserAccessRoom).mockResolvedValue(true);
  });

  it("returns 401 when the user is not authenticated", async () => {
    vi.mocked(authenticateRequest).mockResolvedValue({
      status: "error",
      code: "unauthorized",
    });

    const request = new Request("https://test.com/stats/standup-session", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const response = await recordStandupSessionStatsController(
      request as any,
      mockEnv,
    );
    const data = (await response.json()) as any;

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 400 when the payload is invalid", async () => {
    const request = new Request("https://test.com/stats/standup-session", {
      method: "POST",
      body: JSON.stringify({
        roomKey: "standup-a",
        totalParticipants: 2,
        responses: "invalid",
      }),
    });

    const response = await recordStandupSessionStatsController(
      request as any,
      mockEnv,
    );
    const data = (await response.json()) as any;

    expect(response.status).toBe(400);
    expect(data.error).toBe("responses must be an array with max 100 items");
  });

  it("returns 403 when the room is not accessible", async () => {
    vi.mocked(canUserAccessRoom).mockResolvedValue(false);

    const request = new Request("https://test.com/stats/standup-session", {
      method: "POST",
      body: JSON.stringify({
        roomKey: "standup-a",
        totalParticipants: 2,
        responses: [],
      }),
    });

    const response = await recordStandupSessionStatsController(
      request as any,
      mockEnv,
    );
    const data = (await response.json()) as any;

    expect(response.status).toBe(403);
    expect(data.error).toBe("You do not have access to this standup's stats");
    expect(mockRepo.recordStandupSessionStats).not.toHaveBeenCalled();
  });

  it("records standup stats when the user can access the room", async () => {
    const payload = {
      roomKey: "standup-a",
      totalParticipants: 2,
      responses: [
        {
          healthCheck: 4,
          hasBlocker: true,
          blockerResolved: false,
          linkedTicketCount: 1,
          hasKudos: true,
        },
      ],
    };
    const request = new Request("https://test.com/stats/standup-session", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const response = await recordStandupSessionStatsController(
      request as any,
      mockEnv,
    );
    const data = (await response.json()) as any;

    expect(response.status).toBe(200);
    expect(data.status).toBe("recorded");
    expect(canUserAccessRoom).toHaveBeenCalledWith(
      mockEnv.DB,
      10,
      2,
      false,
      "standup-a",
    );
    expect(mockRepo.recordStandupSessionStats).toHaveBeenCalledWith(payload);
  });

  it("records wheel stats when the user can access the room", async () => {
    const payload = {
      roomKey: "wheel-a",
      mode: "reviewer",
      totalParticipants: 3,
      entryCount: 3,
      enabledEntryCount: 2,
      results: [
        { winner: "Ava", removedAfter: false },
        { winner: "Ben", removedAfter: true },
      ],
    };
    const request = new Request("https://test.com/stats/wheel-session", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const response = await recordWheelSessionStatsController(
      request as any,
      mockEnv,
    );
    const data = (await response.json()) as any;

    expect(response.status).toBe(200);
    expect(data.status).toBe("recorded");
    expect(canUserAccessRoom).toHaveBeenCalledWith(
      mockEnv.DB,
      10,
      2,
      false,
      "wheel-a",
    );
    expect(mockRepo.recordWheelSessionStats).toHaveBeenCalledWith(payload);
  });

  it("rejects invalid wheel stats payloads", async () => {
    const request = new Request("https://test.com/stats/wheel-session", {
      method: "POST",
      body: JSON.stringify({
        roomKey: "wheel-a",
        mode: "unsupported",
        totalParticipants: 3,
        entryCount: 3,
        enabledEntryCount: 2,
        results: [],
      }),
    });

    const response = await recordWheelSessionStatsController(
      request as any,
      mockEnv,
    );
    const data = (await response.json()) as any;

    expect(response.status).toBe(400);
    expect(data.error).toBe(
      "mode must be one of decision, reviewer, or facilitator",
    );
  });
});
