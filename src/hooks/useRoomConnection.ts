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
  onMessage: (message: WebSocketMessage) => void;
  onConnectionChange: (isConnected: boolean) => void;
  onError: (error: string) => void;
}

export const useRoomConnection = ({
  screen,
  name,
  activeRoomKey,
  onMessage,
  onConnectionChange,
  onError,
}: UseRoomConnectionOptions) => {
  useEffect(() => {
    if (screen === "room" && name && activeRoomKey) {
      connectToRoom(activeRoomKey, name, onMessage, onConnectionChange);

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
  }, [screen, activeRoomKey, name, onMessage, onConnectionChange, onError]);
};
