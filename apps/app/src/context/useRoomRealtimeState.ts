import { useCallback, useState, type MutableRefObject } from "react";

import { isConnected } from "@/lib/api-service";
import { applyRoomMessageToCollections } from "@/lib/data/room-store";
import { getErrorDetails } from "@/lib/errors";
import type {
  ErrorConnectionIssue,
  ErrorKind,
  WebSocketMessage,
} from "@/types";

interface UseRoomRealtimeStateOptions {
  activeRoomKeyRef: MutableRefObject<string | null>;
  setActiveRoomKey: (roomKey: string | null) => void;
}

export function useRoomRealtimeState({
  activeRoomKeyRef,
  setActiveRoomKey,
}: UseRoomRealtimeStateOptions) {
  const [isSocketConnected, setIsSocketConnected] = useState<boolean>(() =>
    isConnected(),
  );
  const [isSocketStatusKnown, setIsSocketStatusKnown] = useState<boolean>(() =>
    isConnected(),
  );
  const [roomError, setRoomError] = useState<string>("");
  const [roomErrorKind, setRoomErrorKind] = useState<ErrorKind | null>(null);
  const [connectionIssue, setConnectionIssue] =
    useState<ErrorConnectionIssue | null>(null);
  const [reconnectSignal, setReconnectSignal] = useState<number>(0);

  const assignRoomError = useCallback(
    (
      error: unknown,
      fallbackMessage: string,
      defaultKind: ErrorKind | null = null,
    ) => {
      const { message, kind } = getErrorDetails(
        error,
        fallbackMessage,
        defaultKind,
      );
      setRoomError(message);
      setRoomErrorKind(kind ?? defaultKind);
    },
    [],
  );

  const reportRoomError = useCallback(
    (message: string, kind: ErrorKind | null = null) => {
      setRoomError(message);
      setRoomErrorKind(kind);
    },
    [],
  );

  const clearRoomError = useCallback(() => {
    setRoomError("");
    setRoomErrorKind(null);
    setConnectionIssue(null);
  }, []);

  const handleRoomMessage = useCallback(
    (message: WebSocketMessage) => {
      if (message.type === "error") {
        setRoomError(message.error || "Connection error");
        if (message.reason === "auth") {
          setRoomErrorKind("auth");
        } else if (message.reason === "permission") {
          setRoomErrorKind("permission");
        } else {
          setRoomErrorKind(null);
        }
        return;
      }

      void applyRoomMessageToCollections(message, activeRoomKeyRef.current)
        .then((updatedRoom) => {
          if (!activeRoomKeyRef.current && updatedRoom?.key) {
            setActiveRoomKey(updatedRoom.key);
          }
          setRoomError("");
          setRoomErrorKind(null);
        })
        .catch((err) => {
          console.error("Failed to process room message", err);
          assignRoomError(err, "Connection update failed");
        });
    },
    [activeRoomKeyRef, assignRoomError, setActiveRoomKey],
  );

  const handleConnectionChange = useCallback((connected: boolean) => {
    setIsSocketConnected(connected);
    setIsSocketStatusKnown(true);
    if (connected) {
      setConnectionIssue(null);
      setRoomErrorKind(null);
    }
  }, []);

  const handleConnectionError = useCallback(
    (
      message: string,
      meta?: { reason?: "auth" | "disconnect"; code?: number },
    ) => {
      setRoomError(message);
      if (meta?.reason === "auth") {
        setConnectionIssue({ type: "auth", message });
        setRoomErrorKind("auth");
      } else if (meta?.reason === "disconnect") {
        setConnectionIssue({ type: "disconnected", message });
      }
    },
    [],
  );

  const retryConnection = useCallback(() => {
    setConnectionIssue((current) =>
      current ? { ...current, reconnecting: true } : null,
    );
    setReconnectSignal((value) => value + 1);
  }, []);

  const resetRealtimeState = useCallback(() => {
    setRoomError("");
    setRoomErrorKind(null);
    setConnectionIssue(null);
    setIsSocketConnected(false);
    setIsSocketStatusKnown(false);
  }, []);

  return {
    isSocketConnected,
    isSocketStatusKnown,
    roomError,
    roomErrorKind,
    connectionIssue,
    reconnectSignal,
    setConnectionIssue,
    setRoomError,
    setRoomErrorKind,
    assignRoomError,
    reportRoomError,
    clearRoomError,
    handleRoomMessage,
    handleConnectionChange,
    handleConnectionError,
    retryConnection,
    resetRealtimeState,
  };
}
