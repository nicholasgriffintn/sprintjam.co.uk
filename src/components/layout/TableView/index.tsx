import { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Crown, User } from 'lucide-react';

import type { RoomData, RoomStats } from '@/types';
import { getAvatarInfo } from '@/utils/avatars';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/cn';

export type TableViewProps = {
  roomData: RoomData | null;
  stats: RoomStats;
  name: string;
  className?: string;
};

type PlayerCardProps = {
  user: string;
  position: number;
  totalPlayers: number;
  currentUser: string;
  moderator: string;
  userAvatar?: string;
  isConnected: boolean;
  vote?: string | number;
  showVotes: boolean;
  anonymousVotes: boolean;
  hideParticipantNames?: boolean;
};

const PlayerCard = memo(
  ({
    user,
    position,
    totalPlayers,
    currentUser,
    moderator,
    userAvatar,
    isConnected,
    vote,
    showVotes,
    anonymousVotes,
    hideParticipantNames,
  }: PlayerCardProps) => {
    // Calculate position around a circle
    const angle = (position / totalPlayers) * 2 * Math.PI - Math.PI / 2;

    // Adjust radius based on screen size
    const radius = 35; // percentage of container

    const x = 50 + radius * Math.cos(angle);
    const y = 50 + radius * Math.sin(angle);

    return (
      <motion.div
        data-testid="table-player-card"
        data-participant-name={user}
        className="absolute"
        style={{
          left: `${x}%`,
          top: `${y}%`,
          transform: 'translate(-50%, -50%)',
        }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          duration: 0.3,
          delay: position * 0.05,
        }}
      >
        <div className="flex flex-col items-center gap-2">
          {/* Vote badge above avatar */}
          {vote !== undefined && vote !== null && (
            <Badge
              variant={showVotes ? 'success' : 'default'}
              className="rounded-xl px-3 py-1.5 text-sm font-bold shadow-lg"
            >
              {anonymousVotes && showVotes ? '✓' : showVotes ? vote : '✓'}
            </Badge>
          )}

          {/* Avatar */}
          <div
            className={cn(
              'flex h-16 w-16 items-center justify-center rounded-full border-4 bg-white shadow-xl dark:bg-slate-900',
              isConnected
                ? 'border-emerald-400 dark:border-emerald-500'
                : 'border-slate-300 dark:border-slate-600'
            )}
          >
            {userAvatar && (() => {
              const avatarInfo = getAvatarInfo(userAvatar);

              if (avatarInfo) {
                return (
                  <avatarInfo.Icon size={32} className={avatarInfo.color} />
                );
              }

              return <span className="text-2xl">{userAvatar}</span>;
            })()}
          </div>

          {/* Name and badges */}
          {!hideParticipantNames && (
            <div className="flex flex-col items-center gap-1">
              <span
                className={cn(
                  'text-sm text-slate-900 dark:text-white',
                  user === currentUser && 'font-bold'
                )}
              >
                {user}
              </span>
              <div className="flex items-center gap-1">
                {user === moderator && (
                  <Crown className="h-3.5 w-3.5 text-brand-500" />
                )}
                {user === currentUser && (
                  <User className="h-3.5 w-3.5 text-slate-700 dark:text-slate-200" />
                )}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    );
  }
);

PlayerCard.displayName = 'PlayerCard';

export const TableView = memo(function TableView({
  roomData,
  stats,
  name,
  className,
}: TableViewProps) {
  const votingProgress = useMemo(() => {
    if (!roomData) {
      return 0;
    }
    return roomData.users.length > 0
      ? Math.round((stats.votedUsers / roomData.users.length) * 100)
      : 0;
  }, [stats.votedUsers, roomData?.users.length]);

  if (!roomData) {
    return null;
  }

  return (
    <div
      data-testid="table-view"
      className={cn('relative w-full', className)}
      style={{ aspectRatio: '16/9', minHeight: '400px' }}
    >
      {/* Central voting area */}
      <motion.div
        className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-4"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <div className="flex flex-col items-center gap-2 rounded-3xl border border-slate-200/80 bg-white/90 px-8 py-6 shadow-2xl backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/90">
          {roomData.showVotes ? (
            <div className="flex flex-col items-center gap-2">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                Voting complete
              </span>
              <div className="text-4xl font-bold text-brand-600 dark:text-brand-400">
                {votingProgress}%
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                Waiting for votes...
              </span>
              <div className="flex items-center gap-2">
                <div className="text-3xl font-bold text-brand-600 dark:text-brand-400">
                  {stats.votedUsers}
                </div>
                <span className="text-lg text-slate-500 dark:text-slate-400">
                  / {roomData.users.length}
                </span>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Players arranged in a circle */}
      {roomData.users.map((user: string, index: number) => (
        <PlayerCard
          key={user}
          user={user}
          position={index}
          totalPlayers={roomData.users.length}
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
    </div>
  );
});
