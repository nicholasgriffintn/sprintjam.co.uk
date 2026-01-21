import { describe, expect, it, vi } from "vitest";
import type { WheelData } from "@sprintjam/types";
import type { WheelRoom } from ".";
import { handleSession } from "./session";

class MockWebSocket {
  handlers = new Map<string, () => Promise<void> | void>();
  accept = vi.fn();
  send = vi.fn();
  close = vi.fn();

  addEventListener(type: string, callback: () => Promise<void> | void) {
    this.handlers.set(type, callback);
  }
}

const createDeferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const baseWheelData: WheelData = {
  key: "wheel",
  entries: [],
  moderator: "Alice",
  users: ["Alice"],
  connectedUsers: { Alice: true },
  spinState: null,
  results: [],
  settings: {
    removeWinnerAfterSpin: false,
    showConfetti: true,
    playSounds: true,
    spinDurationMs: 2000,
  },
  status: "active",
};

describe("wheel session close", () => {
  it("marks the user disconnected before awaiting wheel data", async () => {
    const deferred = createDeferred<WheelData>();
    const getWheelData = vi
      .fn()
      .mockResolvedValueOnce(baseWheelData)
      .mockResolvedValueOnce(baseWheelData)
      .mockResolvedValueOnce(baseWheelData)
      .mockImplementationOnce(() => deferred.promise);

    const setUserConnection = vi.fn();

    const wheel = {
      sessions: new Map(),
      repository: {
        validateSessionToken: vi.fn().mockReturnValue(true),
        setUserConnection,
        setModerator: vi.fn(),
      },
      getWheelData,
      broadcast: vi.fn(),
      handleAddEntry: vi.fn(),
      handleRemoveEntry: vi.fn(),
      handleUpdateEntry: vi.fn(),
      handleToggleEntry: vi.fn(),
      handleClearEntries: vi.fn(),
      handleBulkAddEntries: vi.fn(),
      handleSpin: vi.fn(),
      handleResetWheel: vi.fn(),
      handleUpdateSettings: vi.fn(),
    } as unknown as WheelRoom;

    const socket = new MockWebSocket();

    await handleSession(wheel, socket as unknown as WebSocket, "wheel", "Alice", "token");

    const closeHandler = socket.handlers.get("close");
    if (!closeHandler) {
      throw new Error("Missing close handler");
    }

    const closePromise = closeHandler();

    expect(setUserConnection).toHaveBeenNthCalledWith(1, "Alice", true);
    expect(setUserConnection).toHaveBeenNthCalledWith(2, "Alice", false);

    deferred.resolve(baseWheelData);
    await closePromise;
  });
});
