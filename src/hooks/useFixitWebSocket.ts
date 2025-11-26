import { useEffect, useRef } from "react";

import { FIXITS_WS_BASE_URL } from "@/constants";

interface UseFixitWebSocketOptions {
  enabled?: boolean;
}

export function useFixitWebSocket(
  fixitId: string | null | undefined,
  onMessage: (payload: unknown) => void,
  options?: UseFixitWebSocketOptions,
) {
  const messageHandlerRef = useRef(onMessage);

  useEffect(() => {
    messageHandlerRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    if (!fixitId || options?.enabled === false) {
      return;
    }

    const url = `${FIXITS_WS_BASE_URL}?fixitId=${encodeURIComponent(fixitId)}`;
    const socket = new WebSocket(url);

    socket.onopen = () => {
      console.debug("Connected to Fixits WebSocket");
    };

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        messageHandlerRef.current(payload);
      } catch (error) {
        console.error("Failed to parse Fixits WebSocket payload", error);
      }
    };

    socket.onerror = (event) => {
      console.error("Fixits WebSocket error", event);
    };

    socket.onclose = (event) => {
      console.info("Fixits WebSocket closed", event.code, event.reason);
    };

    return () => {
      socket.close(1000, "Component unmounted");
    };
  }, [fixitId, options?.enabled]);
}
