import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  roundVotes,
  voteRecords,
  roomStats,
  teamSessions,
  standupSessionStats,
  wheelSessionStats,
  retroSessionStats,
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
      type: "reset",
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
      if (table === roomStats) {
        const onConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
        const values = vi.fn(() => ({ onConflictDoUpdate }));
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
      type: "reset",
    });

    expect(insert).toHaveBeenCalledWith(roundVotes);
    expect(insert).toHaveBeenCalledWith(voteRecords);
    expect(insert).toHaveBeenCalledWith(roomStats);
  });
});

describe("StatsRepository recordStandupSessionStats", () => {
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

  it("stores derived standup metrics in the stats table", async () => {
    const onConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
    const values = vi.fn(() => ({ onConflictDoUpdate }));
    const insert = vi.fn((table) => {
      if (table !== standupSessionStats) {
        throw new Error("Unexpected insert table");
      }

      return { values };
    });

    vi.mocked(drizzle).mockReturnValue({ insert } as any);

    const repo = new StatsRepository(mockD1 as any);
    await repo.recordStandupSessionStats({
      roomKey: "standup-a",
      totalParticipants: 3,
      responses: [
        {
          healthCheck: 4,
          hasBlocker: true,
          blockerResolved: false,
          linkedTicketCount: 2,
          hasKudos: true,
        },
        {
          healthCheck: 2,
          hasBlocker: false,
          linkedTicketCount: 0,
          hasKudos: false,
        },
      ],
    });

    expect(insert).toHaveBeenCalledWith(standupSessionStats);
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        roomKey: "standup-a",
        totalParticipants: 3,
        responsesSubmitted: 2,
        healthScoreTotal: 6,
        healthResponseCount: 2,
        blockerCount: 1,
        unresolvedBlockerCount: 1,
        linkedTicketCount: 2,
        kudosCount: 1,
      }),
    );
    expect(onConflictDoUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        target: standupSessionStats.roomKey,
        set: expect.objectContaining({
          responsesSubmitted: 2,
          healthScoreTotal: 6,
          blockerCount: 1,
        }),
      }),
    );
  });
});

