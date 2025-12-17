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
} from "@/types";
import { API_BASE_URL, WS_BASE_URL } from "@/constants";
import { safeLocalStorage } from "@/utils/storage";
import {
  SERVER_DEFAULTS_DOCUMENT_KEY,
  roomsCollection,
  serverDefaultsCollection,
  ensureRoomsCollectionReady,
  ensureServerDefaultsCollectionReady,
} from "./data/collections";
import { AUTH_TOKEN_STORAGE_KEY } from "@/constants";

let activeSocket: WebSocket | null = null;
let activeAuthToken: string | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_BASE_DELAY = 1000;
const MAX_RECONNECT_DELAY = 30000;
const eventListeners: Record<string, ((data: WebSocketMessage) => void)[]> = {};

let voteDebounceTimer: ReturnType<typeof setTimeout> | null = null;
const VOTE_DEBOUNCE_MS = 300;

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
): Promise<{ room: RoomData; defaults?: ServerDefaults; authToken?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/rooms`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, passcode, settings, avatar }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      const error = new Error(
        errorData.error || `Failed to create room: ${response.status}`,
      ) as Error & { status?: number };
      error.status = response.status;
      throw error;
    }

    const data = (await response.json()) as {
      room?: RoomData;
      defaults?: ServerDefaults;
      authToken?: string;
      error?: string;
    };

    if (!data.room) {
      throw new Error("Invalid response from server while creating room");
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
      authToken: data.authToken,
    };
  } catch (error) {
    console.error("Error creating room:", error);
    throw error;
  }
}

export async function joinRoom(
  name: string,
  roomKey: string,
  passcode?: string,
  avatar?: AvatarId,
  authToken?: string,
): Promise<{ room: RoomData; defaults?: ServerDefaults; authToken?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/rooms/join`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, roomKey, passcode, avatar, authToken }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      const error = new Error(
        errorData.error || `Failed to join room: ${response.status}`,
      ) as Error & { status?: number };
      error.status = response.status;
      throw error;
    }

    const data = (await response.json()) as {
      room?: RoomData;
      defaults?: ServerDefaults;
      authToken?: string;
      error?: string;
    };

    if (!data.room) {
      throw new Error("Invalid response from server while joining room");
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
      authToken: data.authToken,
    };
  } catch (error) {
    console.error("Error joining room:", error);
    throw error;
  }
}

export function connectToRoom(
  roomKey: string,
  name: string,
  authToken: string,
  onMessage: (data: WebSocketMessage) => void,
  onConnectionStatusChange?: (isConnected: boolean) => void,
): WebSocket {
  if (!authToken) {
    throw new Error("Missing auth token for room connection");
  }

  activeAuthToken = authToken;

  if (activeSocket) {
    activeSocket.close();
  }

  reconnectAttempts = 0;

  try {
    const socket = new WebSocket(
      `${WS_BASE_URL}?room=${encodeURIComponent(
        roomKey,
      )}&name=${encodeURIComponent(name)}&token=${encodeURIComponent(
        authToken,
      )}`,
    );

    socket.onopen = () => {
      console.debug("WebSocket connection established");
      reconnectAttempts = 0;
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
          case "vote":
          case "showVotes":
          case "resetVotes":
          case "newModerator":
          case "settingsUpdated":
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
            triggerEventListeners(data.type, data);
            break;

          case "error":
            console.error("Server error:", data.error);
            triggerEventListeners("error", data);
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
        triggerEventListeners("error", {
          type: "error",
          error: "Session expired. Please rejoin the room.",
          closeCode: event.code,
        });
        activeAuthToken = null;
        safeLocalStorage.remove(AUTH_TOKEN_STORAGE_KEY);
        return;
      }

      if (event.code === 4001) {
        triggerEventListeners("error", {
          type: "error",
          error: "Disconnected due to inactivity. Reconnecting...",
          closeCode: event.code,
        });
      }

      if (event.code !== 1000 && event.code !== 1001) {
        handleReconnect(roomKey, name, onMessage, onConnectionStatusChange);
      }
    };

    socket.onerror = (error) => {
      console.error("WebSocket error:", error);

      onConnectionStatusChange?.(false);
      triggerEventListeners("error", {
        type: "error",
        error: "Connection error occurred",
        closeCode: 1006,
      });

      if (activeSocket && activeSocket.readyState === WebSocket.OPEN) {
        activeSocket.close(1011, "Connection error");
      }
    };

    activeSocket = socket;
    return socket;
  } catch (error) {
    console.error("Error creating WebSocket:", error);
    onConnectionStatusChange?.(false);
    triggerEventListeners("error", {
      type: "error",
      error:
        error instanceof Error ? error.message : "Failed to connect to server",
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
  if (!activeAuthToken) {
    console.error("Missing auth token; cannot reconnect");
    triggerEventListeners("disconnected", {
      type: "disconnected",
      error: "Session expired. Please rejoin the room.",
    });
    return;
  }

  if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
    reconnectAttempts++;

    const jitter = Math.random() * 0.3 + 0.85; // Random value between 0.85 and 1.15
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
      connectToRoom(
        roomKey,
        name,
        activeAuthToken as string,
        onMessage,
        onConnectionStatusChange,
      );
    }, delay);
  } else {
    console.error("Max reconnection attempts reached");
    triggerEventListeners("disconnected", {
      type: "disconnected",
      error: "Connection lost. Please refresh the page to reconnect.",
    });
  }
}

