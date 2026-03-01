import { useEffect, useRef, useState } from "react";

import ErrorBanner from "@/components/ui/ErrorBanner";
import { toast } from "@/components/ui";
import type {
  ConnectionStatusState,
  ErrorConnectionIssue,
  ErrorKind,
} from "@/types";

interface RoomErrorBannersProps {
  connectionStatus: ConnectionStatusState;
  connectionIssue: ErrorConnectionIssue | null;
  roomError: string | null;
  roomErrorKind?: ErrorKind | null;
  onRetryConnection: () => void;
  onLeaveRoom: () => void;
  onClearRoomError: () => void;
  showDelay?: number;
}

const ROOM_STATUS_TOAST_ID = "room-status";

export function RoomErrorBanners({
  connectionStatus,
  connectionIssue,
  roomError,
  roomErrorKind,
  onRetryConnection,
  onLeaveRoom,
  onClearRoomError,
  showDelay = 1500,
}: RoomErrorBannersProps) {
  const [canShowConnectionBanners, setCanShowConnectionBanners] =
    useState(false);
  const hasShownStatusToast = useRef(false);

  const showReconnectBanner =
    connectionIssue?.type === "disconnected" ||
    (connectionStatus === "disconnected" && !connectionIssue);

  const showAuthBanner = connectionIssue?.type === "auth";

  const shouldShowConnectionBanner =
    !showAuthBanner && (connectionIssue || showReconnectBanner);

  useEffect(() => {
    if (!showAuthBanner && !shouldShowConnectionBanner) {
      setCanShowConnectionBanners(false);
      return;
    }

    if (showAuthBanner) {
      setCanShowConnectionBanners(true);
      return;
    }

    const timer = setTimeout(() => {
      setCanShowConnectionBanners(true);
    }, showDelay);

    return () => clearTimeout(timer);
  }, [showAuthBanner, shouldShowConnectionBanner, showDelay]);

  useEffect(() => {
    const closeStatusToast = () => {
      if (!hasShownStatusToast.current) {
        return;
      }

      toast.close(ROOM_STATUS_TOAST_ID);
      hasShownStatusToast.current = false;
    };

    if (showAuthBanner && canShowConnectionBanners) {
      const authMessage =
        connectionIssue?.message || "Session expired. Please rejoin the room.";
      const authActions = [
        {
          label: "Try again",
          onClick: onRetryConnection,
        },
        {
          label: "Leave room",
          onClick: onLeaveRoom,
          variant: "outline" as const,
        },
      ];

      const options = {
        data: {
          actions: authActions,
          hideClose: true,
        },
        description: "Votes will not send until you reconnect with a new link.",
        id: ROOM_STATUS_TOAST_ID,
        priority: "high" as const,
        timeout: 0,
        title: authMessage,
        type: "error",
      };

      if (hasShownStatusToast.current) {
        toast.update(ROOM_STATUS_TOAST_ID, options);
      } else {
        toast.add(options);
        hasShownStatusToast.current = true;
      }

      return;
    }

    if (shouldShowConnectionBanner && canShowConnectionBanners) {
      const connectionMessage =
        connectionIssue?.message || "Connection lost. Trying to reconnect...";

      const options = {
        data: {
          actions: [
            {
              label: "Retry",
              onClick: onRetryConnection,
            },
          ],
          hideClose: true,
        },
        description: "Votes paused until connection is restored.",
        id: ROOM_STATUS_TOAST_ID,
        timeout: 0,
        title: connectionMessage,
        type: "warning",
      };

      if (hasShownStatusToast.current) {
        toast.update(ROOM_STATUS_TOAST_ID, options);
      } else {
        toast.add(options);
        hasShownStatusToast.current = true;
      }

      return;
    }

    closeStatusToast();
  }, [
    canShowConnectionBanners,
    connectionIssue,
    onLeaveRoom,
    onRetryConnection,
    shouldShowConnectionBanner,
    showAuthBanner,
  ]);

  useEffect(() => {
    return () => {
      toast.close(ROOM_STATUS_TOAST_ID);
      hasShownStatusToast.current = false;
    };
  }, []);

  return (
    <>
      {roomError && (
        <ErrorBanner
          message={roomError}
          onClose={onClearRoomError}
          variant={
            roomErrorKind === "permission" || roomErrorKind === "passcode"
              ? "warning"
              : "error"
          }
        />
      )}
    </>
  );
}
