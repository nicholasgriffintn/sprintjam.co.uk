import { describe, it, expect, vi } from "vitest";
import type {
  DurableObjectNamespace,
  RateLimit,
  DurableObjectState,
} from "@cloudflare/workers-types";
import type { RoomWorkerEnv, RoomData, TimerState } from "@sprintjam/types";
import { createInitialRoomData } from "@sprintjam/utils";

import { PlanningRoom } from ".";

const makeState = () => {
  const sqlStub = {
    exec: vi.fn().mockReturnValue({ toArray: vi.fn().mockReturnValue([]) }),
  };

  return {
    storage: {
      sql: sqlStub as any,
      transactionSync: vi.fn((fn: () => void) => fn()),
      transaction: vi.fn(async (fn: (txn: any) => void) =>
        fn({ sql: sqlStub }),
      ),
      get: vi.fn(),
      put: vi.fn(),
    },
    blockConcurrencyWhile: vi.fn(async (fn: () => Promise<void>) => fn()),
  } as unknown as DurableObjectState;
};

const env: RoomWorkerEnv = {
  PLANNING_ROOM: {} as DurableObjectNamespace,
  JOIN_RATE_LIMITER: {} as RateLimit,
  OAUTH_RATE_LIMITER: {} as RateLimit,
  FEEDBACK_RATE_LIMITER: {} as RateLimit,
  TOKEN_ENCRYPTION_SECRET: "test-secret",
  STATS_WORKER: {} as any,
  AUTH_WORKER: {} as any,
};

const setupRoom = (timerState: TimerState) => {
  const roomData: RoomData = createInitialRoomData({
    key: "room-1",
    users: ["alice"],
    moderator: "alice",
    connectedUsers: { alice: true },
    settings: { enableTicketQueue: true },
  });
  roomData.timerState = timerState;

  const room = new PlanningRoom(makeState(), env);
  room.repository = {
    getTicketQueue: vi.fn(() => []),
    getTicketById: vi.fn(),
    updateTicket: vi.fn(),
    setCurrentTicket: vi.fn(),
    clearVotes: vi.fn(),
    clearStructuredVotes: vi.fn(),
    setShowVotes: vi.fn(),
    setJudgeState: vi.fn(),
    updateTimerConfig: vi.fn(),
  } as unknown as PlanningRoom["repository"];
  room.broadcast = vi.fn();
  room.getRoomData = vi.fn(async () => roomData);
  return room;
};

describe("PlanningRoom ticket transitions", () => {
  it("resets the round countdown when moving to the next ticket", async () => {
    const room = setupRoom({
      running: false,
      seconds: 90,
      lastUpdateTime: 0,
      targetDurationSeconds: 120,
      roundAnchorSeconds: 0,
      autoResetOnVotesReset: true,
    });

    await room.handleNextTicket("alice");

    expect(room.repository.updateTimerConfig).toHaveBeenCalledWith({
      roundAnchorSeconds: 90,
    });
    expect(room.broadcast).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "timerUpdated",
        timerState: expect.objectContaining({ roundAnchorSeconds: 90 }),
      }),
    );
  });

  it("keeps the round countdown when auto reset is disabled", async () => {
    const room = setupRoom({
      running: false,
      seconds: 90,
      lastUpdateTime: 0,
      targetDurationSeconds: 120,
      roundAnchorSeconds: 0,
      autoResetOnVotesReset: false,
    });

    await room.handleNextTicket("alice");

    expect(room.repository.updateTimerConfig).not.toHaveBeenCalled();
  });
});
