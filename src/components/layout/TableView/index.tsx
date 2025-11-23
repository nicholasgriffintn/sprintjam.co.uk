import { memo, useMemo, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, User, Check } from 'lucide-react';

import type { RoomData, RoomStats, VoteValue } from '@/types';
import { getAvatarInfo } from '@/utils/avatars';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/cn';
import { FallbackLoading } from '@/components/ui/FallbackLoading';

const UnifiedResults = lazy(() =>
  import('@/components/results/UnifiedResults').then((m) => ({
    default: m.UnifiedResults,
  }))
);

export type TableViewProps = {
  roomData: RoomData | null;
  stats: RoomStats;
  name: string;
  userVote: VoteValue | null;
  onVote: (value: VoteValue) => void;
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

    // Adjust radius based on screen size - smaller to make room for content
    const radius = 38; // percentage of container

    const x = 50 + radius * Math.cos(angle);
    const y = 40 + radius * Math.sin(angle); // Offset Y to move circle up

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
              'flex h-14 w-14 md:h-16 md:w-16 items-center justify-center rounded-full border-4 bg-white shadow-xl dark:bg-slate-900',
              isConnected
                ? 'border-emerald-400 dark:border-emerald-500'
                : 'border-slate-300 dark:border-slate-600'
            )}
          >
            {userAvatar && (() => {
              const avatarInfo = getAvatarInfo(userAvatar);

              if (avatarInfo) {
                return (
                  <avatarInfo.Icon size={28} className={avatarInfo.color} />
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
                  'text-xs md:text-sm text-slate-900 dark:text-white whitespace-nowrap',
                  user === currentUser && 'font-bold'
                )}
              >
                {user}
              </span>
              <div className="flex items-center gap-1">
                {user === moderator && (
                  <Crown className="h-3 w-3 text-brand-500" />
                )}
                {user === currentUser && (
                  <User className="h-3 w-3 text-slate-700 dark:text-slate-200" />
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
  userVote,
  onVote,
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
      className={cn('flex h-full w-full flex-col', className)}
    >
      {/* Main table area with players */}
      <div className="relative flex-1 min-h-0">
        {/* Players arranged in a circle */}
        <div className="absolute inset-0">
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

          {/* Central area */}
          <motion.div
            className="absolute left-1/2 top-[35%] flex -translate-x-1/2 -translate-y-1/2"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <AnimatePresence mode="wait">
              {roomData.showVotes ? (
                <motion.div
                  key="results"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  className="max-w-3xl"
                >
                  <div className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-2xl backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/95">
                    <Suspense fallback={<FallbackLoading variant="inline" />}>
                      <UnifiedResults
                        roomData={roomData}
                        stats={stats}
                        criteria={roomData.settings.votingCriteria}
                        displayJudge={roomData.settings.enableJudge}
                        showVotes={roomData.showVotes}
                      />
                    </Suspense>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="waiting"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex flex-col items-center gap-3 rounded-3xl border border-slate-200/80 bg-white/95 px-8 py-6 shadow-2xl backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/95">
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                      Waiting for votes...
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="text-4xl font-bold text-brand-600 dark:text-brand-400">
                        {stats.votedUsers}
                      </div>
                      <span className="text-xl text-slate-500 dark:text-slate-400">
                        / {roomData.users.length}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>

      {/* Voting cards at the bottom */}
      <div className="border-t border-slate-200/80 bg-white/50 px-4 py-4 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/50">
        <div className="mx-auto max-w-5xl">
          <div className="mb-3 flex items-center justify-center gap-2">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white md:text-lg">
              Choose your card
            </h2>
            {userVote && (
              <Badge variant="success" className="text-xs">
                Selected: {userVote}
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap justify-center gap-2 md:gap-3">
            {roomData.settings.estimateOptions.map((option) => {
              const optionLabel = `${option}`;
              const metadata = roomData.settings.voteOptionsMetadata?.find(
                (m) => m.value === option
              );
              const background =
                metadata?.background ||
                (option === userVote ? '#ebf5ff' : '#ffffff');

              return (
                <motion.button
                  type="button"
                  key={option}
                  data-testid={`vote-option-${optionLabel}`}
                  onClick={() => onVote(option)}
                  aria-label={`Vote ${option}`}
                  aria-pressed={userVote === option}
                  className={cn(
                    'flex h-16 w-12 flex-col items-center justify-center rounded-lg border-2 text-lg font-medium md:h-20 md:w-14',
                    userVote === option
                      ? 'border-blue-500 shadow-md'
                      : 'border-gray-300 hover:border-gray-400 dark:border-gray-600 dark:hover:border-gray-500'
                  )}
                  style={{ backgroundColor: background }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  animate={{
                    scale: userVote === option ? 1.05 : 1,
                  }}
                  transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                >
                  <div className="relative flex h-full w-full items-center justify-center">
                    {userVote === option && (
                      <div className="absolute right-1 top-1">
                        <div className="rounded-full bg-blue-500 p-0.5">
                          <Check
                            className="text-white"
                            size={12}
                            strokeWidth={3}
                          />
                        </div>
                      </div>
                    )}
                    <span className="text-lg font-semibold text-slate-900">
                      {option}
                    </span>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
});
