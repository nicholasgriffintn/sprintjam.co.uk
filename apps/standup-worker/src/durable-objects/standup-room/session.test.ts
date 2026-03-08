import { describe, expect, it, vi } from "vitest";
import type { StandupData } from "@sprintjam/types";
import type { StandupRoom } from ".";
import { handleSession } from "./session";

class MockWebSocket {
  handlers = new Map<string, (...args: any[]) => Promise<void> | void>();
  accept = vi.fn();
  send = vi.fn();
  close = vi.fn();

  addEventListener(
    type: string,
    callback: (...args: any[]) => Promise<void> | void,
  ) {
    this.handlers.set(type, callback);
  }
}

const createDeferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const baseStandupData: StandupData = {
  key: "standup",
  users: ["Alice"],
  moderator: "Alice",
  connectedUsers: { Alice: true },
  status: "active",
  responses: [],
  respondedUsers: [],
};

const standupWithResponses: StandupData = {
  ...baseStandupData,
  users: ["Alice", "Bob"],
  connectedUsers: { Alice: true, Bob: true },
  responses: [
    {
      userName: "Alice",
      yesterday: "Did stuff",
      today: "More stuff",
      hasBlocker: false,
      healthCheck: 4,
      submittedAt: 1000,
      updatedAt: 1000,
    },
    {
      userName: "Bob",
      yesterday: "Bob's work",
      today: "Bob's plan",
      hasBlocker: true,
      blockerDescription: "Blocked on deploy",
      healthCheck: 2,
      submittedAt: 2000,
      updatedAt: 2000,
    },
  ],
  respondedUsers: ["Alice", "Bob"],
};

