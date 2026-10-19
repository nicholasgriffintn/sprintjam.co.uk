import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  DurableObjectNamespace,
  DurableObjectState,
  RateLimit,
  WebSocket as CfWebSocket,
} from "@cloudflare/workers-types";
import type { RoomData, RoomWorkerEnv } from "@sprintjam/types";
import { createInitialRoomData, generateSessionToken } from "@sprintjam/utils";

import { PlanningRoom } from ".";
import { MODERATOR_HANDOVER_DELAY_MS } from "./moderator-handover";

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
  addEventListener: ReturnType<typeof vi.fn>;
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

  return server;
};

const getHandler = (socket: TestSocket, eventName: "message" | "close") => {
  const handler = socket.addEventListener.mock.calls.find(
    ([registeredEvent]) => registeredEvent === eventName,
  )?.[1];

  if (!handler) {
    throw new Error(`Expected ${eventName} handler to be registered`);
  }

  return handler as (event?: MessageEvent) => Promise<void>;
};

const getMessageHandler = (socket: TestSocket) =>
  getHandler(socket, "message") as (event: MessageEvent) => Promise<void>;

describe("PlanningRoom session completed-room guards", () => {
  let env: RoomWorkerEnv;

  beforeEach(() => {
    env = {
      PLANNING_ROOM: {} as DurableObjectNamespace,
      JOIN_RATE_LIMITER: {} as RateLimit,
      OAUTH_RATE_LIMITER: {} as RateLimit,
      FEEDBACK_RATE_LIMITER: {} as RateLimit,
      TOKEN_ENCRYPTION_SECRET: "test-secret",
      STATS_WORKER: {} as any,
      AUTH_WORKER: {} as any,
    };
  });

  it("allows party game websocket messages on completed rooms", async () => {
    const state = makeState();
    const room = new PlanningRoom(state, env);
    const token = generateSessionToken();
    const roomData: RoomData = {
      ...createInitialRoomData({
        key: "room-games-completed",
        users: ["alice"],
        moderator: "alice",
        connectedUsers: { alice: true },
      }),
      status: "completed",
    };

    room.getRoomData = vi.fn(async () => roomData);
    room.broadcast = vi.fn();
    room.repository = {
      validateSessionToken: vi.fn(() => true),
      setUserConnection: vi.fn(),
      setSessionToken: vi.fn(),
    } as any;
    room.handleStartGame = vi.fn();
    room.handleSubmitGameMove = vi.fn();
    room.handleEndGame = vi.fn();
    room.handleVote = vi.fn();

    const socket = makeSocketPair();

    await room.handleSession(
      socket as unknown as CfWebSocket,
      "room-games-completed",
      "alice",
      token,
    );

    const onMessage = getMessageHandler(socket);

    await onMessage({
      data: JSON.stringify({ type: "startGame", gameType: "emoji-story" }),
    } as MessageEvent);
    await onMessage({
      data: JSON.stringify({ type: "submitGameMove", value: "rocket" }),
    } as MessageEvent);
    await onMessage({
      data: JSON.stringify({ type: "endGame" }),
    } as MessageEvent);
    await onMessage({
      data: JSON.stringify({ type: "vote", vote: "5" }),
    } as MessageEvent);

    expect(room.handleStartGame).toHaveBeenCalledWith("alice", "emoji-story");
    expect(room.handleSubmitGameMove).toHaveBeenCalledWith("alice", "rocket");
    expect(room.handleEndGame).toHaveBeenCalledWith("alice");
    expect(room.handleVote).not.toHaveBeenCalled();
  });

  it("marks an explicit leave as disconnected even if duplicate sessions exist", async () => {
    const state = makeState();
    const room = new PlanningRoom(state, env);
    const token = generateSessionToken();
    const roomData: RoomData = createInitialRoomData({
      key: "room-leave",
      users: ["alice", "bob"],
      moderator: "alice",
      connectedUsers: { alice: true, bob: true },
    });

    room.getRoomData = vi.fn(async () => roomData);
    room.broadcast = vi.fn();
    room.repository = {
      validateSessionToken: vi.fn(() => true),
      setUserConnection: vi.fn(),
      setSessionToken: vi.fn(),
    } as any;

    const firstSocket = makeSocketPair();
    const duplicateSocket = makeSocketPair();

    await room.handleSession(
      firstSocket as unknown as CfWebSocket,
      "room-leave",
      "bob",
      token,
    );
    await room.handleSession(
      duplicateSocket as unknown as CfWebSocket,
      "room-leave",
      "bob",
      token,
    );

    vi.mocked(room.broadcast).mockClear();
    vi.mocked(room.repository.setUserConnection).mockClear();

    const onMessage = getMessageHandler(firstSocket);
    await onMessage({
      data: JSON.stringify({ type: "leaveRoom" }),
    } as MessageEvent);

    expect(room.sessions.size).toBe(0);
    expect(firstSocket.close).toHaveBeenCalledWith(1000, "User left the room");
    expect(duplicateSocket.close).toHaveBeenCalledWith(
      1000,
      "User left the room",
    );
    expect(room.repository.setUserConnection).toHaveBeenCalledWith(
      "bob",
      false,
    );
    expect(room.repository.setSessionToken).toHaveBeenCalledWith(
      "bob",
      expect.any(String),
    );
    expect(room.broadcast).toHaveBeenCalledWith({
      type: "userConnectionStatus",
      roomKey: "room-leave",
      user: "bob",
      isConnected: false,
    });
  });

  it("broadcasts explicit leave when persisted connection state is already disconnected", async () => {
    const state = makeState();
    const room = new PlanningRoom(state, env);
    const token = generateSessionToken();
    const roomData: RoomData = createInitialRoomData({
      key: "room-leave-stale-client",
      users: ["alice", "bob"],
      moderator: "alice",
      connectedUsers: { alice: true, bob: false },
    });

    room.getRoomData = vi.fn(async () => roomData);
    room.broadcast = vi.fn();
    room.repository = {
      validateSessionToken: vi.fn(() => true),
      setUserConnection: vi.fn(),
      setSessionToken: vi.fn(),
    } as any;

    const socket = makeSocketPair();

    await room.handleSession(
      socket as unknown as CfWebSocket,
      "room-leave-stale-client",
      "bob",
      token,
    );

    vi.mocked(room.broadcast).mockClear();
    vi.mocked(room.repository.setUserConnection).mockClear();

    const onMessage = getMessageHandler(socket);
    await onMessage({
      data: JSON.stringify({ type: "leaveRoom" }),
    } as MessageEvent);

    expect(room.repository.setUserConnection).toHaveBeenCalledWith(
      "bob",
      false,
    );
    expect(room.repository.setSessionToken).toHaveBeenCalledWith(
      "bob",
      expect.any(String),
    );
    expect(room.broadcast).toHaveBeenCalledWith({
      type: "userConnectionStatus",
      roomKey: "room-leave-stale-client",
      user: "bob",
      isConnected: false,
    });
  });

  it("closes a socket whose session token is invalidated before it is marked connected", async () => {
    const state = makeState();
    const room = new PlanningRoom(state, env);
    const token = generateSessionToken();
    const roomData: RoomData = createInitialRoomData({
      key: "room-stale-token",
      users: ["alice"],
      moderator: "alice",
      connectedUsers: { alice: false },
    });

    room.getRoomData = vi.fn(async () => roomData);
    room.broadcast = vi.fn();
    room.repository = {
      validateSessionToken: vi
        .fn()
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false),
      setUserConnection: vi.fn(),
      setSessionToken: vi.fn(),
    } as any;

    const socket = makeSocketPair();

    await room.handleSession(
      socket as unknown as CfWebSocket,
      "room-stale-token",
      "alice",
      token,
    );

    expect(socket.accept).toHaveBeenCalled();
    expect(socket.close).toHaveBeenCalledWith(4003, "Invalid session token");
    expect(room.repository.setUserConnection).not.toHaveBeenCalled();
    expect(room.broadcast).not.toHaveBeenCalledWith({
      type: "userConnectionStatus",
      roomKey: "room-stale-token",
      user: "alice",
      isConnected: true,
    });
  });
});

