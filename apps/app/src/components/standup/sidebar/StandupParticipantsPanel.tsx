import { useMemo } from 'react';
import type { StandupData } from '@sprintjam/types';

import {
  ParticipantsList,
  type ParticipantsListData,
} from '@/components/layout/RoomSidebar/ParticipantsList';

interface StandupParticipantsPanelProps {
  standupData: StandupData;
  currentUserName: string;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function StandupParticipantsPanel({
  standupData,
  currentUserName,
  isCollapsed,
  onToggleCollapse,
}: StandupParticipantsPanelProps) {
  const listData = useMemo<ParticipantsListData>(() => {
    const respondedUsers = new Set(standupData.respondedUsers);
    const votes = standupData.users.reduce<Record<string, string | undefined>>(
      (acc, user) => {
        acc[user] = respondedUsers.has(user) ? 'submitted' : undefined;
        return acc;
      },
      {},
    );

    return {
      users: standupData.users,
      moderator: standupData.moderator,
      connectedUsers: standupData.connectedUsers,
      votes,
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
      isCompleted={standupData.status === 'completed'}
      isCollapsed={isCollapsed}
      onToggleCollapse={onToggleCollapse}
      hideProgress
      className="h-full"
    />
  );
}
