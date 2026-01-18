import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  roundVotes,
  voteRecords,
  teamSessions,
} from "@sprintjam/db/d1/schemas";
import { drizzle } from "drizzle-orm/d1";

import { StatsRepository } from "./stats";

vi.mock("drizzle-orm/d1", () => ({
  drizzle: vi.fn(),
}));

describe("StatsRepository ingestRound", () => {
  let mockD1: {
    batch: ReturnType<typeof vi.fn>;
    prepare: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockD1 = {
      batch: vi.fn().mockResolvedValue(undefined),
      prepare: vi.fn(() => ({
        bind: vi.fn(() => ({})),
      })),
    };
  });

  it("skips duplicate rounds without updating stats", async () => {
    const insert = vi.fn((table) => {
      if (table === roundVotes) {
        const returning = vi.fn().mockResolvedValue([]);
        const onConflictDoNothing = vi.fn(() => ({ returning }));
        const values = vi.fn(() => ({ onConflictDoNothing }));
        return { values };
      }
      if (table === voteRecords) {
        throw new Error("voteRecords insert should not be called");
      }
      throw new Error("Unexpected insert table");
    });

    vi.mocked(drizzle).mockReturnValue({ insert } as any);

    const repo = new StatsRepository(mockD1 as any);
    await repo.ingestRound({
      roomKey: "room1",
      roundId: "round-1",
      votes: [{ userName: "alice", vote: "5", votedAt: 1 }],
      roundEndedAt: 2,
    });

    expect(insert).toHaveBeenCalledWith(roundVotes);
    expect(mockD1.batch).not.toHaveBeenCalled();
  });

  it("records votes and updates stats when round is new", async () => {
    const insert = vi.fn((table) => {
      if (table === roundVotes) {
        const returning = vi.fn().mockResolvedValue([{ roundId: "round-1" }]);
        const onConflictDoNothing = vi.fn(() => ({ returning }));
        const values = vi.fn(() => ({ onConflictDoNothing }));
        return { values };
      }
      if (table === voteRecords) {
        const onConflictDoNothing = vi.fn().mockResolvedValue(undefined);
        const values = vi.fn(() => ({ onConflictDoNothing }));
        return { values };
      }
      throw new Error("Unexpected insert table");
    });

    vi.mocked(drizzle).mockReturnValue({ insert } as any);

    const repo = new StatsRepository(mockD1 as any);
    await repo.ingestRound({
      roomKey: "room1",
      roundId: "round-1",
      votes: [{ userName: "alice", vote: "5", votedAt: 1 }],
      roundEndedAt: 2,
    });

    expect(insert).toHaveBeenCalledWith(roundVotes);
    expect(insert).toHaveBeenCalledWith(voteRecords);
    expect(mockD1.batch).toHaveBeenCalled();
  });
});

describe("StatsRepository getTeamInsights", () => {
  let mockD1: {
    batch: ReturnType<typeof vi.fn>;
    prepare: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockD1 = {
      batch: vi.fn().mockResolvedValue(undefined),
      prepare: vi.fn(() => ({
        bind: vi.fn(() => ({})),
      })),
    };
  });

  it("calculates team insights from completed sessions", async () => {
    const sessions = [
      { roomKey: "room-a", completedAt: 2000 },
      { roomKey: "room-b", completedAt: 1000 },
    ];
    const rounds = [
      {
        roomKey: "room-a",
        roundId: "r1",
        ticketId: "T1",
        roundEndedAt: 0,
      },
      {
        roomKey: "room-a",
        roundId: "r2",
        ticketId: "T1",
        roundEndedAt: 3600000,
      },
      {
        roomKey: "room-b",
        roundId: "r3",
        ticketId: "T2",
        roundEndedAt: 7200000,
      },
    ];
    const votes = [
      { roundId: "r1", userName: "Alice", vote: "3", roomKey: "room-a" },
      { roundId: "r1", userName: "Bob", vote: "3", roomKey: "room-a" },
      { roundId: "r2", userName: "Alice", vote: "5", roomKey: "room-a" },
      { roundId: "r2", userName: "Bob", vote: "?", roomKey: "room-a" },
      { roundId: "r3", userName: "Cara", vote: "2", roomKey: "room-b" },
    ];

    const select = vi.fn(() => ({
      from: (table: unknown) => {
        if (table === teamSessions) {
          return {
            where: vi.fn(() => ({
              orderBy: vi.fn(() => ({
                all: vi.fn().mockResolvedValue(sessions),
              })),
            })),
          };
        }
        if (table === roundVotes) {
          return {
            where: vi.fn(() => ({
              all: vi.fn().mockResolvedValue(rounds),
            })),
          };
        }
        if (table === voteRecords) {
          return {
            innerJoin: vi.fn(() => ({
              where: vi.fn(() => ({
                all: vi.fn().mockResolvedValue(votes),
              })),
            })),
          };
        }
        throw new Error("Unexpected select table");
      },
    }));

    vi.mocked(drizzle).mockReturnValue({ select } as any);

    const repo = new StatsRepository(mockD1 as any);
    const result = await repo.getTeamInsights(1, { limit: 6 });

    expect(result).not.toBeNull();
    expect(result?.sessionsAnalyzed).toBe(2);
    expect(result?.totalTickets).toBe(2);
    expect(result?.totalRounds).toBe(3);
    expect(result?.participationRate).toBeCloseTo(100, 1);
    expect(result?.firstRoundConsensusRate).toBeCloseTo(50, 1);
    expect(result?.discussionRate).toBeCloseTo(50, 1);
    expect(result?.estimationVelocity).toBeCloseTo(1, 1);
    expect(result?.questionMarkRate).toBeCloseTo(20, 1);
  });
});

