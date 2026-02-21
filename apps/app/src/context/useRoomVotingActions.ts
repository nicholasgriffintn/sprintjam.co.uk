import { useCallback } from "react";
import type { StructuredVote, VoteValue } from "@sprintjam/types";

import {
  resetVotes,
  submitVote,
  toggleShowVotes,
  toggleSpectatorMode,
  updateSettings,
} from "@/lib/api-service";
import type { ErrorKind, RoomData, RoomSettings } from "@/types";

interface UseRoomVotingActionsOptions {
  roomData: RoomData | null;
  userName: string;
  userVote: VoteValue | StructuredVote | null;
  isModeratorView: boolean;
  setUserVote: (value: VoteValue | StructuredVote | null) => void;
  setRoomError: (value: string) => void;
  setRoomErrorKind: (kind: ErrorKind | null) => void;
  assignRoomError: (
    error: unknown,
    fallbackMessage: string,
    defaultKind?: ErrorKind | null,
  ) => void;
}

export function useRoomVotingActions({
  roomData,
  userName,
  userVote,
  isModeratorView,
  setUserVote,
  setRoomError,
  setRoomErrorKind,
  assignRoomError,
}: UseRoomVotingActionsOptions) {
  const handleVote = useCallback(
    (value: VoteValue | StructuredVote) => {
      if (roomData?.status === "completed") {
        return;
      }

      const previousVote = userVote;
      setUserVote(value);

      try {
        submitVote(value, true);
      } catch (err: unknown) {
        setUserVote(previousVote);
        assignRoomError(err, "Failed to submit vote");
      }
    },
    [assignRoomError, roomData, setUserVote, userVote],
  );

  const handleResetVotes = useCallback(() => {
    if (!roomData || roomData.status === "completed") {
      return;
    }

    if (
      roomData.moderator !== userName &&
      !roomData.settings.allowOthersToDeleteEstimates
    ) {
      setRoomError("You don't have permission to reset votes.");
      setRoomErrorKind("permission");
      return;
    }

    try {
      resetVotes();
      setUserVote(null);
    } catch (err: unknown) {
      assignRoomError(err, "Failed to reset votes");
    }
  }, [
    assignRoomError,
    roomData,
    setRoomError,
    setRoomErrorKind,
    setUserVote,
    userName,
  ]);

  const handleToggleSpectatorMode = useCallback(
    (isSpectator: boolean) => {
      try {
        toggleSpectatorMode(isSpectator);
      } catch (err) {
        console.error("Failed to toggle spectator mode:", err);
        setRoomError("Failed to toggle spectator mode.");
        setRoomErrorKind("network");
      }
    },
    [setRoomError, setRoomErrorKind],
  );

  const handleToggleShowVotes = useCallback(() => {
    if (!roomData || roomData.status === "completed") {
      return;
    }

    if (
      roomData.moderator !== userName &&
      !roomData.settings.allowOthersToShowEstimates
    ) {
      setRoomError("You don't have permission to show votes.");
      setRoomErrorKind("permission");
      return;
    }

    try {
      toggleShowVotes();
    } catch (err: unknown) {
      assignRoomError(err, "Failed to toggle vote visibility");
    }
  }, [assignRoomError, roomData, setRoomError, setRoomErrorKind, userName]);

  const handleUpdateSettings = useCallback(
    (settings: RoomSettings) => {
      if (!isModeratorView) {
        setRoomError("Only moderators can update settings.");
        setRoomErrorKind("permission");
        return;
      }

      if (roomData?.status === "completed") {
        return;
      }

      try {
        updateSettings(settings);
      } catch (err: unknown) {
        assignRoomError(err, "Failed to update settings");
      }
    },
    [
      assignRoomError,
      isModeratorView,
      roomData,
      setRoomError,
      setRoomErrorKind,
    ],
  );

  return {
    handleVote,
    handleResetVotes,
    handleToggleSpectatorMode,
    handleToggleShowVotes,
    handleUpdateSettings,
  };
}