describe("PlanningRoom moderator handover", () => {
  let env: RoomWorkerEnv;

  beforeEach(() => {
    vi.useFakeTimers();
    env = {
      PLANNING_ROOM: {} as DurableObjectNamespace,
      JOIN_RATE_LIMITER: {} as RateLimit,
      OAUTH_RATE_LIMITER: {} as RateLimit,
      FEEDBACK_RATE_LIMITER: {} as RateLimit,
      TOKEN_ENCRYPTION_SECRET: "test-secret",
      STATS_WORKER: {} as any,
      AUTH_WORKER: {} as any,
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const setupRoom = async () => {
    const room = new PlanningRoom(makeState(), env);
    const roomData: RoomData = createInitialRoomData({
      key: "room-handover",
      users: ["alice", "bob"],
      moderator: "alice",
      connectedUsers: { alice: true, bob: true },
    });
    roomData.settings.autoHandoverModerator = true;

    room.getRoomData = vi.fn(async () => roomData);
    room.broadcast = vi.fn();
    room.repository = {
      validateSessionToken: vi.fn(() => true),
      setUserConnection: vi.fn(),
      setSessionToken: vi.fn(),
      setModerator: vi.fn((moderator: string) => {
        roomData.moderator = moderator;
      }),
    } as any;

    const moderatorSocket = makeSocketPair();
    await room.handleSession(
      moderatorSocket as unknown as CfWebSocket,
      "room-handover",
      "alice",
      generateSessionToken(),
    );
    vi.mocked(room.broadcast).mockClear();

    return { room, roomData, moderatorSocket };
  };

  it("waits before handing over and warns the room", async () => {
    const { room, moderatorSocket } = await setupRoom();

    await getHandler(moderatorSocket, "close")();

    expect(room.broadcast).toHaveBeenCalledWith({
      type: "moderatorHandoverPending",
      moderator: "alice",
      handoverAt: Date.now() + MODERATOR_HANDOVER_DELAY_MS,
    });
    expect(room.repository.setModerator).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(MODERATOR_HANDOVER_DELAY_MS);

    expect(room.repository.setModerator).toHaveBeenCalledWith("bob");
    expect(room.broadcast).toHaveBeenCalledWith({
      type: "newModerator",
      moderator: "bob",
    });
  });

  it("keeps the moderator when they reconnect before the timeout", async () => {
    const { room, moderatorSocket } = await setupRoom();

    await getHandler(moderatorSocket, "close")();
    await vi.advanceTimersByTimeAsync(MODERATOR_HANDOVER_DELAY_MS / 2);

    await room.handleSession(
      makeSocketPair() as unknown as CfWebSocket,
      "room-handover",
      "alice",
      generateSessionToken(),
    );
    await vi.advanceTimersByTimeAsync(MODERATOR_HANDOVER_DELAY_MS);

    expect(room.broadcast).toHaveBeenCalledWith({
      type: "moderatorHandoverCancelled",
      moderator: "alice",
    });
    expect(room.repository.setModerator).not.toHaveBeenCalled();
    expect(room.pendingModeratorHandover).toBeNull();
  });
});
