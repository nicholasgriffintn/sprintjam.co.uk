import type {
  WheelData,
  WheelServerMessage,
  WheelSettings,
} from "@sprintjam/types";

import { WHEEL_API_BASE_URL, WHEEL_WS_BASE_URL } from "@/constants";
import { HttpError, NetworkError, isAbortError } from "@/lib/errors";
import { readJsonSafe, handleJsonResponse } from "@/lib/api-utils";
import {
  wheelsCollection,
  ensureWheelsCollectionReady,
} from "./data/collections";
import {
  createReconnectState,
  resetReconnectAttempts,
  calculateReconnectDelay,
  shouldReconnect,
  incrementReconnectAttempts,
  isWebSocketOpen,
  sendWebSocketMessage,
  EventManager,
  type ReconnectState,
} from "@/lib/websocket-utils";

let activeSocket: WebSocket | null = null;
let activeWheelKey: string | null = null;
let reconnectState: ReconnectState = createReconnectState();

type WheelEventMessage =
  | WheelServerMessage
  | { type: "disconnected"; error: string; reason: "disconnect" };
type WheelEventType = WheelEventMessage["type"];

const eventManager = new EventManager<WheelEventMessage>();

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

export function getCachedWheel(wheelKey: string): WheelData | null {
  return wheelsCollection.get(wheelKey) ?? null;
}

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

    await ensureWheelsCollectionReady();
    wheelsCollection.utils.writeUpsert(data.wheel);

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

    await ensureWheelsCollectionReady();
    wheelsCollection.utils.writeUpsert(data.wheel);

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
    resetReconnectAttempts(reconnectState);
  }

  try {
    const socket = new WebSocket(
      `${WHEEL_WS_BASE_URL}?wheel=${encodeURIComponent(
        wheelKey,
      )}&name=${encodeURIComponent(name)}`,
    );

    socket.onopen = () => {
      console.debug("Wheel WebSocket connection established");
      resetReconnectAttempts(reconnectState);
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
          case "newModerator":
          case "wheelReset":
          case "pong":
            eventManager.triggerEventListeners(data.type, data);
            break;

          case "error":
            console.error("Wheel server error:", data.error);
            eventManager.triggerEventListeners("error", data);
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
        eventManager.triggerEventListeners("error", {
          type: "error",
          error: "Session expired. Please rejoin the wheel.",
          reason: "auth",
        });
        return;
      }

      if (event.code === 4004) {
        eventManager.triggerEventListeners("error", {
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
      eventManager.triggerEventListeners("error", {
        type: "error",
        error: "Connection error occurred",
        reason: "disconnect",
      });

      if (activeSocket && isWebSocketOpen(activeSocket)) {
        activeSocket.close(1011, "Connection error");
      }
    };

    activeSocket = socket;
    return socket;
  } catch (error) {
    console.error("Error creating wheel WebSocket:", error);
    onConnectionStatusChange?.(false);
    eventManager.triggerEventListeners("error", {
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
  if (shouldReconnect(reconnectState)) {
    incrementReconnectAttempts(reconnectState);

    const delay = calculateReconnectDelay(reconnectState);

    console.debug(
      `Attempting to reconnect in ${Math.round(
        delay,
      )}ms (attempt ${reconnectState.attempts}/${reconnectState.maxAttempts})`,
    );

    setTimeout(() => {
      connectToWheel(wheelKey, name, onMessage, onConnectionStatusChange, true);
    }, delay);
  } else {
    console.error("Max wheel reconnection attempts reached");
    eventManager.triggerEventListeners("disconnected", {
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
  resetReconnectAttempts(reconnectState);
}

export function addEventListener(
  event: WheelEventType,
  callback: (data: WheelEventMessage) => void,
): void {
  eventManager.addEventListener(event, callback);
}

export function removeEventListener(
  event: WheelEventType,
  callback: (data: WheelEventMessage) => void,
): void {
  eventManager.removeEventListener(event, callback);
}

export function isConnected(): boolean {
  return isWebSocketOpen(activeSocket);
}

export function getConnectionState(): number | null {
  return activeSocket ? activeSocket.readyState : null;
}

export function addEntry(name: string): void {
  sendWebSocketMessage(activeSocket, { type: "addEntry", name });
}

export function removeEntry(entryId: string): void {
  sendWebSocketMessage(activeSocket, { type: "removeEntry", entryId });
}

export function updateEntry(entryId: string, name: string): void {
  sendWebSocketMessage(activeSocket, { type: "updateEntry", entryId, name });
}

export function toggleEntry(entryId: string, enabled: boolean): void {
  sendWebSocketMessage(activeSocket, { type: "toggleEntry", entryId, enabled });
}

export function clearEntries(): void {
  sendWebSocketMessage(activeSocket, { type: "clearEntries" });
}

export function bulkAddEntries(names: string[]): void {
  sendWebSocketMessage(activeSocket, { type: "bulkAddEntries", names });
}

export function spin(): void {
  sendWebSocketMessage(activeSocket, { type: "spin" });
}

export function resetWheel(): void {
  sendWebSocketMessage(activeSocket, { type: "resetWheel" });
}

export function updateWheelSettings(settings: Partial<WheelSettings>): void {
  sendWebSocketMessage(activeSocket, { type: "updateSettings", settings });
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
