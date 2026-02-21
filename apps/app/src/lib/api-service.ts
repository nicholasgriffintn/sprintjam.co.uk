import type {
  RoomData,
  VoteValue,
  RoomSettings,
  StructuredVote,
  ServerDefaults,
  WebSocketMessage,
  WebSocketMessageType,
  AvatarId,
  TicketQueueItem,
  RoomGameType,
} from "@/types";
import { API_BASE_URL, WS_BASE_URL } from "@/constants";
import {
  SERVER_DEFAULTS_DOCUMENT_KEY,
  roomsCollection,
  serverDefaultsCollection,
  ensureRoomsCollectionReady,
  ensureServerDefaultsCollectionReady,
} from "./data/collections";
import { HttpError, NetworkError, isAbortError } from "@/lib/errors";
import { handleJsonResponse } from "@/lib/api-utils";
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
let activeRoomKey: string | null = null;
let reconnectState: ReconnectState = createReconnectState();
const eventManager = new EventManager<WebSocketMessage>();

let voteDebounceTimer: ReturnType<typeof setTimeout> | null = null;
const VOTE_DEBOUNCE_MS = 300;

interface RequestOptions {
  signal?: AbortSignal;
}

export function getCachedDefaultSettings(): ServerDefaults | null {
  return serverDefaultsCollection.get(SERVER_DEFAULTS_DOCUMENT_KEY) ?? null;
}

export async function fetchDefaultSettings(
  forceRefresh = false,
): Promise<ServerDefaults> {
  if (forceRefresh) {
    await serverDefaultsCollection.utils.refetch({ throwOnError: true });
  } else {
    await serverDefaultsCollection.preload();
    await serverDefaultsCollection.toArrayWhenReady();
  }

  const defaults =
    serverDefaultsCollection.get(SERVER_DEFAULTS_DOCUMENT_KEY) ?? null;

  if (!defaults) {
    throw new Error("Unable to load default settings from server");
  }

  return defaults;
}

export async function createRoom(
  name: string,
  passcode?: string,
  settings?: Partial<RoomSettings>,
  avatar?: AvatarId,
  options?: RequestOptions,
): Promise<{ room: RoomData; defaults?: ServerDefaults }> {
  try {
    const response = await fetch(`${API_BASE_URL}/rooms`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, passcode, settings, avatar }),
      signal: options?.signal,
      credentials: "include",
    });

    const data = await handleJsonResponse<{
      room?: RoomData;
      defaults?: ServerDefaults;
      error?: string;
    }>(response, "Failed to create room");

    if (!data.room) {
      throw new NetworkError(
        "Invalid response from server while creating room",
      );
    }

    await ensureRoomsCollectionReady();
    roomsCollection.utils.writeUpsert(data.room);
    if (data.defaults) {
      await ensureServerDefaultsCollectionReady();
      serverDefaultsCollection.utils.writeUpsert(data.defaults);
    }

    return {
      room: data.room,
      defaults: data.defaults,
    };
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }
    console.error("Error creating room:", error);
    if (error instanceof HttpError || error instanceof NetworkError) {
      throw error;
    }
    throw new NetworkError("Failed to create room", { cause: error });
  }
}

export async function joinRoom(
  name: string,
  roomKey: string,
  passcode?: string,
  avatar?: AvatarId,
  options?: RequestOptions,
): Promise<{ room: RoomData; defaults?: ServerDefaults }> {
  try {
    const response = await fetch(`${API_BASE_URL}/rooms/join`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, roomKey, passcode, avatar }),
      signal: options?.signal,
      credentials: "include",
    });

    const data = await handleJsonResponse<{
      room?: RoomData;
      defaults?: ServerDefaults;
      error?: string;
    }>(response, "Failed to join room");

    if (!data.room) {
      throw new NetworkError("Invalid response from server while joining room");
    }

    await ensureRoomsCollectionReady();
    roomsCollection.utils.writeUpsert(data.room);
    if (data.defaults) {
      await ensureServerDefaultsCollectionReady();
      serverDefaultsCollection.utils.writeUpsert(data.defaults);
    }

    return {
      room: data.room,
      defaults: data.defaults,
    };
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }
    console.error("Error joining room:", error);
    if (error instanceof HttpError || error instanceof NetworkError) {
      throw error;
    }
    throw new NetworkError("Failed to join room", { cause: error });
  }
}

