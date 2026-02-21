import { useEffect } from "react";

import {
  connectToRoom,
  disconnectFromRoom,
  addEventListener,
  removeEventListener,
} from "@/lib/api-service";
import type { WebSocketMessage, WebSocketMessageType } from "@/types";

interface UseRoomConnectionOptions {
  screen: string;
  name: string;
  activeRoomKey: string | null;
  onMessage: (message: WebSocketMessage) => void;
  onConnectionChange: (isConnected: boolean) => void;
  onError: (
    error: string,
    meta?: { reason?: "auth" | "disconnect"; code?: number },
  ) => void;
  reconnectSignal?: number;
  skip?: boolean;
}

export const useRoomConnection = ({
  screen,
  name,
  activeRoomKey,
  onMessage,
  onConnectionChange,
  onError,
  reconnectSignal = 0,
  skip = false,
}: UseRoomConnectionOptions) => {
  useEffect(() => {
    if (skip) {
      return;
    }
    if (screen === "room" && name && activeRoomKey) {
      try {
        connectToRoom(activeRoomKey, name, onMessage, onConnectionChange);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Connection error";
        onError(errorMessage);
        onConnectionChange(false);
        return;
      }

      const errorHandler = (data: WebSocketMessage) => {
        const message = data.error || data.message || "Connection error";
        const isAuthError =
          data.reason === "auth" ||
          data.closeCode === 4003 ||
          message.includes("Invalid session");
        const isDisconnect =
          data.reason === "disconnect" || data.type === "disconnected";
        onError(message, {
          reason: isAuthError
            ? "auth"
            : isDisconnect
              ? "disconnect"
              : undefined,
          code: data.closeCode,
        });
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
  }, [
    skip,
    screen,
    activeRoomKey,
    name,
    onMessage,
    onConnectionChange,
    onError,
    reconnectSignal,
  ]);
};
