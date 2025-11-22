import { useMemo } from "react";

import type { RoomData, RoomStats, VoteValue } from "@/types";

export const useRoomStats = (roomData: RoomData): RoomStats => {
  return useMemo(() => {
    const votes = Object.values(roomData.votes).filter(
      (v): v is VoteValue => v !== null && v !== "?",
    );
    const numericVotes = votes
      .filter((v) => !Number.isNaN(Number(v)))
      .map(Number);

    const distribution: Record<VoteValue, number> = {} as Record<
      VoteValue,
      number
    >;
    for (const option of roomData.settings.estimateOptions) {
      distribution[option] = 0;
    }

    for (const vote of Object.values(roomData.votes)) {
      if (vote !== null) {
        distribution[vote] = (distribution[vote] || 0) + 1;
      }
    }

    const avg =
      numericVotes.length > 0
        ? numericVotes.reduce((a, b) => a + b, 0) / numericVotes.length
        : 0;
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
      avg: Number.isNaN(avg) ? "N/A" : avg.toFixed(1),
      mode: maxCount > 0 ? mode : null,
      distribution,
      totalVotes: votes.length,
      votedUsers,
      totalUsers: roomData.users.length,
      judgeScore: roomData.judgeScore,
    };
  }, [
    roomData.votes,
    roomData.users.length,
    roomData.settings.estimateOptions,
    roomData.judgeScore,
  ]);
};
