import { describe, it, expect, vi, beforeEach } from "vitest";
import type { StatsWorkerEnv } from "@sprintjam/types";

import {
  getRoomStatsController,
  getUserRoomStatsController,
  getBatchRoomStatsController,
  getTeamStatsController,
} from "./query";
import { StatsRepository } from "../repositories/stats";
import * as auth from "../lib/auth";

vi.mock("../repositories/stats", () => ({
  StatsRepository: vi.fn(),
}));
vi.mock("../lib/auth", () => ({
  authenticateRequest: vi.fn(),
  isUserInTeam: vi.fn(),
  canUserAccessRoom: vi.fn(),
  filterAccessibleRoomKeys: vi.fn(),
}));

describe("getRoomStatsController", () => {
  let mockEnv: StatsWorkerEnv;
  let mockRepo: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockEnv = { DB: {} as any } as StatsWorkerEnv;

    mockRepo = {
      getRoomStats: vi.fn(),
    };

    vi.mocked(StatsRepository).mockImplementation(function () {
      return mockRepo;
    });
  });

  it("should return 401 when not authenticated", async () => {
    vi.mocked(auth.authenticateRequest).mockResolvedValue({
      status: "error",
      code: "unauthorized",
    });

    const request = new Request("https://test.com/stats/room/test-room", {
      method: "GET",
    });

    const response = await getRoomStatsController(
      request as any,
      mockEnv,
      "test-room",
    );
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 403 when user does not have room access", async () => {
    vi.mocked(auth.authenticateRequest).mockResolvedValue({
      userId: 1,
      email: "test@example.com",
      organisationId: 1,
    });
    vi.mocked(auth.canUserAccessRoom).mockResolvedValue(false);

    const request = new Request("https://test.com/stats/room/test-room", {
      method: "GET",
    });

    const response = await getRoomStatsController(
      request as any,
      mockEnv,
      "test-room",
    );
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("You do not have access to this room's stats");
  });

  it("should return 404 when room not found", async () => {
    vi.mocked(auth.authenticateRequest).mockResolvedValue({
      userId: 1,
      email: "test@example.com",
      organisationId: 1,
    });
    vi.mocked(auth.canUserAccessRoom).mockResolvedValue(true);
    mockRepo.getRoomStats.mockResolvedValue(null);

    const request = new Request("https://test.com/stats/room/test-room", {
      method: "GET",
    });

    const response = await getRoomStatsController(
      request as any,
      mockEnv,
      "test-room",
    );
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Room not found");
  });

  it("should return room stats when found", async () => {
    vi.mocked(auth.authenticateRequest).mockResolvedValue({
      userId: 1,
      email: "test@example.com",
      organisationId: 1,
    });
    vi.mocked(auth.canUserAccessRoom).mockResolvedValue(true);
    mockRepo.getRoomStats.mockResolvedValue({
      roomKey: "test-room",
      totalRounds: 10,
      totalVotes: 50,
      lastUpdatedAt: 1700000000,
    });

    const request = new Request("https://test.com/stats/room/test-room", {
      method: "GET",
    });

    const response = await getRoomStatsController(
      request as any,
      mockEnv,
      "test-room",
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.stats.roomKey).toBe("test-room");
    expect(data.stats.totalRounds).toBe(10);
    expect(data.stats.totalVotes).toBe(50);
  });
});

