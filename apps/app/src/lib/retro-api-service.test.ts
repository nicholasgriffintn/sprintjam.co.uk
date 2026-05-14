import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/constants", () => ({
  RETRO_API_BASE_URL: "http://localhost",
  RETRO_WS_BASE_URL: "ws://localhost",
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
  onclose?: ((event: { code?: number; reason?: string }) => void) | null;
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
let retroApiService: typeof import("@/lib/retro-api-service");

describe("retro-api-service websocket lifecycle", () => {
  beforeEach(async () => {
    vi.resetModules();
    Object.defineProperty(globalThis, "WebSocket", {
      configurable: true,
      writable: true,
      value: MockWebSocket,
    });
    MockWebSocket.instances = [];
    retroApiService = await import("@/lib/retro-api-service");
  });

  afterEach(() => {
    retroApiService.disconnectRetroWebSocket();
    Object.defineProperty(globalThis, "WebSocket", {
      configurable: true,
      writable: true,
      value: realWebSocket,
    });
    vi.clearAllMocks();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("reuses the active socket only for the same retro and user", () => {
    retroApiService.connectRetroWebSocket("RETRO1", "Alice", () => {});
    retroApiService.connectRetroWebSocket("RETRO1", "Alice", () => {});

    expect(MockWebSocket.instances).toHaveLength(1);
  });

  it("creates a new socket when joining another retro", () => {
    retroApiService.connectRetroWebSocket("RETRO1", "Alice", () => {});
    const firstSocket = MockWebSocket.instances[0];

    retroApiService.connectRetroWebSocket("RETRO2", "Alice", () => {});

    expect(firstSocket.close).toHaveBeenCalled();
    expect(MockWebSocket.instances).toHaveLength(2);
    expect(MockWebSocket.instances[1].url).toContain("retro=RETRO2");
  });

  it("ignores stale reconnects after switching users", () => {
    vi.useFakeTimers();

    retroApiService.connectRetroWebSocket("RETRO1", "Alice", () => {});
    const firstSocket = MockWebSocket.instances[0];

    retroApiService.connectRetroWebSocket("RETRO1", "Bob", () => {});
    firstSocket.onclose?.({ code: 1006, reason: "abnormal" });
    vi.runAllTimers();

    expect(MockWebSocket.instances).toHaveLength(2);
    expect(MockWebSocket.instances[1].url).toContain("name=Bob");
  });
});
