import { useMemo } from "react";
import type { StandupData } from "@sprintjam/types";

import {
  ParticipantsList,
  type ParticipantsListData,
} from "@/components/layout/RoomSidebar/ParticipantsList";

interface StandupSidebarProps {
  standupData: StandupData;
  currentUserName: string;
}

export function StandupSidebar({
  standupData,
  currentUserName,
}: StandupSidebarProps) {
  const listData = useMemo<ParticipantsListData>(() => {
    const respondedUsers = new Set(standupData.respondedUsers);
    const votes = standupData.users.reduce<Record<string, string | undefined>>(
      (acc, user) => {
        acc[user] = respondedUsers.has(user) ? "submitted" : undefined;
        return acc;
      },
      {},
    );

    return {
      users: standupData.users,
      moderator: standupData.moderator,
      connectedUsers: standupData.connectedUsers,
      votes,
      // Show a neutral checkmark to indicate who submitted without exposing content.
      showVotes: true,
      settings: {
        anonymousVotes: true,
        hideParticipantNames: false,
      },
      userAvatars: standupData.userAvatars,
      spectators: [],
      votingCompletion: {
        completedCount: standupData.respondedUsers.length,
        totalCount: standupData.users.length,
      },
    };
  }, [standupData]);

  return (
    <ParticipantsList
      roomData={listData}
      stats={{ votedUsers: standupData.respondedUsers.length }}
      name={currentUserName}
      isCompleted={standupData.status === "completed"}
      progressLabel="Submission progress"
      className="h-full"
    />
  );
}
