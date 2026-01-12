import { describe, it, expect, vi, beforeEach } from "vitest";
import type { StatsWorkerEnv } from "@sprintjam/types";

import { ingestRoundController } from "./ingest";
import { StatsRepository } from "../repositories/stats";

vi.mock("../repositories/stats", () => ({
  StatsRepository: vi.fn(),
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
    const data = await response.json();

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
    const data = await response.json();

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
    const data = await response.json();

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
    const data = await response.json();

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
      }),
    });

    const response = await ingestRoundController(request as any, mockEnv);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
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
      }),
    });

    const response = await ingestRoundController(request as any, mockEnv);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockRepo.ingestRound).toHaveBeenCalledWith({
      roomKey: "room1",
      roundId: "round-uuid-123",
      ticketId: "TICKET-1",
      votes: [{ userName: "alice", vote: "5", votedAt: 1700000000 }],
      judgeScore: "5",
      judgeMetadata: { confidence: 0.8, reasoning: "High consensus" },
      roundEndedAt: 1700000010,
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
      }),
    });

    const response = await ingestRoundController(request as any, mockEnv);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });
});
