import { useEffect, useMemo, useState } from "react";

import type { RoomData } from "@/types";
import type { VoteSpreadSummary } from "@/utils/room-guidance";

interface FacilitationPrompt {
  title: string;
  body: string;
}

interface UseFacilitationPromptParams {
  roomData: RoomData;
  isModeratorView: boolean;
  spreadSummary: VoteSpreadSummary;
}

export const useFacilitationPrompt = ({
  roomData,
  isModeratorView,
  spreadSummary,
}: UseFacilitationPromptParams): FacilitationPrompt | null => {
  const [hasRevealedOnce, setHasRevealedOnce] = useState(false);

  useEffect(() => {
    if (roomData.showVotes) {
      setHasRevealedOnce(true);
    }
  }, [roomData.showVotes]);

  return useMemo(() => {
    if (!isModeratorView || !roomData.settings.enableFacilitationGuidance) {
      return null;
    }

    const isRevoteTriggered =
      hasRevealedOnce && !roomData.showVotes && spreadSummary.totalVotes === 0;

    const waitingForVotes =
      !roomData.showVotes &&
      spreadSummary.totalVotes > 0 &&
      spreadSummary.totalVotes < roomData.users.length;

    const multipleUnknowns =
      roomData.showVotes && spreadSummary.unknownVoteCount >= 2;

    if (isRevoteTriggered) {
      return {
        title: "Re-vote in progress",
        body: "After discussion, ask if assumptions changed before re-voting.",
      };
    }

    if (multipleUnknowns) {
      return {
        title: "Unknowns flagged",
        body: "Several unknowns surfaced. Consider splitting the story or capturing follow-ups.",
      };
    }

    if (roomData.showVotes) {
      if (spreadSummary.isWideSpread) {
        const canShowNames =
          !roomData.settings.anonymousVotes &&
          !roomData.settings.hideParticipantNames;

        const highestLabel =
          canShowNames && spreadSummary.highestVoter
            ? spreadSummary.highestVoter
            : "highest voter";
        const lowestLabel =
          canShowNames && spreadSummary.lowestVoter
            ? spreadSummary.lowestVoter
            : "lowest voter";

        return {
          title: "Wide spread detected",
          body: `Ask ${highestLabel} and ${lowestLabel} to share their reasoning.`,
        };
      }

      return {
        title: "Quick consensus",
        body: "Lock it in and keep momentum.",
      };
    }

    if (waitingForVotes) {
      return {
        title: "Waiting for votes",
        body: "Check the participant list. Is anyone missing?",
      };
    }

    return {
      title: "Before voting begins",
      body: "Read the acceptance criteria aloud before the first vote.",
    };
  }, [
    hasRevealedOnce,
    isModeratorView,
    roomData.showVotes,
    roomData.settings.anonymousVotes,
    roomData.settings.enableFacilitationGuidance,
    roomData.settings.hideParticipantNames,
    roomData.users.length,
    spreadSummary.highestVoter,
    spreadSummary.isWideSpread,
    spreadSummary.lowestVoter,
    spreadSummary.totalVotes,
    spreadSummary.unknownVoteCount,
  ]);
};
