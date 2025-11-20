import { useId, useMemo, useState, memo } from 'react';
import { Users, ChevronDown, ChevronUp, Crown, User } from 'lucide-react';
import { motion } from 'framer-motion';

import type { RoomData, RoomStats } from '../types';
import { getAvatarInfo } from '../utils/avatars';
import { Badge } from './ui/Badge';
import { HorizontalProgress } from './ui/HorizontalProgress';

export type ParticipantsListProps = {
  roomData: RoomData;
  stats: RoomStats;
  name: string;
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
              className={`flex h-9 w-9 items-center justify-center rounded-2xl border-2 ${
                isConnected
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
            className={`flex items-center gap-2 text-sm ${
              user === currentUser ? 'font-semibold' : ''
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
}: ParticipantsListProps) {
  const votingProgress = useMemo(() => {
    return roomData.users.length > 0
      ? Math.round((stats.votedUsers / roomData.users.length) * 100)
      : 0;
  }, [stats.votedUsers, roomData.users.length]);

  const [isParticipantsExpanded, setIsParticipantsExpanded] = useState(false);
  const participantsSectionId = useId();
  const contentId = `${participantsSectionId}-content`;
  const headingId = `${participantsSectionId}-heading`;
  const progressLabelId = `${participantsSectionId}-progress`;

  return (
    <div
      data-testid="participants-panel"
      className={`w-full flex-shrink-0 bg-transparent px-0 md:pr-4 md:py-5 ${
        isParticipantsExpanded ? 'py-3' : 'py-2'
      }`}
      role="region"
      aria-labelledby={headingId}
    >
      <div
        className={`flex items-center justify-between ${
          isParticipantsExpanded ? 'pb-3' : 'pb-0 md:pb-3'
        }`}
      >
        <h2
          id={headingId}
          className="flex items-center text-lg font-semibold text-slate-900 dark:text-white"
        >
          <Users size={18} className="mr-2 hidden md:inline-flex" />
          Participants ({roomData.users.length})
        </h2>
        <button
          type="button"
          className="inline-flex rounded-full border border-white/40 bg-white/70 p-1 text-slate-600 shadow-sm transition hover:border-brand-200 hover:text-brand-600 dark:border-white/10 dark:bg-white/10 dark:text-white md:hidden"
          onClick={() => setIsParticipantsExpanded(!isParticipantsExpanded)}
          aria-label={
            isParticipantsExpanded
              ? 'Collapse participants'
              : 'Expand participants'
          }
          aria-expanded={isParticipantsExpanded}
          aria-controls={contentId}
          data-testid="participants-toggle"
        >
          {isParticipantsExpanded ? (
            <ChevronUp size={20} />
          ) : (
            <ChevronDown size={20} />
          )}
        </button>
      </div>
      <div
        id={contentId}
        className={`${isParticipantsExpanded ? 'block' : 'hidden md:block'}`}
      >
        <div className="mb-3">
          <div
            id={progressLabelId}
            className="mb-1 flex justify-between text-sm text-slate-700 dark:text-slate-200 mb-2"
          >
            <span>Voting progress</span>
            <span>
              {stats.votedUsers}/{roomData.users.length}
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
            aria-valuetext={`${stats.votedUsers} of ${roomData.users.length} participants have voted`}
            data-testid="voting-progress-bar"
          />
        </div>
        <ul className="space-y-2" data-testid="participants-list">
          {roomData.users.map((user: string, index: number) => (
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
    </div>
  );
});
