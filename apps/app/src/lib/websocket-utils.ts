export interface WebSocketConfig {
  maxReconnectAttempts?: number;
  reconnectBaseDelay?: number;
  maxReconnectDelay?: number;
}

export interface ReconnectState {
  attempts: number;
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
}

export function createReconnectState(
  config: WebSocketConfig = {},
): ReconnectState {
  return {
    attempts: 0,
    maxAttempts: config.maxReconnectAttempts ?? 5,
    baseDelay: config.reconnectBaseDelay ?? 1000,
    maxDelay: config.maxReconnectDelay ?? 30000,
  };
}

export function resetReconnectAttempts(state: ReconnectState): void {
  state.attempts = 0;
}

export function calculateReconnectDelay(state: ReconnectState): number {
  const jitter = Math.random() * 0.3 + 0.85;
  return Math.min(
    state.baseDelay * 2 ** state.attempts * jitter,
    state.maxDelay,
  );
}

export function shouldReconnect(state: ReconnectState): boolean {
  return state.attempts < state.maxAttempts;
}

export function incrementReconnectAttempts(state: ReconnectState): void {
  state.attempts++;
}

export function isWebSocketOpen(
  socket: WebSocket | null,
): socket is WebSocket {
  return socket !== null && socket.readyState === WebSocket.OPEN;
}

export function sendWebSocketMessage(
  socket: WebSocket | null,
  message: unknown,
  errorMessage = "Not connected",
): void {
  if (!isWebSocketOpen(socket)) {
    throw new Error(errorMessage);
  }
  socket.send(JSON.stringify(message));
}

type EventCallback<T> = (data: T) => void;

export class EventManager<TMessage> {
  private listeners: Record<string, EventCallback<TMessage>[]> = {};

  addEventListener(event: string, callback: EventCallback<TMessage>): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  removeEventListener(event: string, callback: EventCallback<TMessage>): void {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(
      (cb) => cb !== callback,
    );
  }

  triggerEventListeners(event: string, data: TMessage): void {
    if (!this.listeners[event]) return;

    for (const callback of this.listeners[event]) {
      try {
        callback(data);
      } catch (error) {
        console.error("Error in event listener:", event, error);
      }
    }
  }

  clear(): void {
    this.listeners = {};
  }
}
