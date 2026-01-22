import { describe, it, expect, vi } from "vitest";
import type { WheelData, WheelWorkerEnv } from "@sprintjam/types";
import { hashPasscode } from "@sprintjam/utils";

import { handleHttpRequest, type WheelRoomHttpContext } from "./index";

const buildWheelData = (overrides: Partial<WheelData> = {}): WheelData => ({
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
});
