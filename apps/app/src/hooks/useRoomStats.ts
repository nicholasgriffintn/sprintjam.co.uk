import { useMemo } from "react";
import type { VoteValue } from "@sprintjam/types";

import type { RoomData, RoomStats } from "@/types";
import {
  getExtraVoteValueSet,
  getVisibleEstimateOptions,
  hasNumericBaseOptions,
} from "@/utils/votingOptions";

export const useRoomStats = (roomData: RoomData): RoomStats => {
  return useMemo(() => {
    const extraValues = getExtraVoteValueSet(
      roomData.settings.extraVoteOptions ?? [],
    );
    const visibleOptions = getVisibleEstimateOptions(roomData.settings);
    const votes = Object.values(roomData.votes).filter(
      (v): v is VoteValue => v !== null,
    );
    const numericVotes = votes
      .filter((v) => !extraValues.has(String(v)))
      .filter((v) => !Number.isNaN(Number(v)))
      .map(Number);

    const distribution: Record<string, number> = {};
    for (const option of visibleOptions) {
      const key = String(option);
      distribution[key] = 0;
    }

    for (const vote of Object.values(roomData.votes)) {
      if (vote !== null) {
        const key = String(vote);
        distribution[key] = (distribution[key] || 0) + 1;
      }
    }

    const isNumericScale = hasNumericBaseOptions(
      roomData.settings.estimateOptions,
      roomData.settings.extraVoteOptions ?? [],
    );
    const hasNumericVotes = isNumericScale && numericVotes.length > 0;
    const avg = hasNumericVotes
      ? Number(
          (
            numericVotes.reduce((a, b) => a + b, 0) / numericVotes.length
          ).toFixed(1),
        )
      : null;
    let maxCount = 0;
    let mode: VoteValue | null = null;

    for (const [vote, count] of Object.entries(distribution)) {
      if (count > maxCount) {
        maxCount = count;
        mode = vote as VoteValue;
      }
    }

    const votedUsers = Object.values(roomData.votes).filter(
      (v) => v !== null,
    ).length;

    return {
      avg: Number.isNaN(avg as number) ? null : avg,
      mode: maxCount > 0 ? mode : null,
      distribution,
      totalVotes: votes.length,
      votedUsers,
      totalUsers: roomData.users.length,
      judgeScore: roomData.judgeScore,
      isNumericScale,
    };
  }, [
    roomData.votes,
    roomData.users.length,
    roomData.settings,
    roomData.judgeScore,
  ]);
};
