import { useMemo, useState } from "react";
import { Users, ChevronDown, ChevronUp, Crown, User } from "lucide-react";
import { motion } from "framer-motion";

import type { RoomData, RoomStats } from "../types";
import { getAvatarInfo } from "../utils/avatars";
import { Badge } from './ui/Badge';

export type ParticipantsListProps = {
  roomData: RoomData;
  stats: RoomStats;
  name: string;
};

export function ParticipantsList({
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

  return (
    <div
      data-testid="participants-panel"
      className={`w-full flex-shrink-0 border-b border-white/30 bg-transparent px-0 dark:border-white/10 md:border-b-0 md:border-r md:pr-4 md:py-5 ${
        isParticipantsExpanded ? 'py-3' : 'py-2'
      }`}
    >
      <div
        className={`flex items-center justify-between ${
          isParticipantsExpanded ? 'pb-3' : 'pb-0 md:pb-3'
        }`}
      >
        <h2 className="flex items-center text-lg font-semibold text-slate-900 dark:text-white">
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
        >
          {isParticipantsExpanded ? (
            <ChevronUp size={20} />
          ) : (
            <ChevronDown size={20} />
          )}
        </button>
      </div>
      <div
        className={`${isParticipantsExpanded ? 'block' : 'hidden md:block'}`}
      >
        <div className="mb-3">
          <div className="mb-1 flex justify-between text-sm text-slate-700 dark:text-slate-200 mb-2">
            <span>Voting progress</span>
            <span>
              {stats.votedUsers}/{roomData.users.length}
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-200/70 dark:bg-slate-800">
            <motion.div
              className="h-2 rounded-full bg-gradient-to-r from-brand-500 to-indigo-500"
              initial={{ width: 0 }}
              animate={{ width: `${votingProgress}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
        </div>
        <ul className="space-y-2" data-testid="participants-list">
          {roomData.users.map((user: string) => (
            <motion.li
              key={user}
              data-testid="participant-row"
              data-participant-name={user}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/50 bg-white/80 px-3 py-2 text-slate-900 shadow-sm dark:border-white/10 dark:bg-slate-900/50 dark:text-white"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.2,
                delay: roomData.users.indexOf(user) * 0.05,
              }}
              whileHover={{ scale: 1.01 }}
            >
              <div className="flex items-center space-x-3">
                {roomData.userAvatars?.[user] && (
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-2xl border-2 ${
                      roomData.connectedUsers?.[user]
                        ? 'border-emerald-300 dark:border-emerald-600'
                        : 'border-slate-200 dark:border-slate-600'
                    }`}
                  >
                    {(() => {
                      const avatarInfo = getAvatarInfo(
                        roomData.userAvatars[user]
                      );

                      if (avatarInfo) {
                        return (
                          <avatarInfo.Icon
                            size={20}
                            className={avatarInfo.color}
                          />
                        );
                      }

                      return (
                        <span className="text-lg">
                          {roomData.userAvatars[user]}
                        </span>
                      );
                    })()}
                  </div>
                )}
                <span
                  className={`flex items-center gap-2 text-sm ${
                    user === name ? 'font-semibold' : ''
                  }`}
                >
                  {!roomData.settings.hideParticipantNames && (
                    <>
                      {user}
                      {user === roomData.moderator && (
                        <Crown className="h-3.5 w-3.5 text-brand-500" />
                      )}
                      {user === name && (
                        <User className="h-3.5 w-3.5 text-slate-700 dark:text-slate-200" />
                      )}
                    </>
                  )}
                </span>
              </div>
              {roomData.votes[user] !== undefined &&
                roomData.votes[user] !== null && (
                  <Badge
                    variant={roomData.showVotes ? 'success' : 'default'}
                    className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                  >
                    {roomData.settings.anonymousVotes && roomData.showVotes
                      ? '✓'
                      : roomData.showVotes
                      ? roomData.votes[user]
                      : '✓'}
                  </Badge>
                )}
            </motion.li>
          ))}
        </ul>
      </div>
    </div>
  );
}
