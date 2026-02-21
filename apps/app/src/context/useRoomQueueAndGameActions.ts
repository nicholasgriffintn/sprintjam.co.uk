import { useCallback } from "react";
import type { RoomGameType } from "@sprintjam/types";

import {
  selectTicket,
  nextTicket,
  addTicket,
  updateTicket,
  deleteTicket,
  completeSession,
  startGame,
  submitGameMove,
  endGame,
} from "@/lib/api-service";
import { completeSessionByRoomKey } from "@/lib/workspace-service";
import type { ErrorKind, RoomData, TicketQueueItem } from "@/types";

interface UseRoomQueueAndGameActionsOptions {
  roomData: RoomData | null;
  userName: string;
  setRoomError: (value: string) => void;
  setRoomErrorKind: (kind: ErrorKind | null) => void;
  assignRoomError: (
    error: unknown,
    fallbackMessage: string,
    defaultKind?: ErrorKind | null,
  ) => void;
}

export function useRoomQueueAndGameActions({
  roomData,
  userName,
  setRoomError,
  setRoomErrorKind,
  assignRoomError,
}: UseRoomQueueAndGameActionsOptions) {
  const handleSelectTicket = useCallback(
    (ticketId: number) => {
      if (roomData?.status === "completed") {
        return;
      }
      try {
        selectTicket(ticketId);
      } catch (err: unknown) {
        assignRoomError(err, "Failed to select ticket");
      }
    },
    [assignRoomError, roomData],
  );

  const handleNextTicket = useCallback(() => {
    if (roomData?.status === "completed") {
      return;
    }
    try {
      nextTicket();
    } catch (err: unknown) {
      assignRoomError(err, "Failed to move to next ticket");
    }
  }, [assignRoomError, roomData]);

  const handleAddTicket = useCallback(
    async (ticket: Partial<TicketQueueItem>) => {
      if (roomData?.status === "completed") {
        return;
      }
      try {
        await addTicket(ticket);
      } catch (err: unknown) {
        assignRoomError(err, "Failed to add ticket");
      }
    },
    [assignRoomError, roomData],
  );

  const handleUpdateTicket = useCallback(
    async (ticketId: number, updates: Partial<TicketQueueItem>) => {
      if (roomData?.status === "completed") {
        return;
      }
      try {
        await updateTicket(ticketId, updates);
      } catch (err: unknown) {
        assignRoomError(err, "Failed to update ticket");
      }
    },
    [assignRoomError, roomData],
  );

  const handleDeleteTicket = useCallback(
    async (ticketId: number) => {
      if (roomData?.status === "completed") {
        return;
      }
      try {
        await deleteTicket(ticketId);
      } catch (err: unknown) {
        assignRoomError(err, "Failed to delete ticket");
      }
    },
    [assignRoomError, roomData],
  );

  const handleCompleteSession = useCallback(() => {
    if (!roomData) {
      return;
    }

    if (roomData.status === "completed") {
      return;
    }

    if (
      roomData.moderator !== userName &&
      !roomData.settings.allowOthersToManageQueue
    ) {
      setRoomError("You don't have permission to complete the session.");
      setRoomErrorKind("permission");
      return;
    }

    try {
      completeSession();
      void completeSessionByRoomKey(roomData.key).catch((err: unknown) => {
        assignRoomError(err, "Failed to update workspace session");
      });
    } catch (err: unknown) {
      assignRoomError(err, "Failed to complete session");
    }
  }, [assignRoomError, roomData, setRoomError, setRoomErrorKind, userName]);

  const handleStartGame = useCallback(
    (gameType: RoomGameType) => {
      if (roomData?.status === "completed") {
        return;
      }

      try {
        startGame(gameType);
      } catch (err: unknown) {
        assignRoomError(err, "Failed to start game");
      }
    },
    [assignRoomError, roomData?.status],
  );

  const handleSubmitGameMove = useCallback(
    (value: string) => {
      if (roomData?.status === "completed") {
        return;
      }

      try {
        submitGameMove(value);
      } catch (err: unknown) {
        assignRoomError(err, "Failed to submit game move");
      }
    },
    [assignRoomError, roomData?.status],
  );

  const handleEndGame = useCallback(() => {
    try {
      endGame();
    } catch (err: unknown) {
      assignRoomError(err, "Failed to end game");
    }
  }, [assignRoomError]);

  return {
    handleSelectTicket,
    handleNextTicket,
    handleAddTicket,
    handleUpdateTicket,
    handleDeleteTicket,
    handleCompleteSession,
    handleStartGame,
    handleSubmitGameMove,
    handleEndGame,
  };
}
