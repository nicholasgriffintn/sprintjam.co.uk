import { useState } from 'react';
import type { StandupData } from '@sprintjam/types';

import { StandupParticipantsPanel } from '@/components/standup/sidebar/StandupParticipantsPanel';
import { StandupStatusPanel } from '@/components/standup/sidebar/StandupStatusPanel';

interface StandupSidebarProps {
  standupData: StandupData;
  currentUserName: string;
  isSocketConnected: boolean;
  onPing: () => void;
}

export function StandupSidebar({
  standupData,
  currentUserName,
  isSocketConnected,
  onPing,
}: StandupSidebarProps) {
  const [isStatusCollapsed, setIsStatusCollapsed] = useState(false);
  const [isParticipantsCollapsed, setIsParticipantsCollapsed] = useState(false);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex min-w-0 flex-col">
        <StandupStatusPanel
          standupData={standupData}
          currentUserName={currentUserName}
          isSocketConnected={isSocketConnected}
          onPing={onPing}
          isCollapsed={isStatusCollapsed}
          onToggleCollapse={() => setIsStatusCollapsed((prev) => !prev)}
        />
      </div>

      <div
        className={`flex min-w-0 flex-col md:min-h-0 ${
          isParticipantsCollapsed
            ? 'md:min-h-[54px]'
            : 'flex-1 md:min-h-[220px]'
        }`}
      >
        <StandupParticipantsPanel
          standupData={standupData}
          currentUserName={currentUserName}
          isCollapsed={isParticipantsCollapsed}
          onToggleCollapse={() => setIsParticipantsCollapsed((prev) => !prev)}
        />
      </div>
    </div>
  );
}
