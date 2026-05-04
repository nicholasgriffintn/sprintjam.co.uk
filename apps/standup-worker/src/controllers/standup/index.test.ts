import { describe, it, expect, vi } from "vitest";
import type { StandupData, StandupWorkerEnv } from "@sprintjam/types";
import { hashPasscode, serializePasscodeHash } from "@sprintjam/utils";

import { handleHttpRequest, type StandupRoomHttpContext } from "./index";

const buildStandupData = (
  overrides: Partial<StandupData> = {},
): StandupData => ({
  key: "STANDUP",
  users: ["mod"],
  moderator: "mod",
  connectedUsers: { mod: true },
  status: "active",
  responses: [],
  respondedUsers: [],
  ...overrides,
});

const buildContext = (
  overrides: Partial<StandupRoomHttpContext> = {},
): StandupRoomHttpContext =>
  ({
    repository: {
      createStandup: vi.fn(),
      ensureUser: vi.fn((name: string) => name),
      setSessionToken: vi.fn(),
      setRecoveryPasskey: vi.fn().mockResolvedValue(undefined),
      validateRecoveryPasskey: vi.fn().mockResolvedValue(false),
      setUserAvatar: vi.fn(),
      getPasscode: vi.fn().mockReturnValue(null),
      validateSessionToken: vi.fn().mockReturnValue(false),
      findUserNameByWorkspaceId: vi.fn().mockReturnValue(undefined),
      setWorkspaceUserId: vi.fn(),
    },
    getStandupData: vi.fn(),
    disconnectUserSessions: vi.fn(),
    env: { ENVIRONMENT: "production" } as StandupWorkerEnv,
    ...overrides,
  }) as StandupRoomHttpContext;