export function submitVote(
  vote: VoteValue | StructuredVote,
  immediate = false,
): void {
  if (!activeSocket || activeSocket.readyState !== WebSocket.OPEN) {
    throw new Error("Not connected to room");
  }

  if (voteDebounceTimer) {
    clearTimeout(voteDebounceTimer);
  }

  const sendVote = () => {
    activeSocket?.send(
      JSON.stringify({
        type: "vote",
        vote,
      }),
    );
  };

  if (immediate) {
    sendVote();
  } else {
    voteDebounceTimer = setTimeout(sendVote, VOTE_DEBOUNCE_MS);
  }
}

export function toggleShowVotes(): void {
  if (!activeSocket || activeSocket.readyState !== WebSocket.OPEN) {
    throw new Error("Not connected to room");
  }

  activeSocket.send(
    JSON.stringify({
      type: "showVotes",
    }),
  );
}

export function resetVotes(): void {
  if (!activeSocket || activeSocket.readyState !== WebSocket.OPEN) {
    throw new Error("Not connected to room");
  }

  activeSocket.send(
    JSON.stringify({
      type: "resetVotes",
    }),
  );
}

export function requestStrudelGeneration(): void {
  if (!activeSocket || activeSocket.readyState !== WebSocket.OPEN) {
    throw new Error("Not connected to room");
  }

  activeSocket.send(
    JSON.stringify({
      type: "generateStrudelCode",
    }),
  );
}

export function toggleStrudelPlayback(): void {
  if (!activeSocket || activeSocket.readyState !== WebSocket.OPEN) {
    throw new Error("Not connected to room");
  }

  activeSocket.send(
    JSON.stringify({
      type: "toggleStrudelPlayback",
    }),
  );
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
  activeAuthToken = null;
  reconnectAttempts = 0;
}

export function addEventListener(
  event: WebSocketMessageType,
  callback: (data: WebSocketMessage) => void,
): void {
  if (!eventListeners[event]) {
    eventListeners[event] = [];
  }
  eventListeners[event].push(callback);
}

export function removeEventListener(
  event: WebSocketMessageType,
  callback: (data: WebSocketMessage) => void,
): void {
  if (!eventListeners[event]) return;

  eventListeners[event] = eventListeners[event].filter((cb) => cb !== callback);
}

function triggerEventListeners(
  event: WebSocketMessageType,
  data: WebSocketMessage,
): void {
  if (!eventListeners[event]) return;

  for (const callback of eventListeners[event]) {
    try {
      callback(data);
    } catch (error) {
      console.error(`Error in ${event} event listener:`, error);
    }
  }
}

export function isConnected(): boolean {
  return activeSocket !== null && activeSocket.readyState === WebSocket.OPEN;
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
  if (!activeSocket || activeSocket.readyState !== WebSocket.OPEN) {
    throw new Error("Not connected to room");
  }

  activeSocket.send(
    JSON.stringify({
      type: "updateSettings",
      settings,
    }),
  );
}

export function nextTicket(): void {
  if (!activeSocket || activeSocket.readyState !== WebSocket.OPEN) {
    throw new Error("Not connected to room");
  }

  activeSocket.send(
    JSON.stringify({
      type: "nextTicket",
    }),
  );
}

export function addTicket(ticket: Partial<TicketQueueItem>): void {
  if (!activeSocket || activeSocket.readyState !== WebSocket.OPEN) {
    throw new Error("Not connected to room");
  }

  activeSocket.send(
    JSON.stringify({
      type: "addTicket",
      ticket,
    }),
  );
}

export function updateTicket(
  ticketId: number,
  updates: Partial<TicketQueueItem>,
): void {
  if (!activeSocket || activeSocket.readyState !== WebSocket.OPEN) {
    throw new Error("Not connected to room");
  }

  activeSocket.send(
    JSON.stringify({
      type: "updateTicket",
      ticketId,
      updates,
    }),
  );
}

export function deleteTicket(ticketId: number): void {
  if (!activeSocket || activeSocket.readyState !== WebSocket.OPEN) {
    throw new Error("Not connected to room");
  }

  activeSocket.send(
    JSON.stringify({
      type: "deleteTicket",
      ticketId,
    }),
  );
}

export function completeTicket(outcome?: string): void {
  if (!activeSocket || activeSocket.readyState !== WebSocket.OPEN) {
    throw new Error("Not connected to room");
  }

  activeSocket.send(
    JSON.stringify({
      type: "completeTicket",
      outcome,
    }),
  );
}

export function startTimer(): void {
  if (!activeSocket || activeSocket.readyState !== WebSocket.OPEN) {
    throw new Error("Not connected to room");
  }

  activeSocket.send(
    JSON.stringify({
      type: "startTimer",
    }),
  );
}

export function pauseTimer(): void {
  if (!activeSocket || activeSocket.readyState !== WebSocket.OPEN) {
    throw new Error("Not connected to room");
  }

  activeSocket.send(
    JSON.stringify({
      type: "pauseTimer",
    }),
  );
}

export function resetTimer(): void {
  if (!activeSocket || activeSocket.readyState !== WebSocket.OPEN) {
    throw new Error("Not connected to room");
  }

  activeSocket.send(
    JSON.stringify({
      type: "resetTimer",
    }),
  );
}

export function configureTimer(config: {
  targetDurationSeconds?: number;
  autoResetOnVotesReset?: boolean;
  resetCountdown?: boolean;
}): void {
  if (!activeSocket || activeSocket.readyState !== WebSocket.OPEN) {
    throw new Error("Not connected to room");
  }

  activeSocket.send(
    JSON.stringify({
      type: "configureTimer",
      config,
    }),
  );
}
