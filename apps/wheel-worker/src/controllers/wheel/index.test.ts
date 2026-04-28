import { describe, it, expect, vi } from "vitest";
import type { WheelStateData, WheelWorkerEnv } from "@sprintjam/types";
import { hashPasscode } from "@sprintjam/utils";

import { handleHttpRequest, type WheelRoomHttpContext } from "./index";

const buildWheelData = (
  overrides: Partial<WheelStateData> = {},
): WheelStateData => ({
  key: "WHEEL",
  entries: [],
  moderator: "mod",
  users: ["mod"],
  connectedUsers: { mod: true },
  spinState: null,
  results: [],
  settings: {
    removeWinnerAfterSpin: false,
    showConfetti: false,
    playSounds: false,
    spinDurationMs: 4000,
  },
  status: "active",
  ...overrides,
});

const buildContext = (
  overrides: Partial<WheelRoomHttpContext> = {},
): WheelRoomHttpContext =>
  ({
    repository: {
      validateSessionToken: vi.fn(),
      setPasscodeHash: vi.fn(),
      ensureUser: vi.fn((name: string) => name),
      setSessionToken: vi.fn(),
      setUserAvatar: vi.fn(),
      setRecoveryPasskey: vi.fn().mockResolvedValue(undefined),
      validateRecoveryPasskey: vi.fn().mockResolvedValue(false),
      findUserNameByWorkspaceId: vi.fn().mockReturnValue(undefined),
      setWorkspaceUserId: vi.fn(),
    },
    getWheelData: vi.fn(),
    putWheelData: vi.fn(),
    disconnectUserSessions: vi.fn(),
    env: { ENVIRONMENT: "production" } as WheelWorkerEnv,
    ...overrides,
  }) as WheelRoomHttpContext;

describe("wheel http controller", () => {
  it("flags passcode errors on join", async () => {
    const passcodeHash = await hashPasscode("SECRET");
    const wheelData = buildWheelData({ passcodeHash });
    const context = buildContext({
      getWheelData: vi.fn().mockResolvedValue(wheelData),
    });

    const response = await handleHttpRequest(
      context,
      new Request("https://internal/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "mod" }),
      }),
    );

    expect(response?.status).toBe(401);
    expect(response?.headers.get("X-Error-Kind")).toBe("passcode");
  });

  it("does not expose passcode hashes in session responses", async () => {
    const passcodeHash = await hashPasscode("SECRET");
    const wheelData = buildWheelData({ passcodeHash });
    const context = buildContext({
      getWheelData: vi.fn().mockResolvedValue(undefined),
      putWheelData: vi.fn().mockResolvedValue(undefined),
    });

    const response = await handleHttpRequest(
      context,
      new Request("https://internal/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wheelKey: "WHEEL",
          moderator: "mod",
          passcode: "SECRET",
        }),
      }),
    );

    const body = (await response?.json()) as { wheel: Record<string, unknown> };
    expect(body.wheel).not.toHaveProperty("passcodeHash");
  });

  it("rejects passcode updates without a valid session", async () => {
    const wheelData = buildWheelData();
    const context = buildContext({
      getWheelData: vi.fn().mockResolvedValue(wheelData),
    });
    const repository = context.repository as WheelRoomHttpContext["repository"];
    vi.mocked(repository.validateSessionToken).mockReturnValue(false);

    const response = await handleHttpRequest(
      context,
      new Request("https://internal/passcode", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userName: "mod", passcode: "ABC123" }),
      }),
    );

    expect(response?.status).toBe(401);
  });

  it("rejects passcode updates for non-moderators", async () => {
    const wheelData = buildWheelData();
    const context = buildContext({
      getWheelData: vi.fn().mockResolvedValue(wheelData),
    });
    const repository = context.repository as WheelRoomHttpContext["repository"];
    vi.mocked(repository.validateSessionToken).mockReturnValue(true);

    const response = await handleHttpRequest(
      context,
      new Request("https://internal/passcode", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Cookie: "wheel_session=token",
        },
        body: JSON.stringify({ userName: "someone-else", passcode: "ABC123" }),
      }),
    );

    expect(response?.status).toBe(403);
  });

  describe("workspace user join", () => {
    it("bypasses passcode and name conflict when rejoining by workspace user ID", async () => {
      const passcodeHash = await hashPasscode("SECRET");
      const wheelData = buildWheelData({
        passcodeHash,
        users: ["mod", "Alice"],
        connectedUsers: { mod: true, Alice: true },
      });
      const context = buildContext({
        getWheelData: vi.fn().mockResolvedValue(wheelData),
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
      const wheelData = buildWheelData({ users: ["mod"] });
      const context = buildContext({
        getWheelData: vi.fn().mockResolvedValue(wheelData),
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
        getWheelData: vi.fn().mockResolvedValue(buildWheelData()),
      });

      const response = await handleHttpRequest(
        context,
        new Request("https://internal/recover", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "mod" }),
        }),
      );

      expect(response?.status).toBe(400);
    });

    it("returns 404 when wheel does not exist", async () => {
      const context = buildContext({
        getWheelData: vi.fn().mockResolvedValue(undefined),
      });

      const response = await handleHttpRequest(
        context,
        new Request("https://internal/recover", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "mod", recoveryPasskey: "ABCD-EFGH" }),
        }),
      );

      expect(response?.status).toBe(404);
    });

    it("returns 401 when user is not in the wheel", async () => {
      const context = buildContext({
        getWheelData: vi
          .fn()
          .mockResolvedValue(buildWheelData({ users: ["mod"] })),
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

    it("returns 401 when passkey is invalid", async () => {
      const context = buildContext({
        getWheelData: vi
          .fn()
          .mockResolvedValue(buildWheelData({ users: ["mod", "Alice"] })),
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
        getWheelData: vi.fn().mockResolvedValue(
          buildWheelData({
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
      expect(response?.headers.get("Set-Cookie")).toContain("wheel_session=");
    });

    it("disconnects existing sessions before issuing new one", async () => {
      const disconnectSpy = vi.fn();
      const context = buildContext({
        getWheelData: vi.fn().mockResolvedValue(
          buildWheelData({
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

  it("returns access settings without exposing the hash", async () => {
    const passcodeHash = await hashPasscode("SECRET");
    const context = buildContext({
      getWheelData: vi.fn().mockResolvedValue(buildWheelData({ passcodeHash })),
    });

    const response = await handleHttpRequest(
      context,
      new Request("https://internal/settings?name=mod", {
        method: "GET",
      }),
    );

    expect(response?.status).toBe(200);
    await expect(response?.json()).resolves.toEqual({
      settings: {
        removeWinnerAfterSpin: false,
        showConfetti: false,
        playSounds: false,
        spinDurationMs: 4000,
      },
      moderator: "mod",
      isModerator: true,
      hasPasscode: true,
    });
  });
});
