import type {
  WheelData,
  WheelServerMessage,
  WheelSettings,
} from "@sprintjam/types";

import { WHEEL_API_BASE_URL, WHEEL_WS_BASE_URL } from "@/constants";
import { HttpError, NetworkError, isAbortError } from "@/lib/errors";

let activeSocket: WebSocket | null = null;
let activeWheelKey: string | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_BASE_DELAY = 1000;
const MAX_RECONNECT_DELAY = 30000;

type WheelEventMessage =
  | WheelServerMessage
  | { type: "disconnected"; error: string; reason: "disconnect" };
type WheelEventType = WheelEventMessage["type"];

const eventListeners: Record<string, ((data: WheelEventMessage) => void)[]> =
  {};

export interface CreateWheelResponse {
  wheel: WheelData;
  token: string;
}

export interface JoinWheelResponse {
  wheel: WheelData;
  token: string;
}

interface RequestOptions {
  signal?: AbortSignal;
}

const readJsonSafe = async (
  response: Response,
): Promise<Record<string, unknown> | null> => {
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
};

const handleJsonResponse = async <T>(
  response: Response,
  fallbackMessage: string,
): Promise<T> => {
  if (!response.ok) {
    const body = await readJsonSafe(response);
    throw new HttpError({
      message: (body?.error as string) || fallbackMessage,
      status: response.status,
      code: (body?.code as string) || undefined,
    });
  }

  try {
    return (await response.json()) as T;
  } catch (error) {
    throw new NetworkError("Invalid response from server", { cause: error });
  }
};

export async function createWheel(
  name: string,
  passcode?: string,
  settings?: Partial<WheelSettings>,
  avatar?: string,
  options?: RequestOptions,
): Promise<CreateWheelResponse> {
  try {
    const response = await fetch(`${WHEEL_API_BASE_URL}/wheels`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, passcode, settings, avatar }),
      signal: options?.signal,
      credentials: "include",
    });

    const data = await handleJsonResponse<CreateWheelResponse>(
      response,
      "Failed to create wheel",
    );

    if (!data.wheel) {
      throw new NetworkError(
        "Invalid response from server while creating wheel",
      );
    }

    return data;
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }
    console.error("Error creating wheel:", error);
    if (error instanceof HttpError || error instanceof NetworkError) {
      throw error;
    }
    throw new NetworkError("Failed to create wheel", { cause: error });
  }
}

export async function joinWheel(
  name: string,
  wheelKey: string,
  passcode?: string,
  avatar?: string,
  options?: RequestOptions,
): Promise<JoinWheelResponse> {
  try {
    const response = await fetch(`${WHEEL_API_BASE_URL}/wheels/join`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, wheelKey, passcode, avatar }),
      signal: options?.signal,
      credentials: "include",
    });

    if (!response.ok) {
      const errorKind = response.headers.get("X-Error-Kind");
      if (errorKind === "passcode") {
        throw new Error("PASSCODE_REQUIRED");
      }
      const body = await readJsonSafe(response);
      throw new HttpError({
        message: (body?.error as string) || "Failed to join wheel",
        status: response.status,
        code: (body?.code as string) || undefined,
      });
    }

    const data = await handleJsonResponse<JoinWheelResponse>(
      response,
      "Failed to join wheel",
    );

    if (!data.wheel) {
      throw new NetworkError(
        "Invalid response from server while joining wheel",
      );
    }

    return data;
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }
    console.error("Error joining wheel:", error);
    if (error instanceof HttpError || error instanceof NetworkError) {
      throw error;
    }
    throw new NetworkError("Failed to join wheel", { cause: error });
  }
}

