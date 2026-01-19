/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, cleanup } from "@testing-library/react";

const mockConnectToRoom = vi.fn();
const mockDisconnectFromRoom = vi.fn();
const mockAddEventListener = vi.fn();
const mockRemoveEventListener = vi.fn();

vi.mock("@/lib/api-service", () => ({
  connectToRoom: (...args: unknown[]) => mockConnectToRoom(...args),
  disconnectFromRoom: () => mockDisconnectFromRoom(),
  addEventListener: (...args: unknown[]) => mockAddEventListener(...args),
  removeEventListener: (...args: unknown[]) => mockRemoveEventListener(...args),
}));

import { useRoomConnection } from '@/hooks/useRoomConnection';

describe("useRoomConnection", () => {
  const onMessage = vi.fn();
  const onConnectionChange = vi.fn();
  const onError = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
    cleanup();
  });

  it("connects when on room screen with valid params", () => {
    renderHook(() =>
      useRoomConnection({
        screen: 'room',
        name: 'alice',
        activeRoomKey: 'ROOM1',
        onMessage,
        onConnectionChange,
        onError,
      }),
    );

    expect(mockConnectToRoom).toHaveBeenCalledWith(
      "ROOM1",
      "alice",
      onMessage,
      onConnectionChange,
    );
  });

  it('does not connect when skip is true', () => {
    renderHook(() =>
      useRoomConnection({
        screen: 'room',
        name: 'alice',
        activeRoomKey: 'ROOM1',
        onMessage,
        onConnectionChange,
        onError,
        skip: true,
      }),
    );

    expect(mockConnectToRoom).not.toHaveBeenCalled();
  });

  it("does not connect when screen is not room", () => {
    renderHook(() =>
      useRoomConnection({
        screen: 'welcome',
        name: 'alice',
        activeRoomKey: 'ROOM1',
        onMessage,
        onConnectionChange,
        onError,
      }),
    );

    expect(mockConnectToRoom).not.toHaveBeenCalled();
  });

  it("does not connect when activeRoomKey is null", () => {
    renderHook(() =>
      useRoomConnection({
        screen: 'room',
        name: 'alice',
        activeRoomKey: null,
        onMessage,
        onConnectionChange,
        onError,
      }),
    );

    expect(mockConnectToRoom).not.toHaveBeenCalled();
  });

  it("disconnects on unmount", () => {
    const { unmount } = renderHook(() =>
      useRoomConnection({
        screen: 'room',
        name: 'alice',
        activeRoomKey: 'ROOM1',
        onMessage,
        onConnectionChange,
        onError,
      }),
    );

    unmount();

    expect(mockDisconnectFromRoom).toHaveBeenCalled();
    expect(onConnectionChange).toHaveBeenCalledWith(false);
  });

  it("does not disconnect on unmount when skip was true", () => {
    const { unmount } = renderHook(() =>
      useRoomConnection({
        screen: 'room',
        name: 'alice',
        activeRoomKey: 'ROOM1',
        onMessage,
        onConnectionChange,
        onError,
        skip: true,
      }),
    );

    unmount();

    expect(mockDisconnectFromRoom).not.toHaveBeenCalled();
  });

  it("registers error event listeners on connect", () => {
    renderHook(() =>
      useRoomConnection({
        screen: 'room',
        name: 'alice',
        activeRoomKey: 'ROOM1',
        onMessage,
        onConnectionChange,
        onError,
      }),
    );

    expect(mockAddEventListener).toHaveBeenCalledWith(
      "disconnected",
      expect.any(Function),
    );
    expect(mockAddEventListener).toHaveBeenCalledWith(
      "error",
      expect.any(Function),
    );
  });

  it("removes event listeners on unmount", () => {
    const { unmount } = renderHook(() =>
      useRoomConnection({
        screen: 'room',
        name: 'alice',
        activeRoomKey: 'ROOM1',
        onMessage,
        onConnectionChange,
        onError,
      }),
    );

    unmount();

    expect(mockRemoveEventListener).toHaveBeenCalledWith(
      "disconnected",
      expect.any(Function),
    );
    expect(mockRemoveEventListener).toHaveBeenCalledWith(
      "error",
      expect.any(Function),
    );
  });
});
