import { useEffect, useRef } from "react";

import { joinRoom } from "@/lib/api-service";
import { upsertRoom } from "@/lib/data/room-store";
import { safeLocalStorage } from "@/utils/storage";
import type { AvatarId, ServerDefaults } from "@/types";
import { AUTH_TOKEN_STORAGE_KEY } from "@/constants";
import { HttpError } from "@/lib/errors";

interface UseAutoReconnectOptions {
  name: string;
  screen: string;
  roomKey: string;
  isLoadingDefaults: boolean;
  selectedAvatar: AvatarId | null;
  onReconnectSuccess: (roomKey: string, isModerator: boolean) => void;
  onReconnectError: (error: { message: string; isAuthError: boolean }) => void;
  onLoadingChange: (isLoading: boolean) => void;
  applyServerDefaults: (defaults?: ServerDefaults) => void;
  onAuthTokenRefresh?: (token: string | null) => void;
  onReconnectComplete?: () => void;
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
  onAuthTokenRefresh,
  onReconnectComplete,
}: UseAutoReconnectOptions) => {
  const didAttemptRestore = useRef(false);

  useEffect(() => {
    if (didAttemptRestore.current) {
      return;
    }
    if (screen !== "room" || !roomKey) {
      return;
    }
    if (!name) {
      return;
    }
    if (isLoadingDefaults) {
      return;
    }

    didAttemptRestore.current = true;

    const savedAuthToken = safeLocalStorage.get(AUTH_TOKEN_STORAGE_KEY);

    let cancelled = false;

    onLoadingChange(true);
    const avatarToUse = selectedAvatar || "user";
    joinRoom(name, roomKey, undefined, avatarToUse, savedAuthToken || undefined)
      .then(async ({ room: joinedRoom, defaults, authToken }) => {
        if (cancelled) {
          return;
        }
        applyServerDefaults(defaults);
        await upsertRoom(joinedRoom);
        if (authToken) {
          safeLocalStorage.set(AUTH_TOKEN_STORAGE_KEY, authToken);
        } else {
          safeLocalStorage.remove(AUTH_TOKEN_STORAGE_KEY);
        }
        onAuthTokenRefresh?.(authToken ?? null);
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
        onReconnectError({ message: errorMessage, isAuthError });
        safeLocalStorage.remove(AUTH_TOKEN_STORAGE_KEY);
        onAuthTokenRefresh?.(null);
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
    onAuthTokenRefresh,
    onReconnectComplete,
  ]);
};
