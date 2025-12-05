import { useEffect, useRef } from "react";

import { joinRoom } from "@/lib/api-service";
import { upsertRoom } from "@/lib/data/room-store";
import { safeLocalStorage } from "@/utils/storage";
import type { AvatarId, ServerDefaults } from "@/types";
import { AUTH_TOKEN_STORAGE_KEY, ROOM_KEY_STORAGE_KEY } from '@/constants';

interface UseAutoReconnectOptions {
  name: string;
  screen: string;
  isLoadingDefaults: boolean;
  selectedAvatar: AvatarId | null;
  onReconnectSuccess: (roomKey: string, isModerator: boolean) => void;
  onReconnectError: (error: string) => void;
  onLoadingChange: (isLoading: boolean) => void;
  applyServerDefaults: (defaults?: ServerDefaults) => void;
  onAuthTokenRefresh?: (token: string | null) => void;
}

export const useAutoReconnect = ({
  name,
  screen,
  isLoadingDefaults,
  selectedAvatar,
  onReconnectSuccess,
  onReconnectError,
  onLoadingChange,
  applyServerDefaults,
  onAuthTokenRefresh,
}: UseAutoReconnectOptions) => {
  const didAttemptRestore = useRef(false);

  useEffect(() => {
    if (didAttemptRestore.current) {
      return;
    }
    if (screen !== 'welcome') {
      return;
    }
    if (!name) {
      return;
    }
    if (isLoadingDefaults) {
      return;
    }

    didAttemptRestore.current = true;

    const savedRoomKey = safeLocalStorage.get(ROOM_KEY_STORAGE_KEY);
    const savedAuthToken = safeLocalStorage.get(AUTH_TOKEN_STORAGE_KEY);

    let cancelled = false;

    if (savedRoomKey) {
      onLoadingChange(true);
      const avatarToUse = selectedAvatar || 'user';
      joinRoom(
        name,
        savedRoomKey,
        undefined,
        avatarToUse,
        savedAuthToken || undefined
      )
        .then(async ({ room: joinedRoom, defaults, authToken }) => {
          if (cancelled) {
            return;
          }
          applyServerDefaults(defaults);
          await upsertRoom(joinedRoom);
          safeLocalStorage.set(ROOM_KEY_STORAGE_KEY, joinedRoom.key);
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
            err instanceof Error ? err.message : 'Failed to reconnect to room';
          onReconnectError(errorMessage);
          safeLocalStorage.remove(ROOM_KEY_STORAGE_KEY);
          safeLocalStorage.remove(AUTH_TOKEN_STORAGE_KEY);
          onAuthTokenRefresh?.(null);
        })
        .finally(() => {
          if (!cancelled) {
            onLoadingChange(false);
          }
        });
    }
    return () => {
      cancelled = true;
    };
  }, [
    name,
    screen,
    isLoadingDefaults,
    selectedAvatar,
    onReconnectSuccess,
    onReconnectError,
    onLoadingChange,
    applyServerDefaults,
    onAuthTokenRefresh,
  ]);
};