describe("getUserRoomStatsController", () => {
  let mockEnv: StatsWorkerEnv;
  let mockRepo: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockEnv = { DB: {} as any } as StatsWorkerEnv;

    mockRepo = {
      getUserRoomStats: vi.fn(),
    };

    vi.mocked(StatsRepository).mockImplementation(function () {
      return mockRepo;
    });
  });

  it("should return 401 when not authenticated", async () => {
    vi.mocked(auth.authenticateRequest).mockResolvedValue({
      status: "error",
      code: "unauthorized",
    });

    const request = new Request(
      "https://test.com/stats/room/test-room/user/alice",
      {
        method: "GET",
      },
    );

    const response = await getUserRoomStatsController(
      request as any,
      mockEnv,
      "test-room",
      "alice",
    );
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 403 when user does not have room access", async () => {
    vi.mocked(auth.authenticateRequest).mockResolvedValue({
      userId: 1,
      email: "test@example.com",
      organisationId: 1,
    });
    vi.mocked(auth.canUserAccessRoom).mockResolvedValue(false);

    const request = new Request(
      "https://test.com/stats/room/test-room/user/alice",
      {
        method: "GET",
      },
    );

    const response = await getUserRoomStatsController(
      request as any,
      mockEnv,
      "test-room",
      "alice",
    );
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("You do not have access to this room's stats");
  });

  it("should return 404 when user stats not found", async () => {
    vi.mocked(auth.authenticateRequest).mockResolvedValue({
      userId: 1,
      email: "test@example.com",
      organisationId: 1,
    });
    vi.mocked(auth.canUserAccessRoom).mockResolvedValue(true);
    mockRepo.getUserRoomStats.mockResolvedValue(null);

    const request = new Request(
      "https://test.com/stats/room/test-room/user/alice",
      {
        method: "GET",
      },
    );

    const response = await getUserRoomStatsController(
      request as any,
      mockEnv,
      "test-room",
      "alice",
    );
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("User stats not found");
  });

  it("should return user room stats when found", async () => {
    vi.mocked(auth.authenticateRequest).mockResolvedValue({
      userId: 1,
      email: "test@example.com",
      organisationId: 1,
    });
    vi.mocked(auth.canUserAccessRoom).mockResolvedValue(true);
    mockRepo.getUserRoomStats.mockResolvedValue({
      userName: "alice",
      totalVotes: 8,
      participationRate: 80,
      consensusAlignment: 75,
      judgeAlignment: 60,
      voteDistribution: { "3": 5, "5": 3 },
    });

    const request = new Request(
      "https://test.com/stats/room/test-room/user/alice",
      {
        method: "GET",
      },
    );

    const response = await getUserRoomStatsController(
      request as any,
      mockEnv,
      "test-room",
      "alice",
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.stats.userName).toBe("alice");
    expect(data.stats.totalVotes).toBe(8);
    expect(data.stats.participationRate).toBe(80);
  });
});

describe("getBatchRoomStatsController", () => {
  let mockEnv: StatsWorkerEnv;
  let mockRepo: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockEnv = { DB: {} as any } as StatsWorkerEnv;

    mockRepo = {
      getBatchRoomStats: vi.fn(),
    };

    vi.mocked(StatsRepository).mockImplementation(function () {
      return mockRepo;
    });
  });

  it("should return 401 when not authenticated", async () => {
    vi.mocked(auth.authenticateRequest).mockResolvedValue({
      status: "error",
      code: "unauthorized",
    });

    const request = new Request("https://test.com/stats/rooms?keys=room1", {
      method: "GET",
    });

    const response = await getBatchRoomStatsController(request as any, mockEnv);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 400 when keys parameter is missing", async () => {
    vi.mocked(auth.authenticateRequest).mockResolvedValue({
      userId: 1,
      email: "test@example.com",
      organisationId: 1,
    });

    const request = new Request("https://test.com/stats/rooms", {
      method: "GET",
    });

    const response = await getBatchRoomStatsController(request as any, mockEnv);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Missing keys query parameter");
  });

  it("should return batch room stats only for accessible rooms", async () => {
    vi.mocked(auth.authenticateRequest).mockResolvedValue({
      userId: 1,
      email: "test@example.com",
      organisationId: 1,
    });
    vi.mocked(auth.filterAccessibleRoomKeys).mockResolvedValue([
      "room1",
      "room2",
    ]);

    const statsMap = new Map([
      [
        "room1",
        {
          roomKey: "room1",
          totalRounds: 5,
          totalVotes: 25,
          lastUpdatedAt: 1700000000,
        },
      ],
      [
        "room2",
        {
          roomKey: "room2",
          totalRounds: 3,
          totalVotes: 15,
          lastUpdatedAt: 1700000000,
        },
      ],
    ]);
    mockRepo.getBatchRoomStats.mockResolvedValue(statsMap);

    const request = new Request(
      "https://test.com/stats/rooms?keys=room1,room2,room3",
      {
        method: "GET",
      },
    );

    const response = await getBatchRoomStatsController(request as any, mockEnv);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.stats.room1.totalRounds).toBe(5);
    expect(data.stats.room2.totalRounds).toBe(3);
    expect(mockRepo.getBatchRoomStats).toHaveBeenCalledWith(["room1", "room2"]);
    expect(auth.filterAccessibleRoomKeys).toHaveBeenCalledWith(mockEnv.DB, 1, [
      "room1",
      "room2",
      "room3",
    ]);
  });

  it("should return empty stats when user has no access to any rooms", async () => {
    vi.mocked(auth.authenticateRequest).mockResolvedValue({
      userId: 1,
      email: "test@example.com",
      organisationId: 1,
    });
    vi.mocked(auth.filterAccessibleRoomKeys).mockResolvedValue([]);
    mockRepo.getBatchRoomStats.mockResolvedValue(new Map());

    const request = new Request(
      "https://test.com/stats/rooms?keys=room1,room2",
      {
        method: "GET",
      },
    );

    const response = await getBatchRoomStatsController(request as any, mockEnv);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.stats).toEqual({});
  });
});

