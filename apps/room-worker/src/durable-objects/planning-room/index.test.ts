import { describe, it, expect, vi, beforeEach } from "vitest";
import type {
  DurableObjectNamespace,
  RateLimit,
  DurableObjectState,
  WebSocket as CfWebSocket,
} from "@cloudflare/workers-types";
import type { RoomWorkerEnv, RoomData } from '@sprintjam/types';
import { generateSessionToken, createInitialRoomData } from "@sprintjam/utils";
import { MIN_TIMER_DURATION_SECONDS } from "@sprintjam/utils/constants";

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

type TestSocket = {
  sent: string[];
  accept: ReturnType<typeof vi.fn>;
  send: (payload: string) => void;
  close: ReturnType<typeof vi.fn>;
  addEventListener: (
    type: string,
    handler: (msg: MessageEvent) => void,
  ) => void;
};

const makeSocketPair = () => {
  const server: TestSocket = {
    sent: [],
    accept: vi.fn(),
    send: vi.fn((payload: string) => {
      server.sent.push(payload);
    }),
    close: vi.fn(),
    addEventListener: vi.fn(),
  };
  const client: Partial<CfWebSocket> = {};
  return { server, client: client as CfWebSocket };
};

describe("PlanningRoom WebSocket auth", () => {
  let env: RoomWorkerEnv;

  beforeEach(() => {
    env = {
      PLANNING_ROOM: {} as DurableObjectNamespace,
      JOIN_RATE_LIMITER: {} as RateLimit,
      OAUTH_RATE_LIMITER: {} as RateLimit,
      FEEDBACK_RATE_LIMITER: {} as RateLimit,
      TOKEN_ENCRYPTION_SECRET: "test-secret",
      STATS_WORKER: {} as any,
    };
  });

  it("rejects expired tokens with 4003 close", async () => {
    const state = makeState();
    const room = new PlanningRoom(state, env);
    const token = generateSessionToken();

    const storedRoom: RoomData = createInitialRoomData({
      key: "room-1",
      users: ["alice"],
      moderator: "alice",
      connectedUsers: { alice: true },
    });

    room.getRoomData = async () => storedRoom;
    room.broadcast = vi.fn();
    room.repository = {
      validateSessionToken: () => false,
      setUserConnection: vi.fn(),
    } as any;

    const { server } = makeSocketPair();
    await room.handleSession(
      server as unknown as CfWebSocket,
      "room-1",
      "alice",
      token,
    );

    expect(server.accept).toHaveBeenCalled();
    expect(server.close).toHaveBeenCalledWith(4003, "Invalid session token");
    expect(
      server.sent.some((msg) => msg.includes("Invalid or expired session")),
    ).toBe(true);
  });

  it("closes existing sockets when a new session is issued for the same user (4004)", async () => {
    const state = makeState();
    const room = new PlanningRoom(state, env);
    const token1 = generateSessionToken();

    const storedRoom: RoomData = createInitialRoomData({
      key: "room-2",
      users: ["bob"],
      moderator: "bob",
      connectedUsers: { bob: true },
    });

    room.getRoomData = async () => storedRoom;
    room.broadcast = vi.fn();
    room.repository = {
      validateSessionToken: (u: string, t: string) =>
        u.toLowerCase() === "bob" && t === token1,
      setUserConnection: vi.fn(),
    } as any;

    const { server: ws1 } = makeSocketPair();
    await room.handleSession(
      ws1 as unknown as CfWebSocket,
      "room-2",
      "bob",
      token1,
    );

    room.disconnectUserSessions("bob");

    expect(ws1.close).toHaveBeenCalledWith(4004, "Session superseded");
  });

  it("prunes broken sockets during broadcast", () => {
    const state = makeState();
    const room = new PlanningRoom(state, env);
    const badSocket = {
      send: vi.fn(() => {
        throw new Error("boom");
      }),
      close: vi.fn(),
    } as unknown as CfWebSocket;
    const goodSocket = {
      send: vi.fn(),
      close: vi.fn(),
    } as unknown as CfWebSocket;

    room.sessions.set(badSocket, {
      webSocket: badSocket,
      roomKey: "r",
      userName: "u1",
    });
    room.sessions.set(goodSocket, {
      webSocket: goodSocket,
      roomKey: "r",
      userName: "u2",
    });

    room.broadcast({ type: "ping" });

    expect(room.sessions.has(badSocket)).toBe(false);
    expect(room.sessions.has(goodSocket)).toBe(true);
  });

  it("skips blockConcurrencyWhile when requested", async () => {
    const blockSpy = vi.fn(async (fn: () => Promise<any>) => fn());
    const state = {
      ...makeState(),
      blockConcurrencyWhile: blockSpy,
    };
    const room = new PlanningRoom(state as unknown as DurableObjectState, env);
    room.repository = {
      getRoomData: vi.fn().mockResolvedValue({
        key: "r1",
        users: [],
        votes: {},
        connectedUsers: {},
        showVotes: false,
        moderator: "mod",
        settings: {
          estimateOptions: [1],
          allowOthersToShowEstimates: false,
          allowOthersToDeleteEstimates: false,
          showTimer: false,
          showUserPresence: true,
          showAverage: false,
          showMedian: false,
          showTopVotes: false,
          topVotesCount: 0,
          anonymousVotes: false,
          enableJudge: false,
          judgeAlgorithm: "simpleAverage",
          enableTicketQueue: false,
        },
      }),
    } as any;

    const callsBefore = blockSpy.mock.calls.length;
    const data = await room.getRoomData();

    expect(data?.key).toBe("r1");
    expect(blockSpy.mock.calls.length).toBe(callsBefore);
  });
});

