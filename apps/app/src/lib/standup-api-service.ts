import type {
  StandupData,
  StandupResponse,
  StandupResponsePayload,
} from "@sprintjam/types";

import { STANDUP_API_BASE_URL, STANDUP_WS_BASE_URL } from "@/constants";
import { HttpError, NetworkError, isAbortError } from "@/lib/errors";
import { handleJsonResponse, readJsonSafe } from "@/lib/api-utils";
import {
  calculateReconnectDelay,
  createReconnectState,
  incrementReconnectAttempts,
  isWebSocketOpen,
  resetReconnectAttempts,
  sendWebSocketMessage,
  shouldReconnect,
  type ReconnectState,
} from "@/lib/websocket-utils";

let activeSocket: WebSocket | null = null;
let activeStandupKey: string | null = null;
let reconnectState: ReconnectState = createReconnectState();
let intentionalDisconnect = false;

export interface StandupSessionResponse {
  success: boolean;
  standup: StandupData;
  recoveryPasskey?: string;
}

interface RequestOptions {
  signal?: AbortSignal;
}

type SocketErrorReason = "auth" | "disconnect";

export type StandupServerMessage =
  | { type: "initialize"; standup: StandupData }
  | {
      type: "userJoined";
      user: string;
      users: string[];
      userAvatars?: Record<string, string>;
    }
  | { type: "userLeft"; user: string; users: string[] }
  | {
      type: "responseSubmitted";
      userName: string;
      hasResponded: boolean;
      respondedUsers: string[];
    }
  | { type: "responseUpdated"; response: StandupResponse }
  | { type: "responseConfirmed"; response: StandupResponse }
  | { type: "responsesLocked" }
  | { type: "responsesUnlocked" }
  | { type: "presentationStarted" }
  | { type: "presentationEnded" }
  | { type: "standupCompleted" }
  | { type: "userFocused"; userName: string }
  | {
      type: "reactionAdded";
      responseUserName: string;
      reactingUserName: string;
      emoji: string;
    }
  | {
      type: "reactionRemoved";
      responseUserName: string;
      reactingUserName: string;
      emoji: string;
    }
  | { type: "pong" }
  | { type: "error"; error: string; reason?: SocketErrorReason }
  | { type: "disconnected"; error: string; reason: "disconnect" };

export async function createStandup(
  name: string,
  passcode?: string,
  avatar?: string,
  teamId?: number,
  options?: RequestOptions,
): Promise<StandupSessionResponse> {
  try {
    const response = await fetch(`${STANDUP_API_BASE_URL}/standups`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, passcode, avatar, teamId }),
      signal: options?.signal,
      credentials: "include",
    });

    const data = await handleJsonResponse<StandupSessionResponse>(
      response,
      "Failed to create standup",
    );

    if (!data.standup) {
      throw new NetworkError(
        "Invalid response from server while creating standup",
      );
    }

    return data;
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }

    console.error("Error creating standup:", error);
    if (error instanceof HttpError || error instanceof NetworkError) {
      throw error;
    }

    throw new NetworkError("Failed to create standup", { cause: error });
  }
}

export async function joinStandup(
  name: string,
  standupKey: string,
  passcode?: string,
  avatar?: string,
  authToken?: string,
  options?: RequestOptions,
): Promise<StandupSessionResponse> {
  try {
    const response = await fetch(`${STANDUP_API_BASE_URL}/standups/join`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        standupKey,
        passcode,
        avatar,
        authToken,
      }),
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
        message: (body?.error as string) || "Failed to join standup",
        status: response.status,
        code: (body?.code as string) || undefined,
      });
    }

    const data = await handleJsonResponse<StandupSessionResponse>(
      response,
      "Failed to join standup",
    );

    if (!data.standup) {
      throw new NetworkError(
        "Invalid response from server while joining standup",
      );
    }

    return data;
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }

    console.error("Error joining standup:", error);
    if (error instanceof HttpError || error instanceof NetworkError) {
      throw error;
    }

    throw new NetworkError("Failed to join standup", { cause: error });
  }
}

export async function recoverStandupSession(
  name: string,
  standupKey: string,
  recoveryPasskey: string,
): Promise<void> {
  try {
    const response = await fetch(`${STANDUP_API_BASE_URL}/standups/recover`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, standupKey, recoveryPasskey }),
      credentials: "include",
    });

    await handleJsonResponse<{ success: boolean }>(
      response,
      "Failed to recover standup session",
    );
  } catch (error) {
    if (error instanceof HttpError || error instanceof NetworkError) {
      throw error;
    }
    throw new NetworkError("Failed to recover standup session", {
      cause: error,
    });
  }
}