export function connectToWheel(
  wheelKey: string,
  name: string,
  onMessage: (data: WheelServerMessage) => void,
  onConnectionStatusChange?: (isConnected: boolean) => void,
  isReconnect = false,
): WebSocket {
  if (
    activeSocket &&
    activeSocket.readyState === WebSocket.OPEN &&
    activeWheelKey === wheelKey
  ) {
    return activeSocket;
  }

  activeWheelKey = wheelKey;

  if (activeSocket) {
    activeSocket.close();
  }

  if (!isReconnect) {
    reconnectAttempts = 0;
  }

  try {
    const socket = new WebSocket(
      `${WHEEL_WS_BASE_URL}?wheel=${encodeURIComponent(
        wheelKey,
      )}&name=${encodeURIComponent(name)}`,
    );

    socket.onopen = () => {
      console.debug("Wheel WebSocket connection established");
      reconnectAttempts = 0;
      onConnectionStatusChange?.(true);
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as WheelServerMessage;
        console.debug("Received wheel message:", data);

        try {
          onMessage(data);
        } catch (callbackError) {
          console.error("Error in wheel onMessage handler:", callbackError);
        }

        switch (data.type) {
          case "initialize":
          case "userJoined":
          case "userLeft":
          case "entriesUpdated":
          case "spinStarted":
          case "spinEnded":
          case "settingsUpdated":
          case "wheelReset":
          case "pong":
            triggerEventListeners(data.type, data);
            break;

          case "error":
            console.error("Wheel server error:", data.error);
            triggerEventListeners("error", data);
            break;

          default:
            console.warn(
              "Unknown wheel message type:",
              (data as { type: string }).type,
            );
        }
      } catch (error) {
        console.error("Error parsing wheel message:", error);
      }
    };

    socket.onclose = (event) => {
      console.debug(
        "Wheel WebSocket connection closed:",
        event.code,
        event.reason,
      );
      onConnectionStatusChange?.(false);

      if (event.code === 4003) {
        triggerEventListeners("error", {
          type: "error",
          error: "Session expired. Please rejoin the wheel.",
          reason: "auth",
        });
        return;
      }

      if (event.code === 4004) {
        triggerEventListeners("error", {
          type: "error",
          error: "Session superseded. Please refresh the page.",
          reason: "auth",
        });
        return;
      }

      if (event.code !== 1000 && event.code !== 1001) {
        handleReconnect(wheelKey, name, onMessage, onConnectionStatusChange);
      }
    };

    socket.onerror = (error) => {
      console.error("Wheel WebSocket error:", error);

      onConnectionStatusChange?.(false);
      triggerEventListeners("error", {
        type: "error",
        error: "Connection error occurred",
        reason: "disconnect",
      });

      if (activeSocket && activeSocket.readyState === WebSocket.OPEN) {
        activeSocket.close(1011, "Connection error");
      }
    };

    activeSocket = socket;
    return socket;
  } catch (error) {
    console.error("Error creating wheel WebSocket:", error);
    onConnectionStatusChange?.(false);
    triggerEventListeners("error", {
      type: "error",
      error:
        error instanceof Error ? error.message : "Failed to connect to server",
      reason: "disconnect",
    });
    throw error;
  }
}

function handleReconnect(
  wheelKey: string,
  name: string,
  onMessage: (data: WheelServerMessage) => void,
  onConnectionStatusChange?: (isConnected: boolean) => void,
): void {
  if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
    reconnectAttempts++;

    const jitter = Math.random() * 0.3 + 0.85;
    const delay = Math.min(
      RECONNECT_BASE_DELAY * 2 ** reconnectAttempts * jitter,
      MAX_RECONNECT_DELAY,
    );

    console.debug(
      `Attempting to reconnect in ${Math.round(
        delay,
      )}ms (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`,
    );

    setTimeout(() => {
      connectToWheel(
        wheelKey,
        name,
        onMessage,
        onConnectionStatusChange,
        true,
      );
    }, delay);
  } else {
    console.error("Max wheel reconnection attempts reached");
    triggerEventListeners("disconnected", {
      type: "disconnected",
      error: "Connection lost. Please refresh the page to reconnect.",
      reason: "disconnect",
    });
  }
}

export function disconnectFromWheel(): void {
  if (activeSocket) {
    activeSocket.close(1000, "User left the wheel");
    activeSocket = null;
  }
  activeWheelKey = null;
  reconnectAttempts = 0;
}

export function addEventListener(
  event: WheelEventType,
  callback: (data: WheelEventMessage) => void,
): void {
  if (!eventListeners[event]) {
    eventListeners[event] = [];
  }
  eventListeners[event].push(callback);
}