describe("PlanningRoom critical flows", () => {
  let env: RoomWorkerEnv;

  beforeEach(() => {
    env = {
      PLANNING_ROOM: {} as DurableObjectNamespace,
      JOIN_RATE_LIMITER: {} as RateLimit,
      OAUTH_RATE_LIMITER: {} as RateLimit,
      FEEDBACK_RATE_LIMITER: {} as RateLimit,
      TOKEN_ENCRYPTION_SECRET: "test-secret",
      STATS_WORKER: {} as any,
    };
    vi.useRealTimers();
  });

  it("clears invalid votes and judge state when estimate options change", async () => {
    const state = makeState();
    const room = new PlanningRoom(state, env);
    const roomData: RoomData = createInitialRoomData({
      key: "room-3",
      users: ["mod"],
      moderator: "mod",
      connectedUsers: { mod: true },
      settings: {
        ...createInitialRoomData({
          key: "room-3",
          users: [],
          moderator: "mod",
          connectedUsers: {},
        }).settings,
        estimateOptions: [1, 2, 3],
        enableJudge: true,
      },
    });
    roomData.votes = { mod: "5" };
    roomData.structuredVotes = { mod: { criteriaScores: { a: 5 } } as any };
    roomData.judgeScore = 8;
    roomData.judgeMetadata = {
      confidence: "high",
      needsDiscussion: false,
      reasoning: "",
      algorithm: "simpleAverage",
    } as any;

    const repository = {
      setSettings: vi.fn(),
      clearVotes: vi.fn(),
      clearStructuredVotes: vi.fn(),
      setShowVotes: vi.fn(),
      setJudgeState: vi.fn(),
    } as unknown as PlanningRoom["repository"];

    room.repository = repository;
    room.broadcast = vi.fn();
    room.getRoomData = vi.fn(async () => roomData);

    await room.handleUpdateSettings("mod", { estimateOptions: [1, 2] });

    expect(roomData.votes).toEqual({});
    expect(roomData.structuredVotes).toEqual({});
    expect(roomData.showVotes).toBe(false);
    expect(roomData.judgeScore).toBeNull();
    expect(roomData.judgeMetadata).toBeUndefined();
    expect(repository.clearVotes).toHaveBeenCalled();
    expect(repository.clearStructuredVotes).toHaveBeenCalled();
    expect(repository.setJudgeState).toHaveBeenCalledWith(null);
    expect(room.broadcast).toHaveBeenCalledWith(
      expect.objectContaining({ type: "resetVotes" }),
    );
    expect(room.broadcast).toHaveBeenCalledWith(
      expect.objectContaining({ type: "settingsUpdated" }),
    );
  });

  it("clamps and broadcasts timer configuration updates", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:00:30Z"));

    const state = makeState();
    const room = new PlanningRoom(state, env);
    const roomData: RoomData = createInitialRoomData({
      key: "room-4",
      users: ["alice"],
      moderator: "alice",
      connectedUsers: { alice: true },
    });
    roomData.timerState = {
      running: false,
      seconds: 30,
      lastUpdateTime: 0,
      targetDurationSeconds: 120,
      roundAnchorSeconds: 0,
      autoResetOnVotesReset: true,
    };

    const updateTimerConfig = vi.fn();
    room.repository = {
      updateTimerConfig,
    } as unknown as PlanningRoom["repository"];
    room.broadcast = vi.fn();
    room.getRoomData = vi.fn(async () => roomData);

    await room.handleConfigureTimer("alice", {
      targetDurationSeconds: 10,
      autoResetOnVotesReset: false,
      resetCountdown: true,
    });

    expect(roomData.timerState?.targetDurationSeconds).toBe(
      MIN_TIMER_DURATION_SECONDS,
    );
    expect(roomData.timerState?.autoResetOnVotesReset).toBe(false);
    expect(roomData.timerState?.roundAnchorSeconds).toBe(30);
    expect(updateTimerConfig).toHaveBeenCalledWith({
      targetDurationSeconds: MIN_TIMER_DURATION_SECONDS,
      autoResetOnVotesReset: false,
      roundAnchorSeconds: 30,
    });
    expect(room.broadcast).toHaveBeenCalledWith(
      expect.objectContaining({ type: "timerUpdated" }),
    );
  });

  it("rejects invalid vote options and avoids persisting or broadcasting", async () => {
    const state = makeState();
    const room = new PlanningRoom(state, env);
    const roomData: RoomData = createInitialRoomData({
      key: "room-5",
      users: ["mod", "alice"],
      moderator: "mod",
      connectedUsers: { mod: true, alice: true },
      settings: {
        ...createInitialRoomData({
          key: "room-5",
          users: [],
          moderator: "mod",
          connectedUsers: {},
        }).settings,
        estimateOptions: [1, 2],
      },
    });

    const repository = {
      setVote: vi.fn(),
      setStructuredVote: vi.fn(),
      setShowVotes: vi.fn(),
      clearVotes: vi.fn(),
      clearStructuredVotes: vi.fn(),
      setJudgeState: vi.fn(),
      setSettings: vi.fn(),
    } as unknown as PlanningRoom["repository"];

    room.repository = repository;
    room.broadcast = vi.fn();
    room.getRoomData = vi.fn(async () => roomData);

    await room.handleVote("alice", "99");

    expect(repository.setVote).not.toHaveBeenCalled();
    expect(room.broadcast).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: "vote" }),
    );
    expect(roomData.votes["alice"]).toBeUndefined();
  });

  it("auto-ends emoji-story after 5 rounds", async () => {
    const state = makeState();
    const room = new PlanningRoom(state, env);
    const roomData: RoomData = createInitialRoomData({
      key: "room-emoji",
      users: ["alice"],
      moderator: "alice",
      connectedUsers: { alice: true },
    });

    room.broadcast = vi.fn();
    room.getRoomData = vi.fn(async () => roomData);
    room.putRoomData = vi.fn(async () => undefined);

    await room.handleStartGame("alice", "emoji-story");
    expect(roomData.gameSession?.round).toBe(1);

    const emojiSequence = ["😀", "😃", "😄", "😁", "😆", "😅"];
    for (let index = 1; index <= 30; index += 1) {
      const emoji = emojiSequence[(index - 1) % emojiSequence.length];
      await room.handleSubmitGameMove("alice", emoji);
    }

    expect(roomData.gameSession?.moves).toHaveLength(30);
    expect(roomData.gameSession?.round).toBe(6);
    expect(roomData.gameSession?.status).toBe("completed");
    expect(roomData.gameSession?.winner).toBe("alice");
    expect(room.broadcast).toHaveBeenCalledWith(
      expect.objectContaining({ type: "gameEnded", endedBy: "system" }),
    );
  });

  it("blocks consecutive moves from the same user when multiplayer", async () => {
    const state = makeState();
    const room = new PlanningRoom(state, env);
    const roomData: RoomData = createInitialRoomData({
      key: "room-multiplayer",
      users: ["alice", "bob"],
      moderator: "alice",
      connectedUsers: { alice: true, bob: true },
    });

    room.broadcast = vi.fn();
    room.getRoomData = vi.fn(async () => roomData);
    room.putRoomData = vi.fn(async () => undefined);

    await room.handleStartGame("alice", "emoji-story");
    await room.handleSubmitGameMove("alice", "🎯");
    await room.handleSubmitGameMove("alice", "🔥");

    expect(roomData.gameSession?.moves).toHaveLength(1);
    expect(roomData.gameSession?.moves[0]?.value).toBe("🎯");

    await room.handleSubmitGameMove("bob", "🚀");
    expect(roomData.gameSession?.moves).toHaveLength(2);
  });

  it("auto-ends guess-the-number after 5 rounds", async () => {
    const state = makeState();
    const room = new PlanningRoom(state, env);
    const roomData: RoomData = createInitialRoomData({
      key: "room-guess",
      users: ["alice"],
      moderator: "alice",
      connectedUsers: { alice: true },
    });

    room.broadcast = vi.fn();
    room.getRoomData = vi.fn(async () => roomData);
    room.putRoomData = vi.fn(async () => undefined);
    room.getNumberTarget = vi.fn(() => 20);
    room.setNumberTarget = vi.fn();

    await room.handleStartGame("alice", "guess-the-number");

    for (let index = 1; index <= 50; index += 1) {
      await room.handleSubmitGameMove("alice", "1");
    }

    expect(roomData.gameSession?.status).toBe("completed");
    expect(roomData.gameSession?.round).toBe(6);
    expect(roomData.gameSession?.winner).toBe("alice");
    expect(room.broadcast).toHaveBeenCalledWith(
      expect.objectContaining({ type: "gameEnded", endedBy: "system" }),
    );
  });

  it("does not assign a winner when scores are tied", async () => {
    const state = makeState();
    const room = new PlanningRoom(state, env);
    const roomData: RoomData = createInitialRoomData({
      key: "room-tie",
      users: ["alice", "bob"],
      moderator: "alice",
      connectedUsers: { alice: true, bob: true },
    });

    room.broadcast = vi.fn();
    room.getRoomData = vi.fn(async () => roomData);
    room.putRoomData = vi.fn(async () => undefined);

    await room.handleStartGame("alice", "emoji-story");
    await room.handleSubmitGameMove("alice", "🎯");
    await room.handleSubmitGameMove("bob", "🎉");
    await room.handleEndGame("alice");

    expect(roomData.gameSession?.status).toBe("completed");
    expect(roomData.gameSession?.winner).toBeUndefined();
  });

  it("rejects emoji-story moves containing non-emoji text", async () => {
    const state = makeState();
    const room = new PlanningRoom(state, env);
    const roomData: RoomData = createInitialRoomData({
      key: "room-emoji-validate-text",
      users: ["alice"],
      moderator: "alice",
      connectedUsers: { alice: true },
    });

    room.broadcast = vi.fn();
    room.getRoomData = vi.fn(async () => roomData);
    room.putRoomData = vi.fn(async () => undefined);

    await room.handleStartGame("alice", "emoji-story");
    await room.handleSubmitGameMove("alice", "hello");

    expect(roomData.gameSession?.moves).toHaveLength(0);
    expect(roomData.gameSession?.leaderboard.alice).toBe(0);
  });

  it("rejects emoji-story moves above emoji limit", async () => {
    const state = makeState();
    const room = new PlanningRoom(state, env);
    const roomData: RoomData = createInitialRoomData({
      key: "room-emoji-validate-max",
      users: ["alice"],
      moderator: "alice",
      connectedUsers: { alice: true },
    });

    room.broadcast = vi.fn();
    room.getRoomData = vi.fn(async () => roomData);
    room.putRoomData = vi.fn(async () => undefined);

    await room.handleStartGame("alice", "emoji-story");
    await room.handleSubmitGameMove("alice", "😀😃😄😁😆😅😂");

    expect(roomData.gameSession?.moves).toHaveLength(0);
    expect(roomData.gameSession?.leaderboard.alice).toBe(0);
  });

  it("accepts emoji-story move at emoji limit", async () => {
    const state = makeState();
    const room = new PlanningRoom(state, env);
    const roomData: RoomData = createInitialRoomData({
      key: "room-emoji-validate-ok",
      users: ["alice"],
      moderator: "alice",
      connectedUsers: { alice: true },
    });

    room.broadcast = vi.fn();
    room.getRoomData = vi.fn(async () => roomData);
    room.putRoomData = vi.fn(async () => undefined);

    await room.handleStartGame("alice", "emoji-story");
    await room.handleSubmitGameMove("alice", "😀 😃 😄 😁 😆 😅");

    expect(roomData.gameSession?.moves).toHaveLength(1);
    expect(roomData.gameSession?.leaderboard.alice).toBe(1);
  });

  it("persists structured votes and broadcasts structured payloads", async () => {
    const state = makeState();
    const room = new PlanningRoom(state, env);
    const roomData: RoomData = createInitialRoomData({
      key: "room-6",
      users: ["alice"],
      moderator: "alice",
      connectedUsers: { alice: true },
      settings: {
        ...createInitialRoomData({
          key: "room-6",
          users: [],
          moderator: "alice",
          connectedUsers: {},
        }).settings,
        enableStructuredVoting: true,
      },
    });

    const repository = {
      setVote: vi.fn(),
      setStructuredVote: vi.fn(),
      setShowVotes: vi.fn(),
      clearVotes: vi.fn(),
      clearStructuredVotes: vi.fn(),
      setJudgeState: vi.fn(),
      setSettings: vi.fn(),
    } as unknown as PlanningRoom["repository"];

    room.repository = repository;
    room.broadcast = vi.fn();
    room.getRoomData = vi.fn(async () => roomData);

    await room.handleVote("alice", {
      criteriaScores: { impact: 5, effort: 1 },
    } as any);

    expect(repository.setStructuredVote).toHaveBeenCalledWith(
      "alice",
      expect.objectContaining({
        criteriaScores: { impact: 5, effort: 1 },
      }),
    );
    expect(room.broadcast).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "vote",
        structuredVote: expect.objectContaining({
          criteriaScores: { impact: 5, effort: 1 },
        }),
      }),
    );
  });

  it("respects moderator-only showVotes when disallowed for others", async () => {
    const state = makeState();
    const room = new PlanningRoom(state, env);
    const roomData: RoomData = createInitialRoomData({
      key: "room-7",
      users: ["mod", "guest"],
      moderator: "mod",
      connectedUsers: { mod: true, guest: true },
      settings: {
        ...createInitialRoomData({
          key: "room-7",
          users: [],
          moderator: "mod",
          connectedUsers: {},
        }).settings,
        allowOthersToShowEstimates: false,
      },
    });

    const repository = {
      setShowVotes: vi.fn(),
      setSettings: vi.fn(),
    } as unknown as PlanningRoom["repository"];

    room.repository = repository;
    room.broadcast = vi.fn();
    room.getRoomData = vi.fn(async () => roomData);

    await room.handleShowVotes("guest");

    expect(repository.setShowVotes).not.toHaveBeenCalled();
    expect(room.broadcast).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: "showVotes" }),
    );
    expect(roomData.showVotes).toBe(false);
  });

  it("auto-resets timer anchor on resetVotes when configured", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:00:45Z"));

    const state = makeState();
    const room = new PlanningRoom(state, env);
    const roomData: RoomData = createInitialRoomData({
      key: "room-8",
      users: ["mod"],
      moderator: "mod",
      connectedUsers: { mod: true },
    });
    roomData.timerState = {
      running: false,
      seconds: 15,
      lastUpdateTime: 0,
      targetDurationSeconds: 120,
      roundAnchorSeconds: 0,
      autoResetOnVotesReset: true,
    };

    const repository = {
      clearVotes: vi.fn(),
      clearStructuredVotes: vi.fn(),
      setShowVotes: vi.fn(),
      setJudgeState: vi.fn(),
      updateTimerConfig: vi.fn(),
      setSettings: vi.fn(),
    } as unknown as PlanningRoom["repository"];

    room.repository = repository;
    room.broadcast = vi.fn();
    room.getRoomData = vi.fn(async () => roomData);

    await room.handleResetVotes("mod");

    expect(repository.updateTimerConfig).toHaveBeenCalledWith({
      roundAnchorSeconds: 15,
    });
    expect(room.broadcast).toHaveBeenCalledWith(
      expect.objectContaining({ type: "timerUpdated" }),
    );
  });

  it("skips judge calculation when estimate options are non-numeric", async () => {
    const state = makeState();
    const room = new PlanningRoom(state, env);
    const roomData: RoomData = createInitialRoomData({
      key: "room-judge",
      users: ["mod", "alice"],
      moderator: "mod",
      connectedUsers: { mod: true, alice: true },
      settings: {
        estimateOptions: ["XS", "S", "M"],
        enableJudge: true,
      },
    });
    roomData.votes = { mod: "XS", alice: "M" };
    roomData.showVotes = true;

    const setJudgeState = vi.fn();
    room.repository = {
      setJudgeState,
    } as unknown as PlanningRoom["repository"];
    room.broadcast = vi.fn();
    room.getRoomData = vi.fn(async () => roomData);

    await room.calculateAndUpdateJudgeScore();

    expect(roomData.judgeScore).toBeNull();
    expect(roomData.judgeMetadata).toBeUndefined();
    expect(setJudgeState).toHaveBeenCalledWith(null);
    expect(room.broadcast).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: "judgeScoreUpdated" }),
    );
  });

  it("clears current ticket without auto-creating when queue is empty", async () => {
    const state = makeState();
    const room = new PlanningRoom(state, env);
    const roomData: RoomData = createInitialRoomData({
      key: "room-9",
      users: ["mod"],
      moderator: "mod",
      connectedUsers: { mod: true },
      settings: {
        ...createInitialRoomData({
          key: "room-9",
          users: [],
          moderator: "mod",
          connectedUsers: {},
        }).settings,
        enableTicketQueue: true,
        externalService: "none",
      },
    });

    const repository = {
      getTicketQueue: vi.fn().mockReturnValue([]),
      getNextTicketId: vi.fn(),
      createTicket: vi.fn(),
      setCurrentTicket: vi.fn(),
      clearVotes: vi.fn(),
      clearStructuredVotes: vi.fn(),
      setShowVotes: vi.fn(),
      setJudgeState: vi.fn(),
    } as unknown as PlanningRoom["repository"];

    room.repository = repository;
    room.broadcast = vi.fn();
    room.getRoomData = vi.fn(async () => roomData);

    await room.handleNextTicket("mod");

    expect(repository.createTicket).not.toHaveBeenCalled();
    expect(repository.getNextTicketId).not.toHaveBeenCalled();
    expect(repository.setCurrentTicket).toHaveBeenCalledWith(null);
    expect(room.broadcast).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "nextTicket",
        ticket: null,
        queue: [],
      }),
    );
  });
});
