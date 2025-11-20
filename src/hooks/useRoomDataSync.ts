import { useEffect } from "react";

import type { RoomData, VoteValue, StructuredVote } from "../types";

interface UseRoomDataSyncOptions {
  roomData: RoomData | null;
  name: string;
  userVote: VoteValue | StructuredVote | null;
  isModeratorView: boolean;
  onVoteChange: (vote: VoteValue | StructuredVote | null) => void;
  onModeratorViewChange: (isModerator: boolean) => void;
}

export const useRoomDataSync = ({
  roomData,
  name,
  userVote,
  isModeratorView,
  onVoteChange,
  onModeratorViewChange,
}: UseRoomDataSyncOptions) => {
  useEffect(() => {
    if (!roomData) {
      if (userVote !== null) {
        onVoteChange(null);
      }
      if (isModeratorView !== false) {
        onModeratorViewChange(false);
      }
      return;
    }

    const nextVote = roomData.votes[name] ?? null;
    if (nextVote !== userVote) {
      onVoteChange(nextVote);
    }

    const nextModeratorView = roomData.moderator === name;
    if (nextModeratorView !== isModeratorView) {
      onModeratorViewChange(nextModeratorView);
    }
  }, [
    roomData,
    name,
    userVote,
    isModeratorView,
    onVoteChange,
    onModeratorViewChange,
  ]);
};
