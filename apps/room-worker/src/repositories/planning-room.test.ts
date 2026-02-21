import { describe, it, expect, vi } from "vitest";
import type { DurableObjectStorage } from "@cloudflare/workers-types";
import type { RoomData, RoomGameSession } from "@sprintjam/types";
import { createInitialRoomData } from "@sprintjam/utils";
import {
  roomMeta,
  roomUsers,
  roomVotes,
} from "@sprintjam/db/durable-objects/schemas";

import { PlanningRoomRepository } from "./planning-room";

const makeStorage = (): DurableObjectStorage =>
  ({
    sql: {
      exec: vi.fn().mockReturnValue({ toArray: vi.fn().mockReturnValue([]) }),
    },
    transactionSync: vi.fn((fn: () => unknown) => fn()),
    transaction: vi.fn(async (fn: (txn: unknown) => unknown) => fn({})),
    get: vi.fn(),
    put: vi.fn(),
  }) as unknown as DurableObjectStorage;

const makeRepository = () =>
  new PlanningRoomRepository(makeStorage(), {
    encrypt: vi.fn(async (value: string) => value),
    decrypt: vi.fn(async (value: string) => value),
  } as any);

describe("PlanningRoomRepository game session persistence", () => {
  it("stores gameSession in room_meta when replacing room data", async () => {
    const repository = makeRepository();
    const capturedMetaRows: Array<Record<string, unknown>> = [];

    const tx = {
      insert: vi.fn(() => ({
        values: (values: Record<string, unknown>) => {
          if ("roomKey" in values) {
            capturedMetaRows.push(values);
          }
          return {
            onConflictDoUpdate: () => ({ run: vi.fn() }),
            run: vi.fn(),
          };
        },
      })),
      delete: vi.fn(() => ({ run: vi.fn() })),
    };

    const db = {
      transaction: vi.fn((fn: (transaction: typeof tx) => void) => fn(tx)),
    };

    Object.defineProperty(repository, "db", { value: db });

    const roomData: RoomData = createInitialRoomData({
      key: "room-persist",
      users: ["mod"],
      moderator: "mod",
      connectedUsers: { mod: true },
    });
    const gameSession: RoomGameSession = {
      type: "emoji-story",
      startedBy: "mod",
      startedAt: Date.now(),
      round: 2,
      status: "active",
      participants: ["mod"],
      leaderboard: { mod: 4 },
      moves: [],
      events: [],
    };
    roomData.gameSession = gameSession;

    await repository.replaceRoomData(roomData);

    expect(capturedMetaRows).toHaveLength(1);
    expect(capturedMetaRows[0].gameSession).toBe(JSON.stringify(gameSession));
  });

  it("loads gameSession from room_meta", async () => {
    const repository = makeRepository();
    const roomData: RoomData = createInitialRoomData({
      key: "room-load",
      users: ["mod"],
      moderator: "mod",
      connectedUsers: { mod: true },
    });
    const gameSession: RoomGameSession = {
      type: "word-chain",
      startedBy: "mod",
      startedAt: Date.now(),
      round: 3,
      status: "active",
      participants: ["mod"],
      leaderboard: { mod: 6 },
      moves: [],
      events: [],
    };

    const row = {
      id: 1,
      roomKey: roomData.key,
      moderator: roomData.moderator,
      showVotes: 0,
      roomStatus: "active",
      passcode: null,
      judgeScore: null,
      judgeMetadata: null,
      settings: JSON.stringify(roomData.settings),
      currentStrudelCode: null,
      currentStrudelGenerationId: null,
      strudelPhase: null,
      strudelIsPlaying: 0,
      currentTicketId: null,
      timerSeconds: null,
      timerLastUpdated: null,
      timerIsPaused: null,
      timerTargetDuration: null,
      timerRoundAnchor: null,
      timerAutoReset: null,
      gameSession: JSON.stringify(gameSession),
    };

    const db = {
      select: vi.fn(() => ({
        from: vi.fn((table: unknown) => {
          if (table === roomMeta) {
            return {
              where: vi.fn(() => ({
                get: vi.fn(() => row),
              })),
            };
          }

          if (table === roomUsers) {
            return {
              orderBy: vi.fn(() => ({
                all: vi.fn(() => [
                  {
                    userName: "mod",
                    avatar: null,
                    isConnected: 1,
                    isSpectator: 0,
                  },
                ]),
              })),
            };
          }

          if (table === roomVotes) {
            return {
              all: vi.fn(() => []),
            };
          }

          throw new Error("Unexpected table query");
        }),
      })),
    };

    Object.defineProperty(repository, "db", { value: db });
    vi.spyOn(repository, "getCurrentTicket").mockReturnValue(undefined);
    vi.spyOn(repository, "getTicketQueue").mockReturnValue([]);

    const loaded = await repository.getRoomData();

    expect(loaded?.gameSession).toEqual(gameSession);
  });
});
