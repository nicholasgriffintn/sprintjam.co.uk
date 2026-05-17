import type {
  RetroData,
  RetroPhase,
  RetroServerMessage,
  RetroSettings,
  WorkspaceActionPriority,
} from "@sprintjam/types";

import { RETRO_API_BASE_URL, RETRO_WS_BASE_URL } from "@/constants";
import { handleJsonResponse } from "@/lib/api-utils";
import { HttpError, NetworkError, isAbortError } from "@/lib/errors";
import {
  EventManager,
  calculateReconnectDelay,
  createReconnectState,
  incrementReconnectAttempts,
  resetReconnectAttempts,
  sendWebSocketMessage,
  shouldReconnect,
  type ReconnectState,
} from "@/lib/websocket-utils";

let activeSocket: WebSocket | null = null;
let activeRetroKey: string | null = null;
let activeUserName: string | null = null;
let reconnectState: ReconnectState = createReconnectState();
let disconnectPending = false;
let reconnectTimer: ReturnType<typeof globalThis.setTimeout> | null = null;

type RetroEventMessage =
  | RetroServerMessage
  | { type: "disconnected"; error: string; reason: "disconnect" }
  | { type: "error"; error: string; reason?: "auth" | "disconnect" };
type RetroEventType = RetroEventMessage["type"];

const eventManager = new EventManager<RetroEventMessage>();

export interface RetroSessionResponse {
  success: boolean;
  retro: RetroData;
}

interface RequestOptions {
  signal?: AbortSignal;
}

export async function createRetro(
  name: string,
  passcode?: string,
  settings?: Partial<RetroSettings>,
  avatar?: string,
  options?: RequestOptions,
): Promise<RetroSessionResponse> {
  try {
    const response = await fetch(`${RETRO_API_BASE_URL}/retros`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        passcode,
        settings,
        templateId: settings?.templateId,
        avatar,
      }),
      credentials: "include",
      signal: options?.signal,
    });

    return await handleJsonResponse<RetroSessionResponse>(
      response,
      "Failed to create retro",
    );
  } catch (error) {
    if (isAbortError(error)) throw error;
    if (error instanceof HttpError || error instanceof NetworkError) {
      throw error;
    }
    throw new NetworkError("Failed to create retro", { cause: error });
  }
}

