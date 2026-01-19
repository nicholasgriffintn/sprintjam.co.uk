import { useEffect, useRef } from "react";

import { joinRoom } from "@/lib/api-service";
import { upsertRoom } from "@/lib/data/room-store";
import type { AvatarId, ServerDefaults } from "@/types";
import { HttpError } from "@/lib/errors";

interface UseAutoReconnectOptions {
  name: string;
  screen: string;
  roomKey: string;
  isLoadingDefaults: boolean;
  selectedAvatar: AvatarId | null;
  onReconnectSuccess: (roomKey: string, isModerator: boolean) => void;
  onReconnectError: (error: {
    message: string;
    isAuthError: boolean;
    isRoomNotFound: boolean;
    isNameConflict?: boolean;
  }) => void;
  onLoadingChange: (isLoading: boolean) => void;
  applyServerDefaults: (defaults?: ServerDefaults) => void;
  onReconnectComplete?: () => void;
  onNeedsJoin?: () => void;
}

export const useAutoReconnect = ({
  name,
  screen,
  roomKey,
  isLoadingDefaults,
  selectedAvatar,
  onReconnectSuccess,
  onReconnectError,
  onLoadingChange,
  applyServerDefaults,
  onReconnectComplete,
  onNeedsJoin,
}: UseAutoReconnectOptions) => {
  const didAttemptRestore = useRef(false);

  useEffect(() => {
    if (didAttemptRestore.current) {
      return;
    }
    if (screen !== "room" || !roomKey) {
      return;
    }
    if (isLoadingDefaults) {
      return;
    }

    if (!name) {
      didAttemptRestore.current = true;
      onNeedsJoin?.();
      onReconnectComplete?.();
      return;
    }

    didAttemptRestore.current = true;

    let cancelled = false;

    onLoadingChange(true);
    const avatarToUse = selectedAvatar || "user";
    joinRoom(name, roomKey, undefined, avatarToUse)
      .then(async ({ room: joinedRoom, defaults }) => {
        if (cancelled) {
          return;
        }
        applyServerDefaults(defaults);
        await upsertRoom(joinedRoom);
        onReconnectSuccess(joinedRoom.key, joinedRoom.moderator === name);
      })
      .catch((err) => {
        if (cancelled) {
          return;
        }

        const errorMessage =
          err instanceof Error ? err.message : "Failed to reconnect to room";
        const isAuthError =
          (err instanceof HttpError && err.status === 401) ||
          /expired/i.test(errorMessage);
        const isRoomNotFound = err instanceof HttpError && err.status === 404;
        const isNameConflict = err instanceof HttpError && err.status === 409;

        onReconnectError({
          message: errorMessage,
          isAuthError,
          isRoomNotFound,
          isNameConflict,
        });
      })
      .finally(() => {
        if (!cancelled) {
          onLoadingChange(false);
          onReconnectComplete?.();
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    name,
    screen,
    roomKey,
    isLoadingDefaults,
    selectedAvatar,
    onReconnectSuccess,
    onReconnectError,
    onLoadingChange,
    applyServerDefaults,
    onReconnectComplete,
    onNeedsJoin,
  ]);
};
