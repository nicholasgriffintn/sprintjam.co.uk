import { useEffect, useRef } from "react";

import { joinRoom } from "../lib/api-service";
import { upsertRoom } from "../lib/data/room-store";
import { safeLocalStorage } from "../utils/storage";
import type { AvatarId, ServerDefaults } from "../types";

interface UseAutoReconnectOptions {
  name: string;
  screen: string;
  isLoadingDefaults: boolean;
  selectedAvatar: AvatarId | null;
  onReconnectSuccess: (roomKey: string, isModerator: boolean) => void;
  onReconnectError: (error: string) => void;
  onLoadingChange: (isLoading: boolean) => void;
  applyServerDefaults: (defaults?: ServerDefaults) => Promise<void>;
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
    if (screen !== "welcome") {
      return;
    }
    if (!name) {
      return;
    }
    if (isLoadingDefaults) {
      return;
    }

    didAttemptRestore.current = true;

    const savedRoomKey = safeLocalStorage.get("sprintjam_roomKey");
    const savedAuthToken = safeLocalStorage.get("sprintjam_authToken");
    if (savedRoomKey) {
      onLoadingChange(true);
      const avatarToUse = selectedAvatar || "user";
      joinRoom(name, savedRoomKey, undefined, avatarToUse, savedAuthToken || undefined)
        .then(async ({ room: joinedRoom, defaults, authToken }) => {
          await applyServerDefaults(defaults);
          await upsertRoom(joinedRoom);
          safeLocalStorage.set("sprintjam_roomKey", joinedRoom.key);
          if (authToken) {
            safeLocalStorage.set("sprintjam_authToken", authToken);
          } else {
            safeLocalStorage.remove("sprintjam_authToken");
          }
          onAuthTokenRefresh?.(authToken ?? null);
          onReconnectSuccess(joinedRoom.key, joinedRoom.moderator === name);
        })
        .catch((err) => {
          const errorMessage =
            err instanceof Error ? err.message : "Failed to reconnect to room";
          onReconnectError(errorMessage);
          safeLocalStorage.remove("sprintjam_roomKey");
          safeLocalStorage.remove("sprintjam_authToken");
          onAuthTokenRefresh?.(null);
        })
        .finally(() => onLoadingChange(false));
    }
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