export function connectToStandup(
  standupKey: string,
  name: string,
  onMessage: (data: StandupServerMessage) => void,
  onConnectionStatusChange?: (isConnected: boolean) => void,
  isReconnect = false,
): WebSocket {
  if (
    activeSocket &&
    activeSocket.readyState === WebSocket.OPEN &&
    activeStandupKey === standupKey
  ) {
    return activeSocket;
  }

  activeStandupKey = standupKey;

  if (activeSocket) {
    activeSocket.close();
  }

  intentionalDisconnect = false;

  if (!isReconnect) {
    resetReconnectAttempts(reconnectState);
  }

  try {
    const socket = new WebSocket(
      `${STANDUP_WS_BASE_URL}?standup=${encodeURIComponent(
        standupKey,
      )}&name=${encodeURIComponent(name)}`,
    );

    socket.onopen = () => {
      resetReconnectAttempts(reconnectState);
      onConnectionStatusChange?.(true);
    };

    socket.onmessage = (event) => {
      try {
        onMessage(JSON.parse(event.data) as StandupServerMessage);
      } catch (error) {
        console.error("Error parsing standup WebSocket message:", error);
      }
    };

    socket.onclose = (event) => {
      onConnectionStatusChange?.(false);

      if (event.code === 4003) {
        onMessage({
          type: "error",
          error: "Session expired. Rejoin this standup to continue.",
          reason: "auth",
        });
        return;
      }

      if (event.code === 4004) {
        onMessage({
          type: "error",
          error: "This session was replaced by a newer connection.",
          reason: "auth",
        });
        return;
      }

      if (event.code !== 1000 && event.code !== 1001) {
        handleReconnect(standupKey, name, onMessage, onConnectionStatusChange);
      }
    };

    socket.onerror = (error) => {
      console.error("Standup WebSocket error:", error);
      onConnectionStatusChange?.(false);
      onMessage({
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
    console.error("Error creating standup WebSocket:", error);
    onConnectionStatusChange?.(false);
    onMessage({
      type: "error",
      error:
        error instanceof Error ? error.message : "Failed to connect to server",
      reason: "disconnect",
    });
    throw error;
  }
}

function handleReconnect(
  standupKey: string,
  name: string,
  onMessage: (data: StandupServerMessage) => void,
  onConnectionStatusChange?: (isConnected: boolean) => void,
) {
  if (intentionalDisconnect) {
    return;
  }

  if (shouldReconnect(reconnectState)) {
    incrementReconnectAttempts(reconnectState);
    const delay = calculateReconnectDelay(reconnectState);

    window.setTimeout(() => {
      connectToStandup(
        standupKey,
        name,
        onMessage,
        onConnectionStatusChange,
        true,
      );
    }, delay);
    return;
  }

  onMessage({
    type: "disconnected",
    error: "Connection lost. Refresh or rejoin the standup to reconnect.",
    reason: "disconnect",
  });
}

export function disconnectFromStandup(): void {
  intentionalDisconnect = true;

  if (activeSocket) {
    activeSocket.close(1000, "User left the standup");
    activeSocket = null;
  }

  activeStandupKey = null;
  resetReconnectAttempts(reconnectState);
}

export function submitStandupResponse(payload: StandupResponsePayload): void {
  sendWebSocketMessage(activeSocket, {
    type: "submitResponse",
    isInPerson: payload.isInPerson,
    yesterday: payload.yesterday,
    today: payload.today,
    hasBlocker: payload.hasBlocker,
    blockerDescription: payload.blockerDescription,
    healthCheck: payload.healthCheck,
    isHealthCheckPrivate: payload.isHealthCheckPrivate,
    linkedTickets: payload.linkedTickets,
    kudos: payload.kudos,
    icebreakerAnswer: payload.icebreakerAnswer,
    icebreakerQuestion: payload.icebreakerQuestion,
  });
}

export function lockStandupResponses(): void {
  sendWebSocketMessage(activeSocket, { type: "lockResponses" });
}

export function unlockStandupResponses(): void {
  sendWebSocketMessage(activeSocket, { type: "unlockResponses" });
}

export function startStandupPresentation(): void {
  sendWebSocketMessage(activeSocket, { type: "startPresentation" });
}

export function endStandupPresentation(): void {
  sendWebSocketMessage(activeSocket, { type: "endPresentation" });
}

export function completeStandup(): void {
  sendWebSocketMessage(activeSocket, { type: "completeStandup" });
}

export function focusStandupUser(userName: string): void {
  sendWebSocketMessage(activeSocket, { type: "focusUser", userName });
}

export function pingStandup(): void {
  sendWebSocketMessage(activeSocket, { type: "ping" });
}

export function addStandupReaction(
  responseUserName: string,
  emoji: string,
): void {
  sendWebSocketMessage(activeSocket, {
    type: "addReaction",
    responseUserName,
    emoji,
  });
}

export function removeStandupReaction(
  responseUserName: string,
  emoji: string,
): void {
  sendWebSocketMessage(activeSocket, {
    type: "removeReaction",
    responseUserName,
    emoji,
  });
}
