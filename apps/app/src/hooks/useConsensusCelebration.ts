import { useEffect, useRef } from "react";

import type { RoomData, RoomStats } from "@/types";

interface UseConsensusCelebrationParams {
  roomData: RoomData;
  stats: RoomStats;
}

export const useConsensusCelebration = ({
  roomData,
  stats,
}: UseConsensusCelebrationParams) => {
  const hasCelebratedRef = useRef(false);

  useEffect(() => {
    const everyoneVotedSame =
      roomData.showVotes &&
      stats.votedUsers === roomData.users.length &&
      stats.mode !== null &&
      stats.distribution[stats.mode] === stats.votedUsers;

    if (everyoneVotedSame) {
      if (!hasCelebratedRef.current) {
        import("canvas-confetti").then((module) => {
          const confetti = module.default;
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        });
        hasCelebratedRef.current = true;
      }
    } else if (stats.votedUsers < roomData.users.length) {
      hasCelebratedRef.current = false;
    }
  }, [
    roomData.showVotes,
    roomData.users.length,
    stats.distribution,
    stats.mode,
    stats.votedUsers,
  ]);
};
