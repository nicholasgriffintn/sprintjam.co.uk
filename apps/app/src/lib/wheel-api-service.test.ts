import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("@/constants", () => ({
  WHEEL_API_BASE_URL: "http://localhost",
  WHEEL_WS_BASE_URL: "ws://localhost",
}));

import * as wheelApiService from "@/lib/wheel-api-service";

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
}

const realWebSocket = globalThis.WebSocket;

describe("wheel-api-service reconnect", () => {
  beforeEach(() => {
    (globalThis as any).WebSocket = MockWebSocket as any;
    (wheelApiService as any).activeSocket = null;
    (wheelApiService as any).activeWheelKey = null;
    (wheelApiService as any).reconnectAttempts = 0;
    MockWebSocket.instances = [];
  });

  afterEach(() => {
    (globalThis as any).WebSocket = realWebSocket;
    vi.clearAllMocks();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("keeps reconnect attempts across reconnect calls", () => {
    vi.useFakeTimers();
    const onDisconnected = vi.fn();

    wheelApiService.addEventListener("disconnected", onDisconnected);
    wheelApiService.connectToWheel("WHEEL", "user", () => {});

    const closeLatest = () => {
      const socket = MockWebSocket.instances.length
        ? MockWebSocket.instances[MockWebSocket.instances.length - 1]
        : undefined;
      if (!socket) {
        throw new Error("Mock socket missing");
      }

      socket.onclose?.({ code: 1006, reason: "abnormal" });
      vi.runAllTimers();
    };

    for (let i = 0; i < 6; i += 1) {
      closeLatest();
    }

    expect(onDisconnected).toHaveBeenCalledWith({
      type: "disconnected",
      error: "Connection lost. Please refresh the page to reconnect.",
      reason: "disconnect",
    });
  });

  it("emits newModerator events to listeners", () => {
    const onNewModerator = vi.fn();
    wheelApiService.addEventListener("newModerator", onNewModerator);

    const socket = wheelApiService.connectToWheel("WHEEL", "user", () => {});

    const mockSocket = socket as unknown as MockWebSocket;
    if (!mockSocket.onmessage) {
      throw new Error("Mock socket missing onmessage handler");
    }

    mockSocket.onmessage({
      data: JSON.stringify({ type: "newModerator", moderator: "Sam" }),
    });

    expect(onNewModerator).toHaveBeenCalledWith({
      type: "newModerator",
      moderator: "Sam",
    });

    wheelApiService.removeEventListener("newModerator", onNewModerator);
  });
});
