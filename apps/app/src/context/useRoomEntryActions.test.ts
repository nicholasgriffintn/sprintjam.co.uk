/**
 * @vitest-environment jsdom
 */
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api-service", () => ({
  createRoom: vi.fn(),
  joinRoom: vi.fn(),
}));

vi.mock("@/lib/data/room-store", () => ({
  upsertRoom: vi.fn(),
}));

import { createRoom, joinRoom } from "@/lib/api-service";
import { useRoomEntryActions } from "./useRoomEntryActions";

describe("useRoomEntryActions", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("marks auto reconnect done after successful join", async () => {
    vi.mocked(joinRoom).mockResolvedValue({
      room: { key: "1I1L1P", moderator: "Nick" } as any,
      defaults: undefined,
    });

    const markAutoReconnectDone = vi.fn();
    const goToRoom = vi.fn();

    const { result } = renderHook(() =>
      useRoomEntryActions({
        name: "Nick",
        roomKey: "1I1L1P",
        passcode: "test",
        selectedAvatar: "user",
        pendingCreateSettings: null,
        applyServerDefaults: vi.fn(),
        clearError: vi.fn(),
        setError: vi.fn(),
        goToRoom,
        setActiveRoomKey: vi.fn(),
        setIsModeratorView: vi.fn(),
        setPendingCreateSettings: vi.fn(),
        setIsLoading: vi.fn(),
        markAutoReconnectDone,
        createSession: vi.fn(),
      }),
    );

    await act(async () => {
      await result.current.handleJoinRoom();
    });

    expect(markAutoReconnectDone).toHaveBeenCalledTimes(1);
    expect(goToRoom).toHaveBeenCalledWith("1I1L1P");
  });

  it("marks auto reconnect done after successful create", async () => {
    vi.mocked(createRoom).mockResolvedValue({
      room: { key: "AB12CD", moderator: "Nick" } as any,
      defaults: undefined,
    });

    const markAutoReconnectDone = vi.fn();
    const goToRoom = vi.fn();

    const { result } = renderHook(() =>
      useRoomEntryActions({
        name: "Nick",
        roomKey: "",
        passcode: "test",
        selectedAvatar: "user",
        pendingCreateSettings: null,
        applyServerDefaults: vi.fn(),
        clearError: vi.fn(),
        setError: vi.fn(),
        goToRoom,
        setActiveRoomKey: vi.fn(),
        setIsModeratorView: vi.fn(),
        setPendingCreateSettings: vi.fn(),
        setIsLoading: vi.fn(),
        markAutoReconnectDone,
        createSession: vi.fn(),
      }),
    );

    await act(async () => {
      await result.current.handleCreateRoom();
    });

    expect(markAutoReconnectDone).toHaveBeenCalledTimes(1);
    expect(goToRoom).toHaveBeenCalledWith("AB12CD");
  });
});
