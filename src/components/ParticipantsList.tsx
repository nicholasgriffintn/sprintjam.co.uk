import { useMemo, useState } from "react";
import { Users, ChevronDown, ChevronUp, Crown, User } from "lucide-react";
import { motion } from "framer-motion";

import type { RoomData, RoomStats } from "../types";
import { getAvatarInfo } from "../utils/avatars";

export type ParticipantsListProps = {
  roomData: RoomData;
  stats: RoomStats;
  name: string;
};

export function ParticipantsList({ roomData, stats, name }: ParticipantsListProps) {
  const votingProgress = useMemo(() => {
    return roomData.users.length > 0
      ? Math.round((stats.votedUsers / roomData.users.length) * 100)
      : 0;
  }, [stats.votedUsers, roomData.users.length]);

  const [isParticipantsExpanded, setIsParticipantsExpanded] = useState(false);

  return (
    <div className="w-full bg-gray-100 dark:bg-gray-800 border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-700 md:overflow-y-auto md:p-4">
      <div className="flex items-center justify-between p-4 md:p-0 md:mb-4">
        <h2 className="text-lg font-medium flex items-center text-gray-900 dark:text-white">
          <Users size={18} className="mr-1 md:hidden" />
          Participants ({roomData.users.length})
        </h2>
        <button
          type="button"
          className="block md:hidden rounded-md p-1 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300"
          onClick={() => setIsParticipantsExpanded(!isParticipantsExpanded)}
          aria-label={isParticipantsExpanded ? "Collapse participants" : "Expand participants"}
        >
          {isParticipantsExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
      </div>
      <div className={`px-4 pb-4 md:px-0 md:pb-0 ${isParticipantsExpanded ? "block" : "hidden md:block"}`}>
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1.5">
            <span className="text-gray-700 dark:text-gray-300">Voting Progress</span>
            <span className="text-gray-700 dark:text-gray-300">{stats.votedUsers}/{roomData.users.length}</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <motion.div
              className="bg-blue-600 h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${votingProgress}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
        </div>
        <ul className="space-y-2">
          {roomData.users.map((user: string) => (
            <motion.li
              key={user}
              className="flex flex-wrap items-center justify-between gap-3 p-2 bg-white dark:bg-gray-700 rounded-md shadow-sm hover:shadow-md text-gray-900 dark:text-white"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.2,
                delay: roomData.users.indexOf(user) * 0.05
              }}
              whileHover={{ scale: 1.01 }}
            >
              <div className="flex items-center space-x-3">
                {roomData.userAvatars?.[user] && (
                  <div className={`w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-600 flex items-center justify-center border-2 ${
                    roomData.connectedUsers?.[user]
                      ? 'border-green-300 dark:border-green-600'
                      : 'border-red-300 dark:border-red-600'
                  }`}>
                    {(() => {
                      const avatarInfo = getAvatarInfo(roomData.userAvatars[user]);
                      return <avatarInfo.Icon size={20} className={avatarInfo.color} />;
                    })()}
                  </div>
                )}
                <span className={`flex items-center flex-wrap gap-x-1 gap-y-1 ${user === name ? "font-medium" : ""} text-gray-900 dark:text-white`}>
                  {!roomData.settings.hideParticipantNames && (
                    <>
                      {user}
                      {user === roomData.moderator && (
                        <Crown className="ml-1 w-3 h-3 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                      )}
                      {user === name && (
                        <User className="ml-1 w-3 h-3 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                      )}
                    </>
                  )}
                  {roomData.settings.showUserPresence && (
                    <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ${roomData.connectedUsers?.[user]
                      ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                      : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                      }`}>
                      {roomData.connectedUsers?.[user] ? 'Online' : 'Offline'}
                    </span>
                  )}
                </span>
              </div>
              {(roomData.votes[user] !== undefined && roomData.votes[user] !== null) && (
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${roomData.showVotes
                    ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                    : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                    }`}>
                  {roomData.settings.anonymousVotes && roomData.showVotes
                    ? '✓'
                    : roomData.showVotes
                      ? roomData.votes[user]
                      : '✓'}
                </span>
              )}
            </motion.li>
          ))}
        </ul>
      </div>
    </div>
  );
}
