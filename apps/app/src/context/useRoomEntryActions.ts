import { useCallback, useEffect, useRef } from "react";

import { createRoom, joinRoom } from "@/lib/api-service";
import { upsertRoom } from "@/lib/data/room-store";
import { getErrorDetails, isAbortError } from "@/lib/errors";
import { formatRoomKey } from "@/utils/validators";
import type {
  AvatarId,
  ErrorKind,
  RoomSettings,
  ServerDefaults,
} from "@/types";

interface UseRoomEntryActionsOptions {
  name: string;
  roomKey: string;
  passcode: string;
  selectedAvatar: AvatarId | null;
  pendingCreateSettings: Partial<RoomSettings> | null;
  applyServerDefaults: (defaults?: ServerDefaults) => void;
  clearError: () => void;
  setError: (message: string, kind?: ErrorKind | null) => void;
  goToRoom: (roomKey: string) => void;
  setActiveRoomKey: (roomKey: string) => void;
  setIsModeratorView: (isModerator: boolean) => void;
  setPendingCreateSettings: (settings: Partial<RoomSettings> | null) => void;
  setIsLoading: (isLoading: boolean) => void;
}

export function useRoomEntryActions({
  name,
  roomKey,
  passcode,
  selectedAvatar,
  pendingCreateSettings,
  applyServerDefaults,
  clearError,
  setError,
  goToRoom,
  setActiveRoomKey,
  setIsModeratorView,
  setPendingCreateSettings,
  setIsLoading,
}: UseRoomEntryActionsOptions) {
  const latestRoomRequestRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      latestRoomRequestRef.current?.abort();
    };
  }, []);

  const startRoomRequest = useCallback(() => {
    if (latestRoomRequestRef.current) {
      latestRoomRequestRef.current.abort();
    }
    const controller = new AbortController();
    latestRoomRequestRef.current = controller;
    return controller;
  }, []);

  const abortLatestRoomRequest = useCallback(() => {
    latestRoomRequestRef.current?.abort();
  }, []);

  const handleCreateRoom = useCallback(
    async (settings?: Partial<RoomSettings>) => {
      if (!name || !selectedAvatar) return;

      const resolvedSettings = settings ?? pendingCreateSettings ?? undefined;

      setIsLoading(true);
      clearError();
      const controller = startRoomRequest();

      try {
        const { room: newRoom, defaults } = await createRoom(
          name,
          passcode || undefined,
          resolvedSettings,
          selectedAvatar,
          { signal: controller.signal },
        );
        applyServerDefaults(defaults);
        await upsertRoom(newRoom);
        setActiveRoomKey(newRoom.key);
        setIsModeratorView(true);
        goToRoom(newRoom.key);
        setPendingCreateSettings(null);
      } catch (err: unknown) {
        if (isAbortError(err)) {
          return;
        }
        const { message, kind } = getErrorDetails(err, "Failed to create room");
        setError(message, kind ?? null);
      } finally {
        setIsLoading(false);
      }
    },
    [
      name,
      selectedAvatar,
      pendingCreateSettings,
      setIsLoading,
      clearError,
      startRoomRequest,
      passcode,
      applyServerDefaults,
      setActiveRoomKey,
      setIsModeratorView,
      goToRoom,
      setPendingCreateSettings,
      setError,
    ],
  );

  const handleJoinRoom = useCallback(async () => {
    const trimmedName = name.trim();
    const normalizedRoomKey = formatRoomKey(roomKey);
    if (!trimmedName || !normalizedRoomKey || !selectedAvatar) return;

    setIsLoading(true);
    clearError();
    const controller = startRoomRequest();

    try {
      const { room: joinedRoom, defaults } = await joinRoom(
        trimmedName,
        normalizedRoomKey,
        passcode?.trim() || undefined,
        selectedAvatar,
        { signal: controller.signal },
      );
      applyServerDefaults(defaults);
      await upsertRoom(joinedRoom);
      setActiveRoomKey(joinedRoom.key);
      setIsModeratorView(joinedRoom.moderator === name);
      goToRoom(joinedRoom.key);
    } catch (err: unknown) {
      if (isAbortError(err)) {
        return;
      }
      const { message, kind } = getErrorDetails(err, "Failed to join room");
      const normalizedKind =
        /passcode/i.test(message) || kind === "passcode"
          ? "passcode"
          : (kind ?? null);
      setError(message, normalizedKind);
    } finally {
      setIsLoading(false);
    }
  }, [
    name,
    roomKey,
    selectedAvatar,
    setIsLoading,
    clearError,
    startRoomRequest,
    passcode,
    applyServerDefaults,
    setActiveRoomKey,
    setIsModeratorView,
    goToRoom,
    setError,
  ]);

  return {
    handleCreateRoom,
    handleJoinRoom,
    abortLatestRoomRequest,
  };
}
