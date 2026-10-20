import { describe, it, expect, vi } from "vitest";
import type {
  DurableObjectNamespace,
  RateLimit,
  DurableObjectState,
} from "@cloudflare/workers-types";
import type { RoomWorkerEnv, RoomData } from "@sprintjam/types";
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

const setupRoom = (roomData: RoomData) => {
  const room = new PlanningRoom(makeState(), env);
  room.repository = {
    setUserSpectatorMode: vi.fn((userName: string, isSpectator: boolean) => {
      roomData.users = roomData.users.filter((user) => user !== userName);
      roomData.spectators = (roomData.spectators ?? []).filter(
        (user) => user !== userName,
      );
      if (isSpectator) {
        roomData.spectators.push(userName);
      } else {
        roomData.users.push(userName);
      }
    }),
    deleteUserVote: vi.fn((userName: string) => {
      delete roomData.votes[userName];
    }),
  } as unknown as PlanningRoom["repository"];
  room.broadcast = vi.fn();
  room.getRoomData = vi.fn(async () => roomData);
  room.calculateAndUpdateJudgeScore = vi.fn();
  return room;
};

describe("PlanningRoom spectator toggle", () => {
  it("broadcasts refreshed anonymous votes and completion when a voter becomes a spectator", async () => {
    const roomData = createInitialRoomData({
      key: "room-1",
      users: ["alice", "bob", "carol"],
      moderator: "alice",
      connectedUsers: { alice: true, bob: true, carol: true },
      settings: { anonymousVotes: true },
    });
    roomData.votes = { bob: "3", carol: "5" };
    const room = setupRoom(roomData);

    await room.handleToggleSpectator("bob", true);

    expect(room.broadcast).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "spectatorStatusChanged",
        user: "bob",
        users: ["alice", "carol"],
        spectators: ["bob"],
        votes: { "Anonymous 2": "5" },
        votingCompletion: expect.objectContaining({
          completedCount: 1,
          totalCount: 2,
        }),
      }),
    );
  });

  it("recalculates the judge score when a revealed vote is removed", async () => {
    const roomData = createInitialRoomData({
      key: "room-1",
      users: ["alice", "bob"],
      moderator: "alice",
      connectedUsers: { alice: true, bob: true },
      settings: { enableJudge: true },
    });
    roomData.votes = { alice: "3", bob: "13" };
    roomData.showVotes = true;
    const room = setupRoom(roomData);

    await room.handleToggleSpectator("bob", true);

    expect(room.calculateAndUpdateJudgeScore).toHaveBeenCalled();
  });
});
