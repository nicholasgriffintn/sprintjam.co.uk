import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("@/constants", () => ({
  API_BASE_URL: "http://localhost",
  WS_BASE_URL: "ws://localhost",
}));

vi.mock("@/utils/storage", () => {
  const store = new Map<string, string>();
  return {
    safeLocalStorage: {
      get: (key: string) => store.get(key) ?? null,
      set: (key: string, value: string) => {
        store.set(key, value);
      },
      remove: (key: string) => {
        store.delete(key);
      },
    },
  };
});

import * as apiService from '@/lib/api-service';

class MockWebSocket {
  static instances: MockWebSocket[] = [];
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.OPEN;
  url: string;
  onopen?: () => void;
  onclose?: (event: { code?: number; reason?: string }) => void;
  onerror?: (error: unknown) => void;
  onmessage?: (event: { data: string }) => void;
  send = vi.fn();
  close = vi.fn((_code?: number, _reason?: string) => {
    this.readyState = MockWebSocket.CLOSED;
  });

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  triggerError(error: unknown) {
    this.onerror?.(error);
  }
}

const realWebSocket = globalThis.WebSocket;

describe("api-service", () => {
  beforeEach(() => {
    (globalThis as any).WebSocket = MockWebSocket as any;
    (apiService as any).activeSocket = null;
    (apiService as any).activeAuthToken = null;
    (apiService as any).activeRoomKey = null;
    (apiService as any).reconnectAttempts = 0;
    (apiService as any).voteDebounceTimer = null;
    MockWebSocket.instances = [];
  });

  afterEach(() => {
    (globalThis as any).WebSocket = realWebSocket;
    vi.clearAllMocks();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("closes the socket on error to trigger reconnect flow", () => {
    const onConnectionStatusChange = vi.fn();
    apiService.connectToRoom(
      "ROOM",
      "user",
      "token",
      () => {},
      onConnectionStatusChange,
    );

    const socket = MockWebSocket.instances.length
      ? MockWebSocket.instances[MockWebSocket.instances.length - 1]
      : undefined;
    if (!socket) {
      throw new Error("Mock socket missing");
    }

    socket.triggerError(new Error("boom"));

    expect(socket.close).toHaveBeenCalledWith(1011, "Connection error");
    expect(onConnectionStatusChange).toHaveBeenCalledWith(false);
  });

  it("cancels a queued vote send when disconnecting", () => {
    vi.useFakeTimers();
    apiService.connectToRoom("ROOM", "user", "token", () => {});
    const socket = MockWebSocket.instances.length
      ? MockWebSocket.instances[MockWebSocket.instances.length - 1]
      : undefined;
    if (!socket) {
      throw new Error("Mock socket missing");
    }
    const sendSpy = socket.send;

    apiService.submitVote("5");
    apiService.disconnectFromRoom();

    vi.runAllTimers();

    expect(sendSpy).not.toHaveBeenCalled();
  });

  it("returns existing socket when already connected to same room with same token", () => {
    apiService.connectToRoom("ROOM", "user", "token", () => {});
    expect(MockWebSocket.instances).toHaveLength(1);

    const existingSocket = MockWebSocket.instances[0];

    const result = apiService.connectToRoom("ROOM", "user", "token", () => {});

    expect(MockWebSocket.instances).toHaveLength(1);
    expect(result).toBe(existingSocket);
  });

  it("creates new socket when room key differs", () => {
    apiService.connectToRoom("ROOM1", "user", "token", () => {});
    expect(MockWebSocket.instances).toHaveLength(1);

    apiService.connectToRoom("ROOM2", "user", "token", () => {});

    expect(MockWebSocket.instances).toHaveLength(2);
  });

  it("creates new socket when token differs", () => {
    apiService.connectToRoom("ROOM", "user", "token1", () => {});
    expect(MockWebSocket.instances).toHaveLength(1);

    apiService.connectToRoom("ROOM", "user", "token2", () => {});

    expect(MockWebSocket.instances).toHaveLength(2);
  });

  it("creates new socket after disconnect even with same params", () => {
    apiService.connectToRoom("ROOM", "user", "token", () => {});
    expect(MockWebSocket.instances).toHaveLength(1);
    const firstSocket = MockWebSocket.instances[0];

    apiService.disconnectFromRoom();

    apiService.connectToRoom("ROOM", "user", "token", () => {});
    expect(MockWebSocket.instances).toHaveLength(2);
    expect(MockWebSocket.instances[1]).not.toBe(firstSocket);
  });
});
