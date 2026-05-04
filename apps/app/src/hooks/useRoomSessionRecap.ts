import { useMemo } from "react";

import type { RoomData } from "@/types";

export const useRoomSessionRecap = (
  roomData: RoomData,
  isQueueEnabled: boolean,
) => {
  const completedTicketList = useMemo(
    () =>
      roomData.ticketQueue?.filter((ticket) => ticket.status === "completed") ??
      [],
    [roomData.ticketQueue],
  );

  const entries = useMemo(() => {
    if (roomData.roundHistory && roomData.roundHistory.length > 0) {
      return roomData.roundHistory.map((entry, index) => ({
        id: entry.id,
        ticketId: entry.ticketId ?? `ROUND-${index + 1}`,
        title: entry.ticketTitle,
        outcome: entry.outcome,
        votes: entry.votes,
      }));
    }

    return completedTicketList.map((ticket) => ({
      id: `ticket-${ticket.id}`,
      ticketId: ticket.ticketId,
      title: ticket.title,
      outcome: ticket.outcome,
      votes: ticket.votes ?? [],
    }));
  }, [completedTicketList, roomData.roundHistory]);

  const votesCount = entries.reduce(
    (total, entry) => total + entry.votes.length,
    0,
  );
  const voters = entries.reduce((voterSet, entry) => {
    entry.votes.forEach((vote) => voterSet.add(vote.userName));
    return voterSet;
  }, new Set<string>());
  const uniqueEstimatedItems = new Set(entries.map((entry) => entry.ticketId))
    .size;
  const estimatedItemCount = isQueueEnabled
    ? uniqueEstimatedItems || entries.length
    : entries.length;

  return {
    entries,
    votesCount,
    votersCount: voters.size,
    estimatedItemCount,
    estimatedItemLabel: isQueueEnabled ? "Items estimated" : "Rounds completed",
    recapTitle: isQueueEnabled ? "Ticket recap" : "Round recap",
    emptyRecapMessage: isQueueEnabled
      ? "No completed tickets or rounds recorded for this session."
      : "No completed rounds recorded for this session.",
  };
};
