import { describe, it, expect, vi, beforeEach } from "vitest";
import { createInitialRoomData } from "@sprintjam/utils";
import { hashPasscode } from "@sprintjam/utils";
import type { PasscodeHashPayload, RoomData } from "@sprintjam/types";

import { handleHttpRequest } from ".";
import type { PlanningRoomHttpContext } from ".";

type TokenMap = Map<string, string>;

const makeContext = (options: {
  roomData: RoomData;
  passcodeHash?: PasscodeHashPayload | null;
  tokens?: TokenMap;
}) => {
  let currentRoom = options.roomData;
  const tokens = options.tokens ?? new Map<string, string>();

  const repository: PlanningRoomHttpContext["repository"] = {
    getPasscodeHash: () => options.passcodeHash ?? null,
    validateSessionToken: (userName: string, token: string | null) => {
      if (!token) return false;
      return tokens.get(userName.toLowerCase()) === token;
    },
    setSessionToken: (userName: string, token: string) => {
      tokens.set(userName.toLowerCase(), token);
    },
    ensureUser: vi.fn(),
    setUserConnection: vi.fn(),
    setUserAvatar: vi.fn(),
    setVote: vi.fn(),
    setStructuredVote: vi.fn(),
    setShowVotes: vi.fn(),
    clearVotes: vi.fn(),
    clearStructuredVotes: vi.fn(),
    setSettings: vi.fn(),
    updateTimerConfig: vi.fn(),
    saveJiraOAuthCredentials: vi.fn().mockResolvedValue(undefined),
    getJiraOAuthCredentials: vi.fn().mockResolvedValue(null),
    updateJiraOAuthTokens: vi.fn().mockResolvedValue(undefined),
    deleteJiraOAuthCredentials: vi.fn(),
    saveLinearOAuthCredentials: vi.fn().mockResolvedValue(undefined),
    getLinearOAuthCredentials: vi.fn().mockResolvedValue(null),
    updateLinearOAuthTokens: vi.fn().mockResolvedValue(undefined),
    deleteLinearOAuthCredentials: vi.fn(),
    saveGithubOAuthCredentials: vi.fn().mockResolvedValue(undefined),
    getGithubOAuthCredentials: vi.fn().mockResolvedValue(null),
    deleteGithubOAuthCredentials: vi.fn(),
  };

  const ctx: PlanningRoomHttpContext = {
    repository,
    getRoomData: async () => currentRoom,
    putRoomData: async (room: RoomData) => {
      currentRoom = room;
    },
    broadcast: vi.fn(),
    disconnectUserSessions: vi.fn(),
  };

  return { ctx, tokens };
};

const buildJoinRequest = (
  body: Record<string, unknown>,
  sessionToken?: string,
) =>
  new Request("https://dummy/join", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(sessionToken ? { Cookie: `room_session=${sessionToken}` } : {}),
    },
    body: JSON.stringify(body),
  });