describe("StatsRepository getWorkspaceInsights", () => {
  let mockD1: {
    batch: ReturnType<typeof vi.fn>;
    prepare: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockD1 = {
      batch: vi.fn().mockResolvedValue(undefined),
      prepare: vi.fn(() => ({
        bind: vi.fn(() => ({})),
      })),
    };
  });

  it("returns null when no team IDs provided", async () => {
    vi.mocked(drizzle).mockReturnValue({} as any);

    const repo = new StatsRepository(mockD1 as any);
    const result = await repo.getWorkspaceInsights([]);

    expect(result).toBeNull();
  });

  it("aggregates insights across multiple teams", async () => {
    const sessions = [
      { roomKey: "room-a", teamId: 1, completedAt: 2000 },
      { roomKey: "room-b", teamId: 2, completedAt: 1000 },
    ];
    const rounds = [
      {
        roomKey: "room-a",
        roundId: "r1",
        ticketId: "T1",
        roundEndedAt: 0,
      },
      {
        roomKey: "room-b",
        roundId: "r2",
        ticketId: "T2",
        roundEndedAt: 3600000,
      },
    ];
    const votes = [
      { roundId: "r1", userName: "Alice", vote: "3", roomKey: "room-a" },
      { roundId: "r1", userName: "Bob", vote: "3", roomKey: "room-a" },
      { roundId: "r2", userName: "Cara", vote: "5", roomKey: "room-b" },
    ];

    const select = vi.fn(() => ({
      from: (table: unknown) => {
        if (table === teamSessions) {
          return {
            where: vi.fn(() => ({
              orderBy: vi.fn(() => ({
                all: vi.fn().mockResolvedValue(sessions),
              })),
            })),
          };
        }
        if (table === roundVotes) {
          return {
            where: vi.fn(() => ({
              all: vi.fn().mockResolvedValue(rounds),
            })),
          };
        }
        if (table === voteRecords) {
          return {
            innerJoin: vi.fn(() => ({
              where: vi.fn(() => ({
                all: vi.fn().mockResolvedValue(votes),
              })),
            })),
          };
        }
        throw new Error("Unexpected select table");
      },
    }));

    vi.mocked(drizzle).mockReturnValue({ select } as any);

    const repo = new StatsRepository(mockD1 as any);
    const result = await repo.getWorkspaceInsights([1, 2]);

    expect(result).not.toBeNull();
    expect(result?.sessionsAnalyzed).toBe(2);
    expect(result?.teamCount).toBe(2);
    expect(result?.totalVotes).toBe(3);
    expect(result?.totalRounds).toBe(2);
    expect(result?.topContributors).toHaveLength(3);
    expect(result?.topContributors[0].userName).toBe("Alice");
  });
});

describe("StatsRepository getSessionStats", () => {
  let mockD1: {
    batch: ReturnType<typeof vi.fn>;
    prepare: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockD1 = {
      batch: vi.fn().mockResolvedValue(undefined),
      prepare: vi.fn(() => ({
        bind: vi.fn(() => ({})),
      })),
    };
  });

  it("returns null when no rounds found", async () => {
    const select = vi.fn(() => ({
      from: () => ({
        where: vi.fn(() => ({
          all: vi.fn().mockResolvedValue([]),
        })),
        innerJoin: vi.fn(() => ({
          where: vi.fn(() => ({
            all: vi.fn().mockResolvedValue([]),
          })),
        })),
      }),
    }));

    vi.mocked(drizzle).mockReturnValue({ select } as any);

    const repo = new StatsRepository(mockD1 as any);
    const result = await repo.getSessionStats("nonexistent");

    expect(result).toBeNull();
  });

  it("calculates session stats correctly", async () => {
    const rounds = [
      { roomKey: "room-a", roundId: "r1", ticketId: "T1", roundEndedAt: 0 },
      {
        roomKey: "room-a",
        roundId: "r2",
        ticketId: "T1",
        roundEndedAt: 600000,
      },
    ];
    const votes = [
      { roundId: "r1", userName: "Alice", vote: "3" },
      { roundId: "r1", userName: "Bob", vote: "3" },
      { roundId: "r2", userName: "Alice", vote: "5" },
      { roundId: "r2", userName: "Bob", vote: "5" },
    ];

    const select = vi.fn(() => ({
      from: (table: unknown) => {
        if (table === roundVotes) {
          return {
            where: vi.fn(() => ({
              all: vi.fn().mockResolvedValue(rounds),
            })),
          };
        }
        if (table === voteRecords) {
          return {
            innerJoin: vi.fn(() => ({
              where: vi.fn(() => ({
                all: vi.fn().mockResolvedValue(votes),
              })),
            })),
          };
        }
        throw new Error("Unexpected select table");
      },
    }));

    vi.mocked(drizzle).mockReturnValue({ select } as any);

    const repo = new StatsRepository(mockD1 as any);
    const result = await repo.getSessionStats("room-a");

    expect(result).not.toBeNull();
    expect(result?.roomKey).toBe("room-a");
    expect(result?.totalRounds).toBe(2);
    expect(result?.totalVotes).toBe(4);
    expect(result?.uniqueParticipants).toBe(2);
    expect(result?.consensusRate).toBe(100);
    expect(result?.discussionRate).toBe(100);
    expect(result?.durationMinutes).toBe(10);
  });
});