describe("getTeamStatsController", () => {
  let mockEnv: StatsWorkerEnv;
  let mockRepo: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockEnv = { DB: {} as any } as StatsWorkerEnv;

    mockRepo = {
      getTeamStats: vi.fn(),
    };

    vi.mocked(StatsRepository).mockImplementation(function () {
      return mockRepo;
    });
  });

  it("should return 401 when not authenticated", async () => {
    vi.mocked(auth.authenticateRequest).mockResolvedValue({
      status: "error",
      code: "unauthorized",
    });

    const request = new Request("https://test.com/stats/team/1", {
      method: "GET",
    });

    const response = await getTeamStatsController(request as any, mockEnv, 1);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 401 when session expired", async () => {
    vi.mocked(auth.authenticateRequest).mockResolvedValue({
      status: "error",
      code: "expired",
    });

    const request = new Request("https://test.com/stats/team/1", {
      method: "GET",
      headers: { Authorization: "Bearer expired-token" },
    });

    const response = await getTeamStatsController(request as any, mockEnv, 1);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Session expired");
  });

  it("should return 403 when user is not a team member", async () => {
    vi.mocked(auth.authenticateRequest).mockResolvedValue({
      userId: 1,
      email: "test@example.com",
      organisationId: 1,
    });
    vi.mocked(auth.isUserInTeam).mockResolvedValue(false);

    const request = new Request("https://test.com/stats/team/1", {
      method: "GET",
      headers: { Authorization: "Bearer valid-token" },
    });

    const response = await getTeamStatsController(request as any, mockEnv, 1);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("You do not have access to this team's stats");
  });

  it("should return 404 when team stats not found", async () => {
    vi.mocked(auth.authenticateRequest).mockResolvedValue({
      userId: 1,
      email: "test@example.com",
      organisationId: 1,
    });
    vi.mocked(auth.isUserInTeam).mockResolvedValue(true);
    mockRepo.getTeamStats.mockResolvedValue(null);

    const request = new Request("https://test.com/stats/team/1", {
      method: "GET",
      headers: { Authorization: "Bearer valid-token" },
    });

    const response = await getTeamStatsController(request as any, mockEnv, 1);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Team stats not found");
  });

  it("should return team stats for authorized user", async () => {
    vi.mocked(auth.authenticateRequest).mockResolvedValue({
      userId: 1,
      email: "test@example.com",
      organisationId: 1,
    });
    vi.mocked(auth.isUserInTeam).mockResolvedValue(true);
    mockRepo.getTeamStats.mockResolvedValue({
      totalMembers: 5,
      totalRounds: 20,
      avgParticipation: 85,
      consensusRate: 70,
      memberStats: [
        {
          userName: "alice",
          totalVotes: 18,
          participationRate: 90,
          consensusAlignment: 75,
          judgeAlignment: 60,
          voteDistribution: { "3": 10, "5": 8 },
        },
      ],
    });

    const request = new Request("https://test.com/stats/team/1", {
      method: "GET",
      headers: { Authorization: "Bearer valid-token" },
    });

    const response = await getTeamStatsController(request as any, mockEnv, 1);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.stats.totalMembers).toBe(5);
    expect(data.stats.totalRounds).toBe(20);
    expect(data.stats.memberStats).toHaveLength(1);
    expect(data.stats.memberStats[0].userName).toBe("alice");
  });

  it("should pass pagination parameters to repository", async () => {
    vi.mocked(auth.authenticateRequest).mockResolvedValue({
      userId: 1,
      email: "test@example.com",
      organisationId: 1,
    });
    vi.mocked(auth.isUserInTeam).mockResolvedValue(true);
    mockRepo.getTeamStats.mockResolvedValue({
      totalMembers: 100,
      totalRounds: 50,
      avgParticipation: 80,
      consensusRate: 75,
      memberStats: [],
    });

    const request = new Request(
      "https://test.com/stats/team/1?limit=10&offset=20",
      {
        method: "GET",
      },
    );

    await getTeamStatsController(request as any, mockEnv, 1);

    expect(mockRepo.getTeamStats).toHaveBeenCalledWith(1, {
      limit: 10,
      offset: 20,
    });
  });

  it("should use default pagination when not specified", async () => {
    vi.mocked(auth.authenticateRequest).mockResolvedValue({
      userId: 1,
      email: "test@example.com",
      organisationId: 1,
    });
    vi.mocked(auth.isUserInTeam).mockResolvedValue(true);
    mockRepo.getTeamStats.mockResolvedValue({
      totalMembers: 5,
      totalRounds: 20,
      avgParticipation: 85,
      consensusRate: 70,
      memberStats: [],
    });

    const request = new Request("https://test.com/stats/team/1", {
      method: "GET",
    });

    await getTeamStatsController(request as any, mockEnv, 1);

    expect(mockRepo.getTeamStats).toHaveBeenCalledWith(1, {
      limit: 50,
      offset: 0,
    });
  });

  it("should include Cache-Control header on success", async () => {
    vi.mocked(auth.authenticateRequest).mockResolvedValue({
      userId: 1,
      email: "test@example.com",
      organisationId: 1,
    });
    vi.mocked(auth.isUserInTeam).mockResolvedValue(true);
    mockRepo.getTeamStats.mockResolvedValue({
      totalMembers: 5,
      totalRounds: 20,
      avgParticipation: 85,
      consensusRate: 70,
      memberStats: [],
    });

    const request = new Request("https://test.com/stats/team/1", {
      method: "GET",
    });

    const response = await getTeamStatsController(request as any, mockEnv, 1);

    expect(response.headers.get("Cache-Control")).toBe("private, max-age=60");
  });
});