export function removeEventListener(
  event: WheelEventType,
  callback: (data: WheelEventMessage) => void,
): void {
  if (!eventListeners[event]) return;

  eventListeners[event] = eventListeners[event].filter((cb) => cb !== callback);
}

function triggerEventListeners(
  event: WheelEventType,
  data: WheelEventMessage,
): void {
  if (!eventListeners[event]) return;

  for (const callback of eventListeners[event]) {
    try {
      callback(data);
    } catch (error) {
      console.error("Error in wheel event listener:", event, error);
    }
  }
}

export function isConnected(): boolean {
  return activeSocket !== null && activeSocket.readyState === WebSocket.OPEN;
}

export function getConnectionState(): number | null {
  return activeSocket ? activeSocket.readyState : null;
}

export function addEntry(name: string): void {
  if (!activeSocket || activeSocket.readyState !== WebSocket.OPEN) {
    throw new Error("Not connected to wheel");
  }

  activeSocket.send(
    JSON.stringify({
      type: "addEntry",
      name,
    }),
  );
}

export function removeEntry(entryId: string): void {
  if (!activeSocket || activeSocket.readyState !== WebSocket.OPEN) {
    throw new Error("Not connected to wheel");
  }

  activeSocket.send(
    JSON.stringify({
      type: "removeEntry",
      entryId,
    }),
  );
}

export function updateEntry(entryId: string, name: string): void {
  if (!activeSocket || activeSocket.readyState !== WebSocket.OPEN) {
    throw new Error("Not connected to wheel");
  }

  activeSocket.send(
    JSON.stringify({
      type: "updateEntry",
      entryId,
      name,
    }),
  );
}

export function toggleEntry(entryId: string, enabled: boolean): void {
  if (!activeSocket || activeSocket.readyState !== WebSocket.OPEN) {
    throw new Error("Not connected to wheel");
  }

  activeSocket.send(
    JSON.stringify({
      type: "toggleEntry",
      entryId,
      enabled,
    }),
  );
}

export function clearEntries(): void {
  if (!activeSocket || activeSocket.readyState !== WebSocket.OPEN) {
    throw new Error("Not connected to wheel");
  }

  activeSocket.send(
    JSON.stringify({
      type: "clearEntries",
    }),
  );
}

export function bulkAddEntries(names: string[]): void {
  if (!activeSocket || activeSocket.readyState !== WebSocket.OPEN) {
    throw new Error("Not connected to wheel");
  }

  activeSocket.send(
    JSON.stringify({
      type: "bulkAddEntries",
      names,
    }),
  );
}

export function spin(): void {
  if (!activeSocket || activeSocket.readyState !== WebSocket.OPEN) {
    throw new Error("Not connected to wheel");
  }

  activeSocket.send(
    JSON.stringify({
      type: "spin",
    }),
  );
}

export function resetWheel(): void {
  if (!activeSocket || activeSocket.readyState !== WebSocket.OPEN) {
    throw new Error("Not connected to wheel");
  }

  activeSocket.send(
    JSON.stringify({
      type: "resetWheel",
    }),
  );
}

export function updateWheelSettings(settings: Partial<WheelSettings>): void {
  if (!activeSocket || activeSocket.readyState !== WebSocket.OPEN) {
    throw new Error("Not connected to wheel");
  }

  activeSocket.send(
    JSON.stringify({
      type: "updateSettings",
      settings,
    }),
  );
}

export async function updateWheelPasscode(
  wheelKey: string,
  userName: string,
  passcode: string | null,
): Promise<void> {
  try {
    const response = await fetch(
      `${WHEEL_API_BASE_URL}/wheels/${wheelKey}/passcode`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userName, passcode }),
        credentials: "include",
      },
    );

    if (!response.ok) {
      const body = await readJsonSafe(response);
      throw new HttpError({
        message: (body?.error as string) || "Failed to update passcode",
        status: response.status,
        code: (body?.code as string) || undefined,
      });
    }
  } catch (error) {
    console.error("Error updating passcode:", error);
    if (error instanceof HttpError || error instanceof NetworkError) {
      throw error;
    }
    throw new NetworkError("Failed to update passcode", { cause: error });
  }
}
