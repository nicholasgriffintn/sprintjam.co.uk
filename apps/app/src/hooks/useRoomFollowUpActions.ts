import { useRoomActions } from "@/context/RoomContext";
import type { RoomData } from "@/types";
import type { VoteSpreadSummary } from "@/utils/room-guidance";

export const useRoomFollowUpActions = (
  roomData: RoomData,
  spreadSummary: VoteSpreadSummary,
  onHintsDismissed: () => void,
) => {
  const { handleAddTicket, handleResetVotes } = useRoomActions();

  const getSuggestedNote = () => {
    if (spreadSummary.unknownVoteCount > 0) {
      return "Unknowns flagged; clarify acceptance criteria.";
    }
    if (spreadSummary.isWideSpread) {
      return "Wide spread; align on scope or split the work.";
    }
    return "";
  };

  const addFollowUpTicket = async (title: string, outcome: string) => {
    const pendingQueue = roomData.ticketQueue || [];
    const maxOrdinal =
      pendingQueue.reduce((max, ticket) => Math.max(max, ticket.ordinal), 0) +
      1;

    await handleAddTicket({
      ticketId: `FOLLOW-${maxOrdinal}`,
      title,
      outcome,
      status: "pending",
      ordinal: maxOrdinal,
      externalService: "none",
    });
  };

  const captureUnknownsFollowUp = async () => {
    const currentTitle = roomData.currentTicket?.title ?? "current item";
    await addFollowUpTicket(
      `Clarify unknowns for ${currentTitle}`,
      "Unknowns flagged during estimation; clarify acceptance criteria before the next vote.",
    );
    onHintsDismissed();
  };

  const splitCurrentTicket = async () => {
    const currentTitle = roomData.currentTicket?.title ?? "current item";
    await addFollowUpTicket(
      `Split ${currentTitle}`,
      "Wide spread during estimation; split scope or separate risky assumptions.",
    );
    onHintsDismissed();
  };

  const startRevote = () => {
    handleResetVotes();
    onHintsDismissed();
  };

  return {
    getSuggestedNote,
    captureUnknownsFollowUp,
    splitCurrentTicket,
    startRevote,
  };
};