describe("Cache-Control headers", () => {
  let mockEnv: StatsWorkerEnv;
  let mockRepo: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockEnv = { DB: {} as any } as StatsWorkerEnv;

    mockRepo = {
      getRoomStats: vi.fn(),
      getUserRoomStats: vi.fn(),
      getBatchRoomStats: vi.fn(),
    };

    vi.mocked(StatsRepository).mockImplementation(function () {
      return mockRepo;
    });
  });

  it("getRoomStatsController includes Cache-Control on success", async () => {
    vi.mocked(auth.authenticateRequest).mockResolvedValue({
      userId: 1,
      email: "test@example.com",
      organisationId: 1,
    });
    vi.mocked(auth.canUserAccessRoom).mockResolvedValue(true);
    mockRepo.getRoomStats.mockResolvedValue({
      roomKey: "test-room",
      totalRounds: 10,
      totalVotes: 50,
      lastUpdatedAt: 1700000000,
    });

    const request = new Request("https://test.com/stats/room/test-room", {
      method: "GET",
    });

    const response = await getRoomStatsController(
      request as any,
      mockEnv,
      "test-room",
    );

    expect(response.headers.get("Cache-Control")).toBe("private, max-age=60");
  });

  it("getRoomStatsController does not include Cache-Control on error", async () => {
    vi.mocked(auth.authenticateRequest).mockResolvedValue({
      status: "error",
      code: "unauthorized",
    });

    const request = new Request("https://test.com/stats/room/test-room", {
      method: "GET",
    });

    const response = await getRoomStatsController(
      request as any,
      mockEnv,
      "test-room",
    );

    expect(response.headers.get("Cache-Control")).toBeNull();
  });

  it("getUserRoomStatsController includes Cache-Control on success", async () => {
    vi.mocked(auth.authenticateRequest).mockResolvedValue({
      userId: 1,
      email: "test@example.com",
      organisationId: 1,
    });
    vi.mocked(auth.canUserAccessRoom).mockResolvedValue(true);
    mockRepo.getUserRoomStats.mockResolvedValue({
      userName: "alice",
      totalVotes: 8,
      participationRate: 80,
      consensusAlignment: 75,
      judgeAlignment: 60,
      voteDistribution: {},
    });

    const request = new Request(
      "https://test.com/stats/room/test-room/user/alice",
      {
        method: "GET",
      },
    );

    const response = await getUserRoomStatsController(
      request as any,
      mockEnv,
      "test-room",
      "alice",
    );

    expect(response.headers.get("Cache-Control")).toBe("private, max-age=60");
  });

  it("getBatchRoomStatsController includes Cache-Control on success", async () => {
    vi.mocked(auth.authenticateRequest).mockResolvedValue({
      userId: 1,
      email: "test@example.com",
      organisationId: 1,
    });
    vi.mocked(auth.filterAccessibleRoomKeys).mockResolvedValue(["room1"]);
    mockRepo.getBatchRoomStats.mockResolvedValue(
      new Map([
        [
          "room1",
          {
            roomKey: "room1",
            totalRounds: 5,
            totalVotes: 25,
            lastUpdatedAt: 1700000000,
          },
        ],
      ]),
    );

    const request = new Request("https://test.com/stats/rooms?keys=room1", {
      method: "GET",
    });

    const response = await getBatchRoomStatsController(request as any, mockEnv);

    expect(response.headers.get("Cache-Control")).toBe("private, max-age=60");
  });
});