describe("standup session", () => {
  it("rejects invalid session tokens", async () => {
    const standup = {
      sessions: new Map(),
      repository: {
        validateSessionToken: vi.fn().mockReturnValue(false),
        setUserConnection: vi.fn(),
      },
      getStandupData: vi.fn().mockResolvedValue(baseStandupData),
      broadcast: vi.fn(),
      sendToModerator: vi.fn(),
      sendToUser: vi.fn(),
      focusedUser: undefined,
    } as unknown as StandupRoom;

    const socket = new MockWebSocket();

    await handleSession(
      standup,
      socket as unknown as WebSocket,
      "standup",
      "Alice",
      "bad-token",
    );

    expect(socket.accept).toHaveBeenCalled();
    expect(socket.close).toHaveBeenCalledWith(4003, "Invalid session token");
  });

  it("sends full responses to facilitator on initialize", async () => {
    const standup = {
      sessions: new Map(),
      repository: {
        validateSessionToken: vi.fn().mockReturnValue(true),
        setUserConnection: vi.fn(),
      },
      getStandupData: vi.fn().mockResolvedValue(standupWithResponses),
      broadcast: vi.fn(),
      sendToModerator: vi.fn(),
      sendToUser: vi.fn(),
      focusedUser: undefined,
    } as unknown as StandupRoom;

    const socket = new MockWebSocket();

    await handleSession(
      standup,
      socket as unknown as WebSocket,
      "standup",
      "Alice",
      "valid-token",
    );

    // Find the initialize message
    const initCall = socket.send.mock.calls.find((call: string[]) => {
      const parsed = JSON.parse(call[0]);
      return parsed.type === "initialize";
    });
    expect(initCall).toBeDefined();

    const initPayload = JSON.parse(initCall![0]);
    // Alice is the moderator — she should see all responses
    expect(initPayload.standup.responses).toHaveLength(2);
    expect(initPayload.standup.responses[0].userName).toBe("Alice");
    expect(initPayload.standup.responses[1].userName).toBe("Bob");
  });

  it("sends only own response to non-facilitator on initialize", async () => {
    const standup = {
      sessions: new Map(),
      repository: {
        validateSessionToken: vi.fn().mockReturnValue(true),
        setUserConnection: vi.fn(),
      },
      getStandupData: vi.fn().mockResolvedValue(standupWithResponses),
      broadcast: vi.fn(),
      sendToModerator: vi.fn(),
      sendToUser: vi.fn(),
      focusedUser: undefined,
    } as unknown as StandupRoom;

    const socket = new MockWebSocket();

    await handleSession(
      standup,
      socket as unknown as WebSocket,
      "standup",
      "Bob",
      "valid-token",
    );

    const initCall = socket.send.mock.calls.find((call: string[]) => {
      const parsed = JSON.parse(call[0]);
      return parsed.type === "initialize";
    });
    expect(initCall).toBeDefined();

    const initPayload = JSON.parse(initCall![0]);
    // Bob is not the moderator — he should only see his own response
    expect(initPayload.standup.responses).toHaveLength(1);
    expect(initPayload.standup.responses[0].userName).toBe("Bob");
  });

  it("marks user disconnected on close before awaiting data", async () => {
    const deferred = createDeferred<StandupData>();
    const getStandupData = vi
      .fn()
      .mockResolvedValueOnce(baseStandupData) // session validate
      .mockResolvedValueOnce(baseStandupData) // data check
      .mockResolvedValueOnce(baseStandupData) // fresh data after connect
      .mockImplementationOnce(() => deferred.promise); // close handler

    const setUserConnection = vi.fn();

    const standup = {
      sessions: new Map(),
      repository: {
        validateSessionToken: vi.fn().mockReturnValue(true),
        setUserConnection,
      },
      getStandupData,
      broadcast: vi.fn(),
      sendToModerator: vi.fn(),
      sendToUser: vi.fn(),
      focusedUser: undefined,
    } as unknown as StandupRoom;

    const socket = new MockWebSocket();

    await handleSession(
      standup,
      socket as unknown as WebSocket,
      "standup",
      "Alice",
      "token",
    );

    const closeHandler = socket.handlers.get("close");
    if (!closeHandler) {
      throw new Error("Missing close handler");
    }

    const closePromise = closeHandler();

    expect(setUserConnection).toHaveBeenNthCalledWith(1, "Alice", true);
    expect(setUserConnection).toHaveBeenNthCalledWith(2, "Alice", false);

    deferred.resolve(baseStandupData);
    await closePromise;
  });

  it("does not reassign the moderator when they disconnect", async () => {
    const data: StandupData = {
      ...baseStandupData,
      users: ["Alice", "Bob"],
      connectedUsers: { Alice: true, Bob: true },
    };

    const broadcastSpy = vi.fn();

    const repository = {
      validateSessionToken: vi.fn().mockReturnValue(true),
      setUserConnection: vi.fn(),
    };

    const standup = {
      sessions: new Map(),
      repository,
      getStandupData: vi
        .fn()
        .mockResolvedValueOnce(data)
        .mockResolvedValueOnce(data)
        .mockResolvedValueOnce(data)
        .mockResolvedValueOnce({
          ...data,
          connectedUsers: { Alice: false, Bob: true },
        }),
      broadcast: broadcastSpy,
      sendToModerator: vi.fn(),
      sendToUser: vi.fn(),
      focusedUser: undefined,
    } as unknown as StandupRoom;

    const socket = new MockWebSocket();

    await handleSession(
      standup,
      socket as unknown as WebSocket,
      "standup",
      "Alice",
      "valid-token",
    );

    const closeHandler = socket.handlers.get("close");
    if (!closeHandler) {
      throw new Error("Missing close handler");
    }

    await closeHandler();

    expect(
      broadcastSpy.mock.calls.some(
        (call: Record<string, unknown>[]) => call[0].type === "newModerator",
      ),
    ).toBe(false);
  });

  it("responds to ping with pong", async () => {
    const standup = {
      sessions: new Map(),
      repository: {
        validateSessionToken: vi.fn().mockReturnValue(true),
        setUserConnection: vi.fn(),
      },
      getStandupData: vi.fn().mockResolvedValue(baseStandupData),
      broadcast: vi.fn(),
      sendToModerator: vi.fn(),
      sendToUser: vi.fn(),
      focusedUser: undefined,
    } as unknown as StandupRoom;

    const socket = new MockWebSocket();

    await handleSession(
      standup,
      socket as unknown as WebSocket,
      "standup",
      "Alice",
      "valid-token",
    );

    const messageHandler = socket.handlers.get("message");
    if (!messageHandler) {
      throw new Error("Missing message handler");
    }

    await messageHandler({ data: JSON.stringify({ type: "ping" }) });

    const pongCall = socket.send.mock.calls.find((call: string[]) => {
      const parsed = JSON.parse(call[0]);
      return parsed.type === "pong";
    });
    expect(pongCall).toBeDefined();
  });

  it("rejects facilitator-only actions from non-moderator", async () => {
    const data: StandupData = {
      ...baseStandupData,
      users: ["Alice", "Bob"],
      connectedUsers: { Alice: true, Bob: true },
    };

    const broadcastSpy = vi.fn();

    const standup = {
      sessions: new Map(),
      repository: {
        validateSessionToken: vi.fn().mockReturnValue(true),
        setUserConnection: vi.fn(),
        setStatus: vi.fn(),
      },
      getStandupData: vi.fn().mockResolvedValue(data),
      broadcast: broadcastSpy,
      sendToModerator: vi.fn(),
      sendToUser: vi.fn(),
      focusedUser: undefined,
    } as unknown as StandupRoom;

    const socket = new MockWebSocket();

    // Bob connects — not the moderator
    await handleSession(
      standup,
      socket as unknown as WebSocket,
      "standup",
      "Bob",
      "valid-token",
    );

    const messageHandler = socket.handlers.get("message");
    if (!messageHandler) {
      throw new Error("Missing message handler");
    }

    // Reset broadcast to track only post-init calls
    broadcastSpy.mockClear();

    await messageHandler({
      data: JSON.stringify({ type: "lockResponses" }),
    });

    // lockResponses should NOT have been broadcast — Bob isn't the moderator
    const lockCalls = broadcastSpy.mock.calls.filter(
      (call: Record<string, unknown>[]) => call[0].type === "responsesLocked",
    );
    expect(lockCalls).toHaveLength(0);
  });

  it("allows facilitator to lock responses", async () => {
    const broadcastSpy = vi.fn();
    const setStatusSpy = vi.fn();

    const standup = {
      sessions: new Map(),
      repository: {
        validateSessionToken: vi.fn().mockReturnValue(true),
        setUserConnection: vi.fn(),
        setStatus: setStatusSpy,
      },
      getStandupData: vi.fn().mockResolvedValue(baseStandupData),
      broadcast: broadcastSpy,
      sendToModerator: vi.fn(),
      sendToUser: vi.fn(),
      focusedUser: undefined,
    } as unknown as StandupRoom;

    const socket = new MockWebSocket();

    // Alice is the moderator
    await handleSession(
      standup,
      socket as unknown as WebSocket,
      "standup",
      "Alice",
      "valid-token",
    );

    const messageHandler = socket.handlers.get("message");
    if (!messageHandler) {
      throw new Error("Missing message handler");
    }

    broadcastSpy.mockClear();

    await messageHandler({
      data: JSON.stringify({ type: "lockResponses" }),
    });

    expect(setStatusSpy).toHaveBeenCalledWith("locked");
    const lockCalls = broadcastSpy.mock.calls.filter(
      (call: Record<string, unknown>[]) => call[0].type === "responsesLocked",
    );
    expect(lockCalls).toHaveLength(1);
  });

  it("allows facilitator to start and end presentation", async () => {
    const broadcastSpy = vi.fn();
    const setStatusSpy = vi.fn();

    const standup = {
      sessions: new Map(),
      repository: {
        validateSessionToken: vi.fn().mockReturnValue(true),
        setUserConnection: vi.fn(),
        setStatus: setStatusSpy,
      },
      getStandupData: vi.fn().mockResolvedValue(baseStandupData),
      broadcast: broadcastSpy,
      sendToModerator: vi.fn(),
      sendToUser: vi.fn(),
      focusedUser: undefined,
    } as unknown as StandupRoom;

    const socket = new MockWebSocket();

    await handleSession(
      standup,
      socket as unknown as WebSocket,
      "standup",
      "Alice",
      "valid-token",
    );

    const messageHandler = socket.handlers.get("message");
    if (!messageHandler) {
      throw new Error("Missing message handler");
    }

    broadcastSpy.mockClear();

    await messageHandler({
      data: JSON.stringify({ type: "startPresentation" }),
    });
    expect(setStatusSpy).toHaveBeenCalledWith("presenting");

    await messageHandler({
      data: JSON.stringify({ type: "endPresentation" }),
    });
    expect(setStatusSpy).toHaveBeenCalledWith("active");
  });

  it("allows facilitator to complete the standup", async () => {
    const broadcastSpy = vi.fn();
    const setStatusSpy = vi.fn();

    const standup = {
      sessions: new Map(),
      repository: {
        validateSessionToken: vi.fn().mockReturnValue(true),
        setUserConnection: vi.fn(),
        setStatus: setStatusSpy,
      },
      getStandupData: vi.fn().mockResolvedValue(baseStandupData),
      broadcast: broadcastSpy,
      sendToModerator: vi.fn(),
      sendToUser: vi.fn(),
      focusedUser: "Alice",
    } as unknown as StandupRoom;

    const socket = new MockWebSocket();

    await handleSession(
      standup,
      socket as unknown as WebSocket,
      "standup",
      "Alice",
      "valid-token",
    );

    const messageHandler = socket.handlers.get("message");
    if (!messageHandler) {
      throw new Error("Missing message handler");
    }

    broadcastSpy.mockClear();

    await messageHandler({
      data: JSON.stringify({ type: "completeStandup" }),
    });

    expect(setStatusSpy).toHaveBeenCalledWith("completed");
    expect(standup.focusedUser).toBeUndefined();
    expect(
      broadcastSpy.mock.calls.some(
        (call: Record<string, unknown>[]) =>
          call[0].type === "standupCompleted",
      ),
    ).toBe(true);
  });

  it("handles submitResponse and enforces visibility", async () => {
    const broadcastSpy = vi.fn();
    const sendToModeratorSpy = vi.fn();
    const sendToUserSpy = vi.fn();

    const data: StandupData = {
      ...baseStandupData,
      users: ["Alice", "Bob"],
      connectedUsers: { Alice: true, Bob: true },
    };

    const standup = {
      sessions: new Map(),
      repository: {
        validateSessionToken: vi.fn().mockReturnValue(true),
        setUserConnection: vi.fn(),
        submitResponse: vi.fn(),
        getRespondedUsers: vi.fn().mockReturnValue(["Bob"]),
        getResponse: vi.fn().mockReturnValue({
          userName: "Bob",
          yesterday: "Did work",
          today: "Will do more",
          hasBlocker: false,
          healthCheck: 4,
          submittedAt: 1000,
          updatedAt: 1000,
        }),
      },
      getStandupData: vi.fn().mockResolvedValue(data),
      broadcast: broadcastSpy,
      sendToModerator: sendToModeratorSpy,
      sendToUser: sendToUserSpy,
      focusedUser: undefined,
    } as unknown as StandupRoom;

    const socket = new MockWebSocket();

    // Bob submits a response
    await handleSession(
      standup,
      socket as unknown as WebSocket,
      "standup",
      "Bob",
      "valid-token",
    );

    const messageHandler = socket.handlers.get("message");
    if (!messageHandler) {
      throw new Error("Missing message handler");
    }

    broadcastSpy.mockClear();

    await messageHandler({
      data: JSON.stringify({
        type: "submitResponse",
        yesterday: "Did work",
        today: "Will do more",
        hasBlocker: false,
        healthCheck: 4,
      }),
    });

    // responseSubmitted broadcast should go to all — but only with username + flag
    const submitBroadcasts = broadcastSpy.mock.calls.filter(
      (call: Record<string, unknown>[]) => call[0].type === "responseSubmitted",
    );
    expect(submitBroadcasts).toHaveLength(1);
    expect(submitBroadcasts[0][0]).toEqual({
      type: "responseSubmitted",
      userName: "Bob",
      hasResponded: true,
      respondedUsers: ["Bob"],
    });

    // Full response data should only go to the moderator
    expect(sendToModeratorSpy).toHaveBeenCalledWith(
      "Alice",
      expect.objectContaining({
        type: "responseUpdated",
        response: expect.objectContaining({ userName: "Bob" }),
      }),
    );

    // Confirmation should go back to the submitter
    expect(sendToUserSpy).toHaveBeenCalledWith(
      "Bob",
      expect.objectContaining({
        type: "responseConfirmed",
        response: expect.objectContaining({ userName: "Bob" }),
      }),
    );
  });

  it("rejects malformed submitResponse payloads", async () => {
    const standup = {
      sessions: new Map(),
      repository: {
        validateSessionToken: vi.fn().mockReturnValue(true),
        setUserConnection: vi.fn(),
        submitResponse: vi.fn(),
        getRespondedUsers: vi.fn(),
        getResponse: vi.fn(),
      },
      getStandupData: vi.fn().mockResolvedValue(baseStandupData),
      broadcast: vi.fn(),
      sendToModerator: vi.fn(),
      sendToUser: vi.fn(),
      focusedUser: undefined,
    } as unknown as StandupRoom;

    const socket = new MockWebSocket();

    await handleSession(
      standup,
      socket as unknown as WebSocket,
      "standup",
      "Alice",
      "valid-token",
    );

    const messageHandler = socket.handlers.get("message");
    if (!messageHandler) {
      throw new Error("Missing message handler");
    }

    await messageHandler({
      data: JSON.stringify({
        type: "submitResponse",
        yesterday: "Did work",
        today: "Will do more",
        hasBlocker: false,
        healthCheck: 9,
        linkedTickets: [
          {
            id: "1",
            key: "PROJ-1",
            title: "Ticket",
            provider: "not-real",
          },
        ],
      }),
    });

    expect(standup.repository.submitResponse).not.toHaveBeenCalled();
    expect(
      socket.send.mock.calls.some((call: string[]) => {
        const parsed = JSON.parse(call[0]);
        return (
          parsed.type === "error" &&
          parsed.error === "Invalid submitResponse message"
        );
      }),
    ).toBe(true);
  });
});
