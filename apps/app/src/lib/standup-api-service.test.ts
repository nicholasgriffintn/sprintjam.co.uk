import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/constants", () => ({
  STANDUP_API_BASE_URL: "http://localhost",
  STANDUP_WS_BASE_URL: "ws://localhost",
}));

vi.mock("@sprintjam/utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@sprintjam/utils")>();
  return {
    ...actual,
    secureRandomFloat: () => 0,
  };
});

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
let standupApiService: typeof import("@/lib/standup-api-service");

describe("standup-api-service websocket lifecycle", () => {
  beforeEach(async () => {
    vi.resetModules();
    Object.defineProperty(globalThis, "WebSocket", {
      configurable: true,
      writable: true,
      value: MockWebSocket,
    });
    MockWebSocket.instances = [];
    standupApiService = await import("@/lib/standup-api-service");
  });

  afterEach(() => {
    Object.defineProperty(globalThis, "WebSocket", {
      configurable: true,
      writable: true,
      value: realWebSocket,
    });
    vi.clearAllMocks();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("creates a new socket when the user name changes for the same standup", () => {
    standupApiService.connectToStandup("ABC123", "Alice", () => {});
    expect(MockWebSocket.instances).toHaveLength(1);

    standupApiService.connectToStandup("ABC123", "Bob", () => {});

    expect(MockWebSocket.instances).toHaveLength(2);
    expect(MockWebSocket.instances[1].url).toContain("name=Bob");
  });

  it("ignores stale reconnects after connecting as another user", () => {
    vi.useFakeTimers();

    standupApiService.connectToStandup("ABC123", "Alice", () => {});
    const firstSocket = MockWebSocket.instances[0];

    standupApiService.connectToStandup("ABC123", "Bob", () => {});
    firstSocket.onclose?.({ code: 1006, reason: "abnormal" });

    vi.runAllTimers();

    expect(MockWebSocket.instances).toHaveLength(2);
  });

  it("cancels a queued reconnect when disconnecting from the standup", async () => {
    vi.useFakeTimers();

    standupApiService.connectToStandup("ABC123", "Alice", () => {});
    const socket = MockWebSocket.instances[0];

    socket.onclose?.({ code: 1006, reason: "abnormal" });
    standupApiService.disconnectFromStandup();

    await Promise.resolve();
    vi.runAllTimers();

    expect(MockWebSocket.instances).toHaveLength(1);
  });
});
