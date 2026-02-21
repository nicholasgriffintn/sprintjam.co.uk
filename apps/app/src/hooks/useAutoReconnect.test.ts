/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { renderHook, waitFor, cleanup } from "@testing-library/react";

vi.mock("@/lib/api-service", () => ({
  joinRoom: vi.fn(),
}));

vi.mock("@/lib/data/room-store", () => ({
  upsertRoom: vi.fn(),
}));

const storage = new Map<string, string>();
vi.mock("@/utils/storage", () => ({
  safeLocalStorage: {
    get: (key: string) => storage.get(key) ?? null,
    set: (key: string, value: string) => storage.set(key, value),
    remove: (key: string) => storage.delete(key),
  },
}));

import { useAutoReconnect } from "@/hooks/useAutoReconnect";
import { joinRoom } from "@/lib/api-service";

describe("useAutoReconnect", () => {
  const onReconnectSuccess = vi.fn();
  const onReconnectError = vi.fn();
  const onLoadingChange = vi.fn();
  const applyServerDefaults = vi.fn();
  const onReconnectComplete = vi.fn();

  beforeEach(() => {
    storage.clear();
    vi.resetAllMocks();
    cleanup();
  });

  it("calls onReconnectComplete after successful reconnect", async () => {
    (joinRoom as Mock).mockResolvedValue({
      room: { key: "ROOM1", moderator: "alice" },
      defaults: undefined,
      authToken: "tok-new",
    });

    renderHook(() =>
      useAutoReconnect({
        name: "alice",
        screen: "room",
        roomKey: "ROOM1",
        isLoadingDefaults: false,
        selectedAvatar: "user",
        onReconnectSuccess,
        onReconnectError,
        onLoadingChange,
        applyServerDefaults,
        onReconnectComplete,
      }),
    );

    await waitFor(() => {
      expect(onReconnectComplete).toHaveBeenCalled();
    });

    expect(onReconnectSuccess).toHaveBeenCalledWith("ROOM1", true);
  });

  it("calls onReconnectComplete after failed reconnect", async () => {
    (joinRoom as Mock).mockRejectedValue(new Error("Connection failed"));

    renderHook(() =>
      useAutoReconnect({
        name: "alice",
        screen: "room",
        roomKey: "ROOM1",
        isLoadingDefaults: false,
        selectedAvatar: "user",
        onReconnectSuccess,
        onReconnectError,
        onLoadingChange,
        applyServerDefaults,
        onReconnectComplete,
      }),
    );

    await waitFor(() => {
      expect(onReconnectComplete).toHaveBeenCalled();
    });

    expect(onReconnectError).toHaveBeenCalledWith({
      message: "Connection failed",
      isAuthError: false,
      isRoomNotFound: false,
      isNameConflict: false,
    });
    expect(onReconnectSuccess).not.toHaveBeenCalled();
  });

  it("does not call callbacks after unmount (cancellation guard)", async () => {
    const deferred: { resolve?: (val: unknown) => void } = {};
    (joinRoom as Mock).mockImplementation(
      () =>
        new Promise((resolve) => {
          deferred.resolve = resolve;
        }),
    );

    const { unmount } = renderHook(() =>
      useAutoReconnect({
        name: "alice",
        screen: "room",
        roomKey: "ROOM1",
        isLoadingDefaults: false,
        selectedAvatar: "user",
        onReconnectSuccess,
        onReconnectError,
        onLoadingChange,
        applyServerDefaults,
        onReconnectComplete,
      }),
    );

    unmount();

    deferred.resolve?.({
      room: { key: "ROOM1", moderator: "alice" },
      defaults: undefined,
      authToken: "tok-new",
    });

    await new Promise((r) => setTimeout(r, 10));

    expect(onReconnectSuccess).not.toHaveBeenCalled();
    expect(onReconnectComplete).not.toHaveBeenCalled();
  });

  it("does not attempt reconnect when not on room screen", () => {
    renderHook(() =>
      useAutoReconnect({
        name: "alice",
        screen: "welcome",
        roomKey: "ROOM1",
        isLoadingDefaults: false,
        selectedAvatar: "user",
        onReconnectSuccess,
        onReconnectError,
        onLoadingChange,
        applyServerDefaults,
        onReconnectComplete,
      }),
    );

    expect(joinRoom).not.toHaveBeenCalled();
  });

  it("does not attempt reconnect when roomKey is empty", () => {
    renderHook(() =>
      useAutoReconnect({
        name: "alice",
        screen: "room",
        roomKey: "",
        isLoadingDefaults: false,
        selectedAvatar: "user",
        onReconnectSuccess,
        onReconnectError,
        onLoadingChange,
        applyServerDefaults,
        onReconnectComplete,
      }),
    );

    expect(joinRoom).not.toHaveBeenCalled();
  });

  it("calls onNeedsJoin when name is empty", () => {
    const onNeedsJoin = vi.fn();

    renderHook(() =>
      useAutoReconnect({
        name: "",
        screen: "room",
        roomKey: "ROOM1",
        isLoadingDefaults: false,
        selectedAvatar: "user",
        onReconnectSuccess,
        onReconnectError,
        onLoadingChange,
        applyServerDefaults,
        onReconnectComplete,
        onNeedsJoin,
      }),
    );

    expect(onNeedsJoin).toHaveBeenCalled();
    expect(onReconnectComplete).toHaveBeenCalled();
    expect(joinRoom).not.toHaveBeenCalled();
  });
});
