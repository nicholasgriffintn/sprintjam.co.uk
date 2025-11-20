import { useEffect } from "react";

import {
  connectToRoom,
  disconnectFromRoom,
  addEventListener,
  removeEventListener,
} from "../lib/api-service";
import type { WebSocketMessage, WebSocketMessageType } from "../types";

interface UseRoomConnectionOptions {
  screen: string;
  name: string;
  activeRoomKey: string | null;
  authToken: string | null;
  onMessage: (message: WebSocketMessage) => void;
  onConnectionChange: (isConnected: boolean) => void;
  onError: (error: string) => void;
}

export const useRoomConnection = ({
  screen,
  name,
  activeRoomKey,
  authToken,
  onMessage,
  onConnectionChange,
  onError,
}: UseRoomConnectionOptions) => {
  useEffect(() => {
    if (screen === "room" && name && activeRoomKey) {
      if (!authToken) {
        onError("Missing session token. Please rejoin the room.");
        return;
      }

      try {
        connectToRoom(activeRoomKey, name, authToken, onMessage, onConnectionChange);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Connection error";
        onError(errorMessage);
        onConnectionChange(false);
        return;
      }

      const errorHandler = (data: WebSocketMessage) => {
        onError(data.error || "Connection error");
        onConnectionChange(false);
      };

      const eventTypes: WebSocketMessageType[] = ["disconnected", "error"];

      for (const type of eventTypes) {
        addEventListener(type, errorHandler);
      }

      return () => {
        disconnectFromRoom();
        onConnectionChange(false);
        for (const type of eventTypes) {
          removeEventListener(type, errorHandler);
        }
      };
    }
  }, [screen, activeRoomKey, name, authToken, onMessage, onConnectionChange, onError]);
};