describe("StatsRepository recordWheelSessionStats", () => {
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

  it("stores derived wheel metrics in the stats table", async () => {
    const onConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
    const values = vi.fn(() => ({ onConflictDoUpdate }));
    const insert = vi.fn((table) => {
      if (table !== wheelSessionStats) {
        throw new Error("Unexpected insert table");
      }

      return { values };
    });

    vi.mocked(drizzle).mockReturnValue({ insert } as any);

    const repo = new StatsRepository(mockD1 as any);
    await repo.recordWheelSessionStats({
      roomKey: "wheel-a",
      mode: "reviewer",
      totalParticipants: 4,
      entryCount: 3,
      enabledEntryCount: 2,
      results: [
        { winner: "Ava", removedAfter: false },
        { winner: "Ben", removedAfter: true },
        { winner: "Ava", removedAfter: false },
      ],
    });

    expect(insert).toHaveBeenCalledWith(wheelSessionStats);
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        roomKey: "wheel-a",
        mode: "reviewer",
        totalParticipants: 4,
        entryCount: 3,
        enabledEntryCount: 2,
        spinCount: 3,
        uniqueWinnerCount: 2,
        removedAfterCount: 1,
        repeatWinnerCount: 1,
      }),
    );
    expect(onConflictDoUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        target: wheelSessionStats.roomKey,
        set: expect.objectContaining({
          spinCount: 3,
          uniqueWinnerCount: 2,
          repeatWinnerCount: 1,
        }),
      }),
    );
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
      {
        id: 1,
        roomKey: "room-a",
        teamId: 1,
        completedAt: 2000,
        metadata: null,
      },
      {
        roomKey: "room-b",
        teamId: 1,
        completedAt: 1000,
        metadata: '{"type":"standup"}',
      },
    ];
    const standupStats = [
      {
        roomKey: "room-b",
        totalParticipants: 3,
        responsesSubmitted: 2,
        healthScoreTotal: 6,
        healthResponseCount: 2,
        blockerCount: 1,
        unresolvedBlockerCount: 1,
        linkedTicketCount: 2,
        kudosCount: 1,
        lastUpdatedAt: 1,
      },
    ];
    const wheelStats: [] = [];
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
        if (table === standupSessionStats) {
          return {
            where: vi.fn(() => ({
              all: vi.fn().mockResolvedValue(standupStats),
            })),
          };
        }
        if (table === wheelSessionStats) {
          return {
            where: vi.fn(() => ({
              all: vi.fn().mockResolvedValue(wheelStats),
            })),
          };
        }
        if (table === retroSessionStats) {
          return {
            where: vi.fn(() => ({
              all: vi.fn().mockResolvedValue([]),
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
    expect(result?.sessionTypeCounts).toEqual({
      all: 2,
      planning: 1,
      standup: 1,
      wheel: 0,
      retro: 0,
    });
    expect(result?.standup.sessionsAnalyzed).toBe(1);
    expect(result?.wheel.sessionsAnalyzed).toBe(0);
    expect(result?.standup.responseRate).toBeCloseTo(66.7, 1);
    expect(result?.standup.averageHealth).toBe(3);
    expect(result?.standup.blockerRate).toBe(50);
    expect(result?.standup.linkedTicketCount).toBe(2);
    expect(result?.totalTickets).toBe(2);
    expect(result?.totalRounds).toBe(3);
    expect(result?.participationRate).toBeCloseTo(100, 1);
    expect(result?.firstRoundConsensusRate).toBeCloseTo(50, 1);
    expect(result?.discussionRate).toBeCloseTo(50, 1);
    expect(result?.estimationVelocity).toBeCloseTo(1, 1);
    expect(result?.questionMarkRate).toBeCloseTo(20, 1);
  });

  it("returns completed standup and wheel insight counts without planning rounds", async () => {
    const sessions = [
      {
        roomKey: "standup-a",
        teamId: 1,
        completedAt: 2000,
        metadata: '{"type":"standup"}',
      },
      {
        roomKey: "wheel-a",
        teamId: 1,
        completedAt: 1000,
        metadata: '{"type":"wheel"}',
      },
    ];
    const standupStats = [
      {
        roomKey: "standup-a",
        totalParticipants: 2,
        responsesSubmitted: 2,
        healthScoreTotal: 5,
        healthResponseCount: 2,
        blockerCount: 2,
        unresolvedBlockerCount: 1,
        linkedTicketCount: 1,
        kudosCount: 0,
        lastUpdatedAt: 1,
      },
    ];
    const wheelStats = [
      {
        roomKey: "wheel-a",
        mode: "reviewer",
        totalParticipants: 3,
        entryCount: 3,
        enabledEntryCount: 2,
        spinCount: 3,
        uniqueWinnerCount: 2,
        removedAfterCount: 1,
        repeatWinnerCount: 1,
        lastUpdatedAt: 1,
      },
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
              all: vi.fn().mockResolvedValue([]),
            })),
          };
        }
        if (table === voteRecords) {
          return {
            innerJoin: vi.fn(() => ({
              where: vi.fn(() => ({
                all: vi.fn().mockResolvedValue([]),
              })),
            })),
          };
        }
        if (table === standupSessionStats) {
          return {
            where: vi.fn(() => ({
              all: vi.fn().mockResolvedValue(standupStats),
            })),
          };
        }
        if (table === wheelSessionStats) {
          return {
            where: vi.fn(() => ({
              all: vi.fn().mockResolvedValue(wheelStats),
            })),
          };
        }
        if (table === retroSessionStats) {
          return {
            where: vi.fn(() => ({
              all: vi.fn().mockResolvedValue([]),
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
    expect(result?.sessionTypeCounts).toEqual({
      all: 2,
      planning: 0,
      standup: 1,
      wheel: 1,
      retro: 0,
    });
    expect(result?.totalRounds).toBe(0);
    expect(result?.standup.sessionsAnalyzed).toBe(1);
    expect(result?.standup.averageHealth).toBe(2.5);
    expect(result?.standup.unresolvedBlockerRate).toBe(50);
    expect(result?.wheel.sessionsAnalyzed).toBe(1);
    expect(result?.wheel.spinCount).toBe(3);
    expect(result?.wheel.repeatWinnerRate).toBeCloseTo(33.3, 1);
  });

  it("includes active wheel sessions once Stats Worker has wheel stats", async () => {
    const sessions = [
      {
        roomKey: "wheel-active",
        teamId: 1,
        createdAt: 3000,
        completedAt: null,
        metadata: '{"type":"wheel"}',
      },
    ];
    const wheelStats = [
      {
        roomKey: "wheel-active",
        mode: "facilitator",
        totalParticipants: 1,
        entryCount: 6,
        enabledEntryCount: 6,
        spinCount: 4,
        uniqueWinnerCount: 4,
        removedAfterCount: 0,
        repeatWinnerCount: 0,
        lastUpdatedAt: 1,
      },
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
        if (table === standupSessionStats) {
          return {
            where: vi.fn(() => ({
              all: vi.fn().mockResolvedValue([]),
            })),
          };
        }
        if (table === wheelSessionStats) {
          return {
            where: vi.fn(() => ({
              all: vi.fn().mockResolvedValue(wheelStats),
            })),
          };
        }
        if (table === retroSessionStats) {
          return {
            where: vi.fn(() => ({
              all: vi.fn().mockResolvedValue([]),
            })),
          };
        }
        if (table === roundVotes) {
          return {
            where: vi.fn(() => ({
              all: vi.fn().mockResolvedValue([]),
            })),
          };
        }
        if (table === voteRecords) {
          return {
            innerJoin: vi.fn(() => ({
              where: vi.fn(() => ({
                all: vi.fn().mockResolvedValue([]),
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
    expect(result?.sessionsAnalyzed).toBe(1);
    expect(result?.sessionTypeCounts).toEqual({
      all: 1,
      planning: 0,
      standup: 0,
      wheel: 1,
      retro: 0,
    });
    expect(result?.wheel.sessionsAnalyzed).toBe(1);
    expect(result?.wheel.spinCount).toBe(4);
    expect(result?.wheel.uniqueWinnerRate).toBe(100);
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
      {
        id: 1,
        roomKey: "room-a",
        teamId: 1,
        completedAt: 2000,
        metadata: null,
      },
      {
        roomKey: "room-b",
        teamId: 2,
        completedAt: 1000,
        metadata: '{"type":"standup"}',
      },
    ];
    const standupStats = [
      {
        roomKey: "room-b",
        totalParticipants: 4,
        responsesSubmitted: 3,
        healthScoreTotal: 12,
        healthResponseCount: 3,
        blockerCount: 1,
        unresolvedBlockerCount: 0,
        linkedTicketCount: 2,
        kudosCount: 2,
        lastUpdatedAt: 1,
      },
    ];
    const wheelStats: [] = [];
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
        if (table === standupSessionStats) {
          return {
            where: vi.fn(() => ({
              all: vi.fn().mockResolvedValue(standupStats),
            })),
          };
        }
        if (table === wheelSessionStats) {
          return {
            where: vi.fn(() => ({
              all: vi.fn().mockResolvedValue(wheelStats),
            })),
          };
        }
        if (table === retroSessionStats) {
          return {
            where: vi.fn(() => ({
              all: vi.fn().mockResolvedValue([]),
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
    expect(result?.sessionTypeCounts.standup).toBe(1);
    expect(result?.standup.sessionsAnalyzed).toBe(1);
    expect(result?.wheel.sessionsAnalyzed).toBe(0);
    expect(result?.standup.responseRate).toBe(75);
    expect(result?.teamCount).toBe(2);
    expect(result?.totalVotes).toBe(3);
    expect(result?.totalRounds).toBe(2);
    expect(result?.topContributors).toHaveLength(3);
    expect(result?.topContributors[0].userName).toBe("Alice");
  });

  it("includes active wheel sessions with recorded wheel stats", async () => {
    const sessions = [
      {
        roomKey: "wheel-active",
        teamId: 2,
        createdAt: 3000,
        completedAt: null,
        metadata: '{"type":"wheel"}',
      },
    ];
    const wheelStats = [
      {
        roomKey: "wheel-active",
        mode: "facilitator",
        totalParticipants: 1,
        entryCount: 6,
        enabledEntryCount: 6,
        spinCount: 4,
        uniqueWinnerCount: 4,
        removedAfterCount: 0,
        repeatWinnerCount: 0,
        lastUpdatedAt: 1,
      },
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
        if (table === standupSessionStats) {
          return {
            where: vi.fn(() => ({
              all: vi.fn().mockResolvedValue([]),
            })),
          };
        }
        if (table === wheelSessionStats) {
          return {
            where: vi.fn(() => ({
              all: vi.fn().mockResolvedValue(wheelStats),
            })),
          };
        }
        if (table === retroSessionStats) {
          return {
            where: vi.fn(() => ({
              all: vi.fn().mockResolvedValue([]),
            })),
          };
        }
        if (table === roundVotes) {
          return {
            where: vi.fn(() => ({
              all: vi.fn().mockResolvedValue([]),
            })),
          };
        }
        if (table === voteRecords) {
          return {
            innerJoin: vi.fn(() => ({
              where: vi.fn(() => ({
                all: vi.fn().mockResolvedValue([]),
              })),
            })),
          };
        }
        throw new Error("Unexpected select table");
      },
    }));

    vi.mocked(drizzle).mockReturnValue({ select } as any);

    const repo = new StatsRepository(mockD1 as any);
    const result = await repo.getWorkspaceInsights([2]);

    expect(result).not.toBeNull();
    expect(result?.sessionsAnalyzed).toBe(1);
    expect(result?.sessionTypeCounts.wheel).toBe(1);
    expect(result?.wheel.spinCount).toBe(4);
    expect(result?.wheel.uniqueWinnerRate).toBe(100);
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
