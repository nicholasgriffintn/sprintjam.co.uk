import { anonymizeRoomData } from "@sprintjam/utils";

import type { PlanningRoom } from ".";
import {
  appendRoundHistory,
  logVotesForTicket,
  postRoundToStats,
} from "./room-helpers";

export async function handleCompleteSession(
  room: PlanningRoom,
  userName: string,
): Promise<void> {
  const roomData = await room.getRoomData();
  if (!roomData) {
    return;
  }

  if (
    roomData.moderator !== userName &&
    !roomData.settings.allowOthersToManageQueue
  ) {
    return;
  }

  if (roomData.status === "completed") {
    return;
  }

  const currentTicket = roomData.currentTicket;
  const roundHistoryEntry = appendRoundHistory(room, roomData, {
    type: "complete_session",
    ticket: currentTicket,
  });

  if (roundHistoryEntry) {
    postRoundToStats(
      room,
      roomData,
      currentTicket?.ticketId,
      currentTicket ? "next_ticket" : "reset",
      {
        roundId: roundHistoryEntry.id,
        roundEndedAt: roundHistoryEntry.endedAt,
        votes: roundHistoryEntry.votes,
      },
    ).catch((err) => console.error("Failed to post round stats:", err));
  }

  if (currentTicket && roundHistoryEntry) {
    logVotesForTicket(room, currentTicket, roomData);

    if (currentTicket.status === "in_progress") {
      room.repository.updateTicket(currentTicket.id, {
        status: "completed",
        completedAt: roundHistoryEntry.endedAt,
      });
      room.repository.setCurrentTicket(null);
    }
  }

  room.repository.setRoomStatus("completed");
  const updatedRoomData = await room.getRoomData();

  if (updatedRoomData) {
    room.broadcast({
      type: "initialize",
      roomData: anonymizeRoomData(updatedRoomData),
    });
  }

  room.broadcast({ type: "roomStatusUpdated", status: "completed" });
}