export function connectToRoom(
  roomKey: string,
  name: string,
  onMessage: (data: WebSocketMessage) => void,
  onConnectionStatusChange?: (isConnected: boolean) => void,
): WebSocket {
  if (
    activeSocket &&
    activeSocket.readyState === WebSocket.OPEN &&
    activeRoomKey === roomKey
  ) {
    return activeSocket;
  }

  activeRoomKey = roomKey;

  if (activeSocket) {
    activeSocket.close();
  }

  resetReconnectAttempts(reconnectState);

  try {
    const socket = new WebSocket(
      `${WS_BASE_URL}?room=${encodeURIComponent(roomKey)}&name=${encodeURIComponent(name)}`,
    );

    socket.onopen = () => {
      console.debug("WebSocket connection established");
      resetReconnectAttempts(reconnectState);
      onConnectionStatusChange?.(true);
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as WebSocketMessage;
        console.debug("Received message:", data);

        try {
          onMessage(data);
        } catch (callbackError) {
          console.error("Error in onMessage handler:", callbackError);
        }

        switch (data.type) {
          case "initialize":
          case "userJoined":
          case "userLeft":
          case "userConnectionStatus":
          case "spectatorStatusChanged":
          case "vote":
          case "showVotes":
          case "resetVotes":
          case "newModerator":
          case "settingsUpdated":
          case "roomStatusUpdated":
          case "judgeScoreUpdated":
          case "strudelCodeGenerated":
          case "strudelPlaybackToggled":
          case "nextTicket":
          case "ticketAdded":
          case "ticketUpdated":
          case "ticketDeleted":
          case "ticketCompleted":
          case "queueUpdated":
          case "timerStarted":
          case "timerPaused":
          case "timerReset":
          case "timerUpdated":
          case "gameStarted":
          case "gameMoveSubmitted":
          case "gameEnded":
            eventManager.triggerEventListeners(data.type, data);
            break;

          case "error":
            console.error("Server error:", data.error);
            eventManager.triggerEventListeners("error", data);
            break;

          default:
            console.warn("Unknown message type:", data.type);
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    socket.onclose = (event) => {
      console.debug("WebSocket connection closed:", event.code, event.reason);
      onConnectionStatusChange?.(false);

      if (event.code === 4003) {
        eventManager.triggerEventListeners("error", {
          type: "error",
          error: "Session expired. Please rejoin the room.",
          closeCode: event.code,
          reason: "auth",
        });
        return;
      }

      if (event.code === 4001) {
        eventManager.triggerEventListeners("error", {
          type: "error",
          error: "Disconnected due to inactivity. Reconnecting...",
          closeCode: event.code,
          reason: "disconnect",
        });
      }

      if (event.code !== 1000 && event.code !== 1001) {
        handleReconnect(roomKey, name, onMessage, onConnectionStatusChange);
      }
    };

    socket.onerror = (error) => {
      console.error("WebSocket error:", error);

      onConnectionStatusChange?.(false);
      eventManager.triggerEventListeners("error", {
        type: "error",
        error: "Connection error occurred",
        closeCode: 1006,
        reason: "network",
      });

      if (activeSocket && isWebSocketOpen(activeSocket)) {
        activeSocket.close(1011, "Connection error");
      }
    };

    activeSocket = socket;
    return socket;
  } catch (error) {
    console.error("Error creating WebSocket:", error);
    onConnectionStatusChange?.(false);
    eventManager.triggerEventListeners("error", {
      type: "error",
      error:
        error instanceof Error ? error.message : "Failed to connect to server",
      reason: "network",
    });
    throw error;
  }
}

function handleReconnect(
  roomKey: string,
  name: string,
  onMessage: (data: WebSocketMessage) => void,
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
      connectToRoom(roomKey, name, onMessage, onConnectionStatusChange);
    }, delay);
  } else {
    console.error("Max reconnection attempts reached");
    eventManager.triggerEventListeners("disconnected", {
      type: "disconnected",
      error: "Connection lost. Please refresh the page to reconnect.",
      reason: "disconnect",
    });
  }
}

export function submitVote(
  vote: VoteValue | StructuredVote,
  immediate = false,
): void {
  if (!isWebSocketOpen(activeSocket)) {
    throw new Error("Not connected to room");
  }

  if (voteDebounceTimer) {
    clearTimeout(voteDebounceTimer);
  }

  const sendVote = () => {
    sendWebSocketMessage(activeSocket, { type: "vote", vote });
  };

  if (immediate) {
    sendVote();
  } else {
    voteDebounceTimer = setTimeout(sendVote, VOTE_DEBOUNCE_MS);
  }
}