const jsonRequest = (
  path: string,
  method: "GET" | "POST" | "PUT" | "DELETE",
  body?: Record<string, unknown>,
  sessionToken?: string,
) =>
  new Request(`https://dummy${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(sessionToken ? { Cookie: `room_session=${sessionToken}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

describe("planning-room-http join flow", () => {
  let baseRoom: RoomData;

  beforeEach(() => {
    baseRoom = createInitialRoomData({
      key: "room-123",
      users: ["Alice"],
      moderator: "Alice",
      connectedUsers: { Alice: false },
    });
  });

  it("rejects when the username is currently connected and no valid token is provided", async () => {
    baseRoom.connectedUsers = { Alice: true };
    const { ctx } = makeContext({ roomData: baseRoom });

    const response = (await handleHttpRequest(
      ctx,
      buildJoinRequest({ name: "Alice" }),
    )) as Response;

    expect(response.status).toBe(409);
    const payload = (await response.json()) as any;
    expect(payload.error).toMatch(/already connected/i);
  });

  it("allows rejoin with the same name when previously disconnected (no stored token), issuing a new token", async () => {
    baseRoom.connectedUsers = { Alice: false };
    const passcodeHash = await hashPasscode("secret");
    const { ctx, tokens } = makeContext({
      roomData: baseRoom,
      passcodeHash,
    });

    const response = (await handleHttpRequest(
      ctx,
      buildJoinRequest({ name: "Alice", passcode: "secret" }),
    )) as Response;

    expect(response.status).toBe(200);
    const payload = (await response.json()) as any;
    expect(payload.success).toBe(true);
    expect(tokens.size).toBe(1);
    expect(response.headers.get("Set-Cookie")).toMatch(/room_session=/);
  });

  it("allows a currently connected username when a valid session token is supplied", async () => {
    baseRoom.connectedUsers = { Alice: true };
    const tokens = new Map<string, string>([["alice", "valid-token"]]);
    const { ctx } = makeContext({ roomData: baseRoom, tokens });

    const response = (await handleHttpRequest(
      ctx,
      buildJoinRequest({ name: "alice" }, "valid-token"),
    )) as Response;

    expect(response.status).toBe(200);
    const payload = (await response.json()) as any;
    expect(payload.success).toBe(true);
  });
});

describe("planning-room-http permissions and state updates", () => {
  let baseRoom: RoomData;

  beforeEach(() => {
    baseRoom = createInitialRoomData({
      key: "room-777",
      users: ["Alice", "Bob"],
      moderator: "Alice",
      connectedUsers: { Alice: true, Bob: true },
    });
    vi.useRealTimers();
  });

  it("blocks non-moderators from toggling showVotes when not allowed", async () => {
    const { ctx } = makeContext({ roomData: baseRoom });

    const response = (await handleHttpRequest(
      ctx,
      jsonRequest("/showVotes", "POST", { name: "Bob" }),
    )) as Response;

    expect(response.status).toBe(403);
    const payload = (await response.json()) as any;
    expect(payload.error).toMatch(/only the moderator/i);
  });

  it("resets votes and timer anchors when auto reset is enabled", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:00:30Z"));

    baseRoom.votes = { Alice: "5" };
    baseRoom.structuredVotes = { Alice: { criteriaScores: { c1: 3 } } as any };
    baseRoom.timerState = {
      running: false,
      seconds: 45,
      lastUpdateTime: 0,
      targetDurationSeconds: 120,
      roundAnchorSeconds: 0,
      autoResetOnVotesReset: true,
    };
    const { ctx } = makeContext({ roomData: baseRoom });

    const response = (await handleHttpRequest(
      ctx,
      jsonRequest("/resetVotes", "POST", { name: "Alice" }),
    )) as Response;

    expect(response.status).toBe(200);
    expect(ctx.repository.clearVotes).toHaveBeenCalled();
    expect(ctx.repository.clearStructuredVotes).toHaveBeenCalled();
    expect(ctx.repository.updateTimerConfig).toHaveBeenCalledWith({
      roundAnchorSeconds: 45,
    });
    expect(ctx.broadcast).toHaveBeenCalledWith(
      expect.objectContaining({ type: "timerUpdated" }),
    );
  });

  it("rejects settings read without session token", async () => {
    const { ctx } = makeContext({ roomData: baseRoom });

    const response = (await handleHttpRequest(
      ctx,
      new Request("https://dummy/settings?name=Alice", { method: "GET" }),
    )) as Response;

    expect(response.status).toBe(401);
  });

  it("rejects settings update from non-moderators even with valid token", async () => {
    const tokens = new Map<string, string>([["bob", "valid"]]);
    const { ctx } = makeContext({ roomData: baseRoom, tokens });

    const response = (await handleHttpRequest(
      ctx,
      jsonRequest("/settings", "PUT", {
        name: "Bob",
        sessionToken: "valid",
        settings: baseRoom.settings,
      }),
    )) as Response;

    expect(response.status).toBe(403);
    expect(ctx.repository.setSettings).not.toHaveBeenCalled();
  });

  it("initializes a new room and issues auth token", async () => {
    let storedRoom: RoomData | undefined;
    const tokens = new Map<string, string>();
    const repository: PlanningRoomHttpContext["repository"] = {
      getPasscodeHash: vi.fn().mockReturnValue(null),
      validateSessionToken: vi.fn().mockReturnValue(false),
      setSessionToken: vi.fn((user, token) =>
        tokens.set(user.toLowerCase(), token),
      ),
      ensureUser: vi.fn(),
      setUserConnection: vi.fn(),
      setUserAvatar: vi.fn(),
      setVote: vi.fn(),
      setStructuredVote: vi.fn(),
      setShowVotes: vi.fn(),
      clearVotes: vi.fn(),
      clearStructuredVotes: vi.fn(),
      setSettings: vi.fn(),
      updateTimerConfig: vi.fn(),
      saveJiraOAuthCredentials: vi.fn().mockResolvedValue(undefined),
      getJiraOAuthCredentials: vi.fn().mockResolvedValue(null),
      updateJiraOAuthTokens: vi.fn().mockResolvedValue(undefined),
      deleteJiraOAuthCredentials: vi.fn(),
      saveLinearOAuthCredentials: vi.fn().mockResolvedValue(undefined),
      getLinearOAuthCredentials: vi.fn().mockResolvedValue(null),
      updateLinearOAuthTokens: vi.fn().mockResolvedValue(undefined),
      deleteLinearOAuthCredentials: vi.fn(),
      saveGithubOAuthCredentials: vi.fn().mockResolvedValue(undefined),
      getGithubOAuthCredentials: vi.fn().mockResolvedValue(null),
      deleteGithubOAuthCredentials: vi.fn(),
    };

    const ctx: PlanningRoomHttpContext = {
      repository,
      getRoomData: async () => storedRoom,
      putRoomData: async (room: RoomData) => {
        storedRoom = room;
      },
      broadcast: vi.fn(),
      disconnectUserSessions: vi.fn(),
    };

    const response = (await handleHttpRequest(
      ctx,
      jsonRequest("/initialize", "POST", {
        roomKey: "room-init",
        moderator: "Alice",
        passcode: "secret",
        settings: { estimateOptions: [1, 2, 3] },
        avatar: "cat",
      }),
    )) as Response;

    expect(response.status).toBe(200);
    expect(storedRoom?.key).toBe("room-init");
    expect(tokens.get("alice")).toBeTruthy();
    expect(ctx.broadcast).not.toHaveBeenCalled();
    expect(response.headers.get("Set-Cookie")).toMatch(/room_session=/);
  });

  it("fails session validation when token is wrong", async () => {
    const tokens = new Map<string, string>([["alice", "right"]]);
    const { ctx } = makeContext({ roomData: baseRoom, tokens });

    const response = (await handleHttpRequest(
      ctx,
      jsonRequest("/session/validate", "POST", {
        name: "Alice",
        sessionToken: "wrong",
      }),
    )) as Response;

    expect(response.status).toBe(401);
  });

  it("succeeds session validation when token matches", async () => {
    const tokens = new Map<string, string>([["alice", "right"]]);
    const { ctx } = makeContext({ roomData: baseRoom, tokens });

    const response = (await handleHttpRequest(
      ctx,
      jsonRequest("/session/validate", "POST", {
        name: "alice",
        sessionToken: "right",
      }),
    )) as Response;

    expect(response.status).toBe(200);
    const payload = (await response.json()) as any;
    expect(payload.success).toBe(true);
  });

  it("returns Jira OAuth status when session is valid", async () => {
    const tokens = new Map<string, string>([["alice", "valid"]]);
    const { ctx } = makeContext({ roomData: baseRoom, tokens });

    ctx.repository.getJiraOAuthCredentials = vi.fn().mockResolvedValue({
      roomKey: baseRoom.key,
      accessToken: "token",
      refreshToken: null,
      tokenType: "Bearer",
      expiresAt: 123,
      scope: "read:jira",
      jiraDomain: "example.atlassian.net",
      jiraCloudId: "cloud",
      jiraUserId: "user",
      jiraUserEmail: "alice@test.sprintjam.co.uk",
      storyPointsField: "customfield_100",
      sprintField: null,
      authorizedBy: "alice",
    });

    const response = (await handleHttpRequest(
      ctx,
      jsonRequest(
        "/jira/oauth/status",
        "POST",
        {
          roomKey: baseRoom.key,
          userName: "Alice",
        },
        "valid",
      ),
    )) as Response;

    expect(response.status).toBe(200);
    const payload = (await response.json()) as any;
    expect(payload.connected).toBe(true);
    expect(payload.jiraDomain).toBe("example.atlassian.net");
  });

  it("rejects Jira OAuth status requests without params", async () => {
    const { ctx } = makeContext({ roomData: baseRoom });

    const response = (await handleHttpRequest(
      ctx,
      jsonRequest("/jira/oauth/status", "POST"),
    )) as Response;

    expect(response.status).toBe(400);
  });

  it("rejects Linear OAuth revoke without session info", async () => {
    const { ctx } = makeContext({ roomData: baseRoom });

    const response = (await handleHttpRequest(
      ctx,
      jsonRequest("/linear/oauth/revoke", "DELETE", {}),
    )) as Response;

    expect(response.status).toBe(400);
    expect(ctx.repository.deleteLinearOAuthCredentials).not.toHaveBeenCalled();
  });

  it("allows Linear OAuth revoke with valid session and broadcasts", async () => {
    const tokens = new Map<string, string>([["alice", "valid"]]);
    const { ctx } = makeContext({ roomData: baseRoom, tokens });
    ctx.broadcast = vi.fn();

    const response = (await handleHttpRequest(
      ctx,
      jsonRequest(
        "/linear/oauth/revoke",
        "DELETE",
        {
          roomKey: baseRoom.key,
          userName: "Alice",
        },
        "valid",
      ),
    )) as Response;

    expect(response.status).toBe(200);
    expect(ctx.repository.deleteLinearOAuthCredentials).toHaveBeenCalledWith(
      baseRoom.key,
    );
    expect(ctx.broadcast).toHaveBeenCalledWith(
      expect.objectContaining({ type: "linearDisconnected" }),
    );
  });
});