export async function joinRetro(
  name: string,
  retroKey: string,
  passcode?: string,
  avatar?: string,
  options?: RequestOptions,
): Promise<RetroSessionResponse> {
  try {
    const response = await fetch(`${RETRO_API_BASE_URL}/retros/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, retroKey, passcode, avatar }),
      credentials: "include",
      signal: options?.signal,
    });

    return await handleJsonResponse<RetroSessionResponse>(
      response,
      "Failed to join retro",
    );
  } catch (error) {
    if (isAbortError(error)) throw error;
    if (error instanceof HttpError || error instanceof NetworkError) {
      throw error;
    }
    throw new NetworkError("Failed to join retro", { cause: error });
  }
}

export function connectRetroWebSocket(
  retroKey: string,
  userName: string,
  onMessage: (message: RetroEventMessage) => void,
): WebSocket {
  if (
    activeSocket &&
    (activeSocket.readyState === WebSocket.OPEN ||
      activeSocket.readyState === WebSocket.CONNECTING) &&
    activeRetroKey === retroKey &&
    activeUserName === userName
  ) {
    return activeSocket;
  }

  activeRetroKey = retroKey;
  activeUserName = userName;

  if (reconnectTimer) {
    globalThis.clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  if (activeSocket) {
    activeSocket.onclose = null;
    activeSocket.close();
  }

  resetReconnectAttempts(reconnectState);
  eventManager.clear();
  eventManager.addEventListener("initialize", onMessage);
  eventManager.addEventListener("userJoined", onMessage);
  eventManager.addEventListener("userLeft", onMessage);
  eventManager.addEventListener("retroUpdated", onMessage);
  eventManager.addEventListener("error", onMessage);
  eventManager.addEventListener("disconnected", onMessage);

  const socket = new WebSocket(
    `${RETRO_WS_BASE_URL}?retro=${encodeURIComponent(
      retroKey,
    )}&name=${encodeURIComponent(userName)}`,
  );
  activeSocket = socket;
  disconnectPending = false;

  socket.onopen = () => {
    resetReconnectAttempts(reconnectState);
  };

  socket.onmessage = (event) => {
    const data = JSON.parse(event.data) as RetroEventMessage;
    eventManager.triggerEventListeners(data.type as RetroEventType, data);
  };

  socket.onclose = (event) => {
    if (event.code === 4003) {
      eventManager.triggerEventListeners("error", {
        type: "error",
        error: "Session expired. Rejoin this retro to continue.",
        reason: "auth",
      });
      return;
    }

    eventManager.triggerEventListeners("disconnected", {
      type: "disconnected",
      error: "Retro connection closed",
      reason: "disconnect",
    });

    if (
      !disconnectPending &&
      activeRetroKey === retroKey &&
      activeUserName === userName &&
      activeRetroKey &&
      activeUserName &&
      shouldReconnect(reconnectState)
    ) {
      const delay = calculateReconnectDelay(reconnectState);
      incrementReconnectAttempts(reconnectState);
      reconnectTimer = globalThis.setTimeout(() => {
        if (activeRetroKey !== retroKey || activeUserName !== userName) {
          return;
        }

        activeSocket = null;
        connectRetroWebSocket(retroKey, userName, onMessage);
      }, delay);
    }
  };

  return socket;
}

export function disconnectRetroWebSocket(): void {
  disconnectPending = true;
  if (reconnectTimer) {
    globalThis.clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  activeSocket?.close();
  activeSocket = null;
  activeRetroKey = null;
  activeUserName = null;
  eventManager.clear();
  resetReconnectAttempts(reconnectState);
}

export function sendRetroCard(columnId: string, text: string): void {
  sendWebSocketMessage(activeSocket, { type: "addCard", columnId, text });
}

export function updateRetroCard(cardId: string, text: string): void {
  sendWebSocketMessage(activeSocket, { type: "updateCard", cardId, text });
}

export function moveRetroCard(cardId: string, columnId: string): void {
  sendWebSocketMessage(activeSocket, { type: "moveCard", cardId, columnId });
}

export function groupRetroCards(cardIds: string[], title: string): void {
  sendWebSocketMessage(activeSocket, { type: "groupCards", cardIds, title });
}

export function ungroupRetroCard(cardId: string): void {
  sendWebSocketMessage(activeSocket, { type: "ungroupCard", cardId });
}

export function voteRetroCard(cardId: string): void {
  sendWebSocketMessage(activeSocket, { type: "voteCard", cardId });
}

export function deleteRetroCard(cardId: string): void {
  sendWebSocketMessage(activeSocket, { type: "deleteCard", cardId });
}

export function setRetroPhase(phase: RetroPhase): void {
  sendWebSocketMessage(activeSocket, { type: "setPhase", phase });
}

export function setRetroReady(ready: boolean): void {
  sendWebSocketMessage(activeSocket, { type: "setReady", ready });
}

export function startRetroTimer(): void {
  sendWebSocketMessage(activeSocket, { type: "startTimer" });
}

export function pauseRetroTimer(): void {
  sendWebSocketMessage(activeSocket, { type: "pauseTimer" });
}

export function resetRetroTimer(): void {
  sendWebSocketMessage(activeSocket, { type: "resetTimer" });
}

export function configureRetroTimer(config: {
  targetDurationSeconds?: number;
  resetCountdown?: boolean;
}): void {
  sendWebSocketMessage(activeSocket, { type: "configureTimer", config });
}

export function extendRetroTimer(seconds: number): void {
  sendWebSocketMessage(activeSocket, { type: "extendTimer", seconds });
}

export function addRetroAction(
  title: string,
  options: {
    owner?: string;
    dueAt?: number | null;
    priority?: WorkspaceActionPriority;
  } = {},
): void {
  sendWebSocketMessage(activeSocket, { type: "addAction", title, ...options });
}

export function updateRetroAction(
  actionId: string,
  options: {
    title?: string;
    owner?: string | null;
    dueAt?: number | null;
    priority?: WorkspaceActionPriority;
  },
): void {
  sendWebSocketMessage(activeSocket, {
    type: "updateAction",
    actionId,
    ...options,
  });
}

export function toggleRetroAction(actionId: string, completed: boolean): void {
  sendWebSocketMessage(activeSocket, {
    type: "toggleAction",
    actionId,
    completed,
  });
}

export function completeRetro(): void {
  sendWebSocketMessage(activeSocket, { type: "completeRetro" });
}