export function toggleShowVotes(): void {
  sendWebSocketMessage(activeSocket, { type: "showVotes" });
}

export function toggleSpectatorMode(isSpectator: boolean): void {
  sendWebSocketMessage(activeSocket, { type: "toggleSpectator", isSpectator });
}

export function resetVotes(): void {
  sendWebSocketMessage(activeSocket, { type: "resetVotes" });
}

export function requestStrudelGeneration(): void {
  sendWebSocketMessage(activeSocket, { type: "generateStrudelCode" });
}

export function toggleStrudelPlayback(): void {
  sendWebSocketMessage(activeSocket, { type: "toggleStrudelPlayback" });
}

export function disconnectFromRoom(): void {
  if (activeSocket) {
    activeSocket.close(1000, "User left the room");
    activeSocket = null;
  }
  if (voteDebounceTimer) {
    clearTimeout(voteDebounceTimer);
    voteDebounceTimer = null;
  }
  activeRoomKey = null;
  resetReconnectAttempts(reconnectState);
}

export function addEventListener(
  event: WebSocketMessageType,
  callback: (data: WebSocketMessage) => void,
): void {
  eventManager.addEventListener(event, callback);
}

export function removeEventListener(
  event: WebSocketMessageType,
  callback: (data: WebSocketMessage) => void,
): void {
  eventManager.removeEventListener(event, callback);
}

export function isConnected(): boolean {
  return isWebSocketOpen(activeSocket);
}

export function getConnectionState(): number | null {
  return activeSocket ? activeSocket.readyState : null;
}

export async function getRoomSettings(roomKey: string): Promise<RoomSettings> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/rooms/settings?roomKey=${encodeURIComponent(roomKey)}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error || `Failed to get room settings: ${response.status}`,
      );
    }

    const data = await response.json();
    return data.settings;
  } catch (error) {
    console.error("Error getting room settings:", error);
    throw error;
  }
}

export async function updateRoomSettings(
  name: string,
  roomKey: string,
  settings: Partial<RoomSettings>,
): Promise<RoomSettings> {
  try {
    const response = await fetch(`${API_BASE_URL}/rooms/settings`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, roomKey, settings }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error || `Failed to update room settings: ${response.status}`,
      );
    }

    const data = await response.json();
    return data.settings;
  } catch (error) {
    console.error("Error updating room settings:", error);
    throw error;
  }
}

export function updateSettings(settings: Partial<RoomSettings>): void {
  sendWebSocketMessage(activeSocket, { type: "updateSettings", settings });
}

export function selectTicket(ticketId: number): void {
  sendWebSocketMessage(activeSocket, { type: "selectTicket", ticketId });
}

export function nextTicket(): void {
  sendWebSocketMessage(activeSocket, { type: "nextTicket" });
}

export function addTicket(ticket: Partial<TicketQueueItem>): void {
  sendWebSocketMessage(activeSocket, { type: "addTicket", ticket });
}

export function updateTicket(
  ticketId: number,
  updates: Partial<TicketQueueItem>,
): void {
  sendWebSocketMessage(activeSocket, {
    type: "updateTicket",
    ticketId,
    updates,
  });
}

export function deleteTicket(ticketId: number): void {
  sendWebSocketMessage(activeSocket, { type: "deleteTicket", ticketId });
}

export function startTimer(): void {
  sendWebSocketMessage(activeSocket, { type: "startTimer" });
}

export function pauseTimer(): void {
  sendWebSocketMessage(activeSocket, { type: "pauseTimer" });
}

export function resetTimer(): void {
  sendWebSocketMessage(activeSocket, { type: "resetTimer" });
}

export function configureTimer(config: {
  targetDurationSeconds?: number;
  autoResetOnVotesReset?: boolean;
  resetCountdown?: boolean;
}): void {
  sendWebSocketMessage(activeSocket, { type: "configureTimer", config });
}

export function completeSession(): void {
  sendWebSocketMessage(activeSocket, { type: "completeSession" });
}

export function startGame(gameType: RoomGameType): void {
  sendWebSocketMessage(activeSocket, { type: "startGame", gameType });
}

export function submitGameMove(value: string): void {
  sendWebSocketMessage(activeSocket, { type: "submitGameMove", value });
}

export function endGame(): void {
  sendWebSocketMessage(activeSocket, { type: "endGame" });
}
