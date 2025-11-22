import { useId, useMemo, useState, memo } from "react";
import { Users, ChevronDown, ChevronUp, Crown, User } from "lucide-react";
import { motion } from "framer-motion";

import type { RoomData, RoomStats } from "@/types";
import { getAvatarInfo } from "@/utils/avatars";
import { Badge } from "@/components/ui/Badge";
import { HorizontalProgress } from "@/components/ui/HorizontalProgress";
import { cn } from '@/lib/cn';
import { SurfaceCard } from '@/components/ui/SurfaceCard';

export type ParticipantsListProps = {
  roomData: RoomData | null;
  stats: RoomStats;
  name: string;
  className?: string;
  contentClassName?: string;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
};

type ParticipantItemProps = {
  user: string;
  index: number;
  currentUser: string;
  moderator: string;
  userAvatar?: string;
  isConnected: boolean;
  vote?: string | number;
  showVotes: boolean;
  anonymousVotes: boolean;
  hideParticipantNames?: boolean;
};

const ParticipantItem = memo(
  ({
    user,
    index,
    currentUser,
    moderator,
    userAvatar,
    isConnected,
    vote,
    showVotes,
    anonymousVotes,
    hideParticipantNames,
  }: ParticipantItemProps) => {
    return (
      <motion.li
        data-testid="participant-row"
        data-participant-name={user}
        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/50 bg-white/80 px-3 py-2 text-slate-900 shadow-sm dark:border-white/10 dark:bg-slate-900/50 dark:text-white"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.2,
          delay: index * 0.05,
        }}
        whileHover={{ scale: 1.01 }}
      >
        <div className="flex items-center space-x-3">
          {userAvatar && (
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-2xl border-2 ${isConnected
                ? 'border-emerald-300 dark:border-emerald-600'
                : 'border-slate-200 dark:border-slate-600'
                }`}
            >
              {(() => {
                const avatarInfo = getAvatarInfo(userAvatar);

                if (avatarInfo) {
                  return (
                    <avatarInfo.Icon size={20} className={avatarInfo.color} />
                  );
                }

                return <span className="text-lg">{userAvatar}</span>;
              })()}
            </div>
          )}
          <span
            className={`flex items-center gap-2 text-sm ${user === currentUser ? 'font-semibold' : ''
              }`}
          >
            {!hideParticipantNames && (
              <>
                {user}
                {user === moderator && (
                  <Crown className="h-3.5 w-3.5 text-brand-500" />
                )}
                {user === currentUser && (
                  <User className="h-3.5 w-3.5 text-slate-700 dark:text-slate-200" />
                )}
              </>
            )}
          </span>
        </div>
        {vote !== undefined && vote !== null && (
          <Badge
            variant={showVotes ? 'success' : 'default'}
            className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
          >
            {anonymousVotes && showVotes ? '✓' : showVotes ? vote : '✓'}
          </Badge>
        )}
      </motion.li>
    );
  }
);

ParticipantItem.displayName = 'ParticipantItem';

export const ParticipantsList = memo(function ParticipantsList({
  roomData,
  stats,
  name,
  className,
  contentClassName,
  isCollapsed,
  onToggleCollapse,
}: ParticipantsListProps) {
  const votingProgress = useMemo(() => {
    if (!roomData) {
      return 0;
    }
    return roomData.users.length > 0
      ? Math.round((stats.votedUsers / roomData.users.length) * 100)
      : 0;
  }, [stats.votedUsers, roomData?.users.length]);

  const [localCollapsed, setLocalCollapsed] = useState(false);
  const participantsSectionId = useId();
  const contentId = `${participantsSectionId}-content`;
  const headingId = `${participantsSectionId}-heading`;
  const progressLabelId = `${participantsSectionId}-progress`;
  const collapsed = isCollapsed ?? localCollapsed;

  const handleToggle = () => {
    if (onToggleCollapse) {
      onToggleCollapse();
      return;
    }
    setLocalCollapsed((prev) => !prev);
  };

  return (
    <SurfaceCard
      data-testid="participants-panel"
      className={cn(
        'flex h-full flex-col overflow-hidden border border-slate-200/80 shadow-lg dark:border-slate-800',
        className
      )}
      padding="none"
      role="region"
      aria-labelledby={headingId}
    >
      <div
        className={cn(
          'flex items-center justify-between gap-2 border-b border-white/40 px-4 py-3 dark:border-white/10',
          collapsed && 'border-b-0 py-2',
        )}
      >
        <h2
          id={headingId}
          className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white"
        >
          <Users size={18} className="hidden md:inline-flex" />
          <span className="inline-flex items-center gap-1 leading-none">
            Participants
            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-200">
              {roomData?.users.length}
            </span>
          </span>
        </h2>
        <button
          type="button"
          className="inline-flex items-center rounded-full border border-white/40 bg-white/70 p-1 text-slate-600 shadow-sm transition hover:border-brand-200 hover:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent dark:border-white/10 dark:bg-white/10 dark:text-white"
          onClick={handleToggle}
          aria-label={
            collapsed ? 'Expand participants' : 'Collapse participants'
          }
          aria-expanded={!collapsed}
          aria-controls={contentId}
          data-testid="participants-toggle"
        >
          {collapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
        </button>
      </div>
      <div
        id={contentId}
        tabIndex={0}
        className={cn(
          'flex-1 space-y-3 overflow-y-auto px-4 py-4',
          collapsed && 'hidden',
          contentClassName
        )}
      >
        <div>
          <div
            id={progressLabelId}
            className="mb-2 flex justify-between text-sm text-slate-700 dark:text-slate-200"
          >
            <span>Voting progress</span>
            <span>
              {stats.votedUsers}/{roomData?.users.length}
            </span>
          </div>
          <HorizontalProgress
            completed={votingProgress}
            total={100}
            role="progressbar"
            aria-valuenow={votingProgress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Voting progress"
            aria-describedby={progressLabelId}
            aria-valuetext={`${stats.votedUsers} of ${roomData?.users.length} participants have voted`}
            data-testid="voting-progress-bar"
          />
        </div>
        <ul className="space-y-2 pr-1" data-testid="participants-list">
          {roomData?.users.map((user: string, index: number) => (
            <ParticipantItem
              key={user}
              user={user}
              index={index}
              currentUser={name}
              moderator={roomData.moderator}
              userAvatar={roomData.userAvatars?.[user]}
              isConnected={roomData.connectedUsers?.[user] ?? false}
              vote={roomData.votes[user] ?? undefined}
              showVotes={roomData.showVotes}
              anonymousVotes={roomData.settings.anonymousVotes}
              hideParticipantNames={roomData.settings.hideParticipantNames}
            />
          ))}
        </ul>
      </div>
    </SurfaceCard>
  );
});
