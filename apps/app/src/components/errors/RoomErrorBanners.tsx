import { useState, useEffect } from "react";

import { ErrorBannerAuth } from "@/components/errors/ErrorBannerAuth";
import { ErrorBannerConnection } from "@/components/errors/ErrorBannerConnection";
import ErrorBanner from "@/components/ui/ErrorBanner";
import type {
  ErrorConnectionIssue,
  ConnectionStatusState,
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

  return (
    <>
      {showAuthBanner && canShowConnectionBanners && (
        <ErrorBannerAuth
          onRetryConnection={onRetryConnection}
          onLeaveRoom={onLeaveRoom}
        />
      )}

      {shouldShowConnectionBanner && canShowConnectionBanners && (
        <ErrorBannerConnection
          connectionIssue={connectionIssue}
          onRetryConnection={onRetryConnection}
        />
      )}

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