describe("standup http controller", () => {
  describe("initialize", () => {
    it("creates a new standup room", async () => {
      const standupData = buildStandupData();
      const context = buildContext({
        getStandupData: vi
          .fn()
          .mockResolvedValueOnce(undefined)
          .mockResolvedValueOnce(standupData),
      });

      const response = await handleHttpRequest(
        context,
        new Request("https://internal/initialize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            standupKey: "ABC123",
            moderator: "mod",
          }),
        }),
      );

      expect(response?.status).toBe(200);
      const body = (await response?.json()) as {
        success: boolean;
        standup: StandupData;
      };
      expect(body.success).toBe(true);
      expect(body.standup).toEqual(standupData);
      expect(response?.headers.get("Set-Cookie")).toContain("standup_session=");
    });

    it("rejects duplicate standup creation", async () => {
      const context = buildContext({
        getStandupData: vi.fn().mockResolvedValue(buildStandupData()),
      });

      const response = await handleHttpRequest(
        context,
        new Request("https://internal/initialize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            standupKey: "ABC123",
            moderator: "mod",
          }),
        }),
      );

      expect(response?.status).toBe(409);
    });

    it("rejects missing moderator", async () => {
      const context = buildContext({
        getStandupData: vi.fn().mockResolvedValue(undefined),
      });

      const response = await handleHttpRequest(
        context,
        new Request("https://internal/initialize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ standupKey: "ABC123" }),
        }),
      );

      expect(response?.status).toBe(400);
    });

    it("returns 400 for passcodes that are too short", async () => {
      const context = buildContext({
        getStandupData: vi.fn().mockResolvedValue(undefined),
      });

      const response = await handleHttpRequest(
        context,
        new Request("https://internal/initialize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            standupKey: "ABC123",
            moderator: "mod",
            passcode: "abc",
          }),
        }),
      );

      expect(response?.status).toBe(400);
      const body = (await response?.json()) as { error: string };
      expect(body.error).toContain("Passcode cannot be less than");
      expect(context.repository.createStandup).not.toHaveBeenCalled();
    });
  });

  describe("join", () => {
    it("flags passcode errors when passcode is required but not provided", async () => {
      const passcodeHash = await hashPasscode("SECRET");
      const context = buildContext({
        getStandupData: vi.fn().mockResolvedValue(buildStandupData()),
        repository: {
          ...buildContext().repository,
          getPasscode: vi
            .fn()
            .mockReturnValue(serializePasscodeHash(passcodeHash)),
        } as any,
      });

      const response = await handleHttpRequest(
        context,
        new Request("https://internal/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Alice" }),
        }),
      );

      expect(response?.status).toBe(401);
      expect(response?.headers.get("X-Error-Kind")).toBe("passcode");
    });

    it("rejects invalid passcode", async () => {
      const passcodeHash = await hashPasscode("SECRET");
      const context = buildContext({
        getStandupData: vi.fn().mockResolvedValue(buildStandupData()),
        repository: {
          ...buildContext().repository,
          getPasscode: vi
            .fn()
            .mockReturnValue(serializePasscodeHash(passcodeHash)),
        } as any,
      });

      const response = await handleHttpRequest(
        context,
        new Request("https://internal/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Alice", passcode: "WRONG" }),
        }),
      );

      expect(response?.status).toBe(401);
      expect(response?.headers.get("X-Error-Kind")).toBe("passcode");
    });

    it("rejects malformed passcodes", async () => {
      const passcodeHash = await hashPasscode("SECRET");
      const context = buildContext({
        getStandupData: vi.fn().mockResolvedValue(buildStandupData()),
        repository: {
          ...buildContext().repository,
          getPasscode: vi
            .fn()
            .mockReturnValue(serializePasscodeHash(passcodeHash)),
        } as any,
      });

      const response = await handleHttpRequest(
        context,
        new Request("https://internal/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Alice", passcode: "abc" }),
        }),
      );

      expect(response?.status).toBe(401);
      expect(response?.headers.get("X-Error-Kind")).toBe("passcode");
    });

    it("allows join with correct passcode", async () => {
      const passcodeHash = await hashPasscode("SECRET");
      const standupData = buildStandupData({ users: ["mod", "Alice"] });
      const context = buildContext({
        getStandupData: vi.fn().mockResolvedValue(standupData),
        repository: {
          ...buildContext().repository,
          getPasscode: vi
            .fn()
            .mockReturnValue(serializePasscodeHash(passcodeHash)),
        } as any,
      });

      const response = await handleHttpRequest(
        context,
        new Request("https://internal/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Alice", passcode: "SECRET" }),
        }),
      );

      expect(response?.status).toBe(200);
      expect(response?.headers.get("Set-Cookie")).toContain("standup_session=");
    });

    it("allows join without passcode when none is set", async () => {
      const standupData = buildStandupData({ users: ["mod", "Bob"] });
      const context = buildContext({
        getStandupData: vi.fn().mockResolvedValue(standupData),
      });

      const response = await handleHttpRequest(
        context,
        new Request("https://internal/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Bob" }),
        }),
      );

      expect(response?.status).toBe(200);
    });

    it("returns 404 for non-existent standup", async () => {
      const context = buildContext({
        getStandupData: vi.fn().mockResolvedValue(undefined),
      });

      const response = await handleHttpRequest(
        context,
        new Request("https://internal/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Alice" }),
        }),
      );

      expect(response?.status).toBe(404);
    });

    it("rejects join when user is connected and no valid token", async () => {
      const standupData = buildStandupData({
        users: ["mod", "Alice"],
        connectedUsers: { mod: true, Alice: true },
      });
      const context = buildContext({
        getStandupData: vi.fn().mockResolvedValue(standupData),
      });

      const response = await handleHttpRequest(
        context,
        new Request("https://internal/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Alice" }),
        }),
      );

      expect(response?.status).toBe(409);
      expect(context.disconnectUserSessions).not.toHaveBeenCalled();
    });

    it("disconnects existing sessions when reconnecting user has valid token", async () => {
      const standupData = buildStandupData({
        users: ["mod", "Alice"],
        connectedUsers: { mod: true, Alice: true },
      });
      const disconnectSpy = vi.fn();
      const context = buildContext({
        getStandupData: vi.fn().mockResolvedValue(standupData),
        disconnectUserSessions: disconnectSpy,
        repository: {
          ...buildContext().repository,
          validateSessionToken: vi.fn().mockReturnValue(true),
        } as any,
      });

      const response = await handleHttpRequest(
        context,
        new Request("https://internal/join", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: "standup_session=valid-token",
          },
          body: JSON.stringify({ name: "Alice" }),
        }),
      );

      expect(response?.status).toBe(200);
      expect(disconnectSpy).toHaveBeenCalledWith("Alice");
    });

    it("rejects join when user has submitted a response and no valid token", async () => {
      const standupData = buildStandupData({
        users: ["mod", "Alice"],
        connectedUsers: { mod: true, Alice: false },
        respondedUsers: ["Alice"],
      });
      const context = buildContext({
        getStandupData: vi.fn().mockResolvedValue(standupData),
      });

      const response = await handleHttpRequest(
        context,
        new Request("https://internal/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Alice" }),
        }),
      );

      expect(response?.status).toBe(409);
    });

    it("allows rejoin when user has submitted a response with valid token", async () => {
      const standupData = buildStandupData({
        users: ["mod", "Alice"],
        connectedUsers: { mod: true, Alice: false },
        respondedUsers: ["Alice"],
      });
      const context = buildContext({
        getStandupData: vi.fn().mockResolvedValue(standupData),
        repository: {
          ...buildContext().repository,
          validateSessionToken: vi.fn().mockReturnValue(true),
        } as any,
      });

      const response = await handleHttpRequest(
        context,
        new Request("https://internal/join", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: "standup_session=valid-token",
          },
          body: JSON.stringify({ name: "Alice" }),
        }),
      );

      expect(response?.status).toBe(200);
    });

    it("workspace user bypasses passcode check and name conflict", async () => {
      const standupData = buildStandupData({
        users: ["mod", "Alice"],
        connectedUsers: { mod: true, Alice: true },
      });
      const context = buildContext({
        getStandupData: vi.fn().mockResolvedValue(standupData),
        repository: {
          ...buildContext().repository,
          findUserNameByWorkspaceId: vi.fn().mockReturnValue("Alice"),
        } as any,
      });

      const response = await handleHttpRequest(
        context,
        new Request("https://internal/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Alice", workspaceUserId: 42 }),
        }),
      );

      expect(response?.status).toBe(200);
      expect(
        (context.repository as any).setRecoveryPasskey,
      ).not.toHaveBeenCalled();
    });

    it("workspace user joining for first time gets slot without passcode", async () => {
      const standupData = buildStandupData({ users: ["mod"] });
      const context = buildContext({
        getStandupData: vi.fn().mockResolvedValue(standupData),
        repository: {
          ...buildContext().repository,
          findUserNameByWorkspaceId: vi.fn().mockReturnValue(undefined),
        } as any,
      });

      const response = await handleHttpRequest(
        context,
        new Request("https://internal/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "NewUser", workspaceUserId: 99 }),
        }),
      );

      expect(response?.status).toBe(200);
      expect(
        (context.repository as any).setWorkspaceUserId,
      ).toHaveBeenCalledWith("NewUser", 99);
      expect(
        (context.repository as any).setRecoveryPasskey,
      ).not.toHaveBeenCalled();
    });
  });

  describe("recover", () => {
    it("returns 400 when name or passkey is missing", async () => {
      const context = buildContext({
        getStandupData: vi.fn().mockResolvedValue(buildStandupData()),
      });

      const response = await handleHttpRequest(
        context,
        new Request("https://internal/recover", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Alice" }),
        }),
      );

      expect(response?.status).toBe(400);
    });

    it("returns 404 when standup does not exist", async () => {
      const context = buildContext({
        getStandupData: vi.fn().mockResolvedValue(undefined),
      });

      const response = await handleHttpRequest(
        context,
        new Request("https://internal/recover", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Alice", recoveryPasskey: "ABCD-EFGH" }),
        }),
      );

      expect(response?.status).toBe(404);
    });

    it("returns 401 when user does not exist in standup", async () => {
      const context = buildContext({
        getStandupData: vi
          .fn()
          .mockResolvedValue(buildStandupData({ users: ["mod"] })),
      });

      const response = await handleHttpRequest(
        context,
        new Request("https://internal/recover", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Ghost", recoveryPasskey: "ABCD-EFGH" }),
        }),
      );

      expect(response?.status).toBe(401);
    });

    it("returns 401 when recovery passkey is invalid", async () => {
      const context = buildContext({
        getStandupData: vi
          .fn()
          .mockResolvedValue(buildStandupData({ users: ["mod", "Alice"] })),
        repository: {
          ...buildContext().repository,
          validateRecoveryPasskey: vi.fn().mockResolvedValue(false),
        } as any,
      });

      const response = await handleHttpRequest(
        context,
        new Request("https://internal/recover", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Alice", recoveryPasskey: "WRNG-PASS" }),
        }),
      );

      expect(response?.status).toBe(401);
    });

    it("issues a new session cookie when passkey is valid", async () => {
      const context = buildContext({
        getStandupData: vi.fn().mockResolvedValue(
          buildStandupData({
            users: ["mod", "Alice"],
            connectedUsers: { mod: true, Alice: false },
          }),
        ),
        repository: {
          ...buildContext().repository,
          validateRecoveryPasskey: vi.fn().mockResolvedValue(true),
        } as any,
      });

      const response = await handleHttpRequest(
        context,
        new Request("https://internal/recover", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Alice", recoveryPasskey: "ABCD-EFGH" }),
        }),
      );

      expect(response?.status).toBe(200);
      expect(response?.headers.get("Set-Cookie")).toContain("standup_session=");
    });

    it("disconnects existing sessions before issuing new one", async () => {
      const disconnectSpy = vi.fn();
      const context = buildContext({
        getStandupData: vi.fn().mockResolvedValue(
          buildStandupData({
            users: ["mod", "Alice"],
            connectedUsers: { mod: true, Alice: true },
          }),
        ),
        disconnectUserSessions: disconnectSpy,
        repository: {
          ...buildContext().repository,
          validateRecoveryPasskey: vi.fn().mockResolvedValue(true),
        } as any,
      });

      const response = await handleHttpRequest(
        context,
        new Request("https://internal/recover", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Alice", recoveryPasskey: "ABCD-EFGH" }),
        }),
      );

      expect(response?.status).toBe(200);
      expect(disconnectSpy).toHaveBeenCalledWith("Alice");
    });
  });

  it("returns null for unknown routes", async () => {
    const context = buildContext();

    const response = await handleHttpRequest(
      context,
      new Request("https://internal/unknown", { method: "GET" }),
    );

    expect(response).toBeNull();
  });
});
