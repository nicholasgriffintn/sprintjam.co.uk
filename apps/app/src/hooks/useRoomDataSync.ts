import { useEffect } from "react";
import type { VoteValue, StructuredVote } from "@sprintjam/types";

import type { RoomData } from "@/types";
import { getVoteKeyForUser } from "@/utils/room";

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
    const anonymousVote =
      roomData.settings.anonymousVotes && roomData.users.length > 0
        ? (roomData.votes[getVoteKeyForUser(roomData, name)] ?? null)
        : null;
    const resolvedVote = anonymousVote ?? nextVote;
    if (resolvedVote !== userVote) {
      onVoteChange(resolvedVote);
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
