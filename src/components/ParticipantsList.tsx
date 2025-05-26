import { useMemo, useState } from "react";
import { Users, ChevronDown, ChevronUp } from "lucide-react";
import { motion } from "framer-motion";

import { RoomData, RoomStats } from "../types";

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
    <div className="bg-gray-100 border-b md:border-b-0 md:border-r overflow-y-auto md:p-4">
      <div className="flex items-center justify-between p-4 md:p-0 md:mb-4">
        <h2 className="text-lg font-medium flex items-center">
          <Users size={18} className="mr-1 md:hidden" />
          Participants ({roomData.users.length})
        </h2>
        <button
          className="block md:hidden rounded-md p-1 hover:bg-gray-200 transition-colors"
          onClick={() => setIsParticipantsExpanded(!isParticipantsExpanded)}
          aria-label={isParticipantsExpanded ? "Collapse participants" : "Expand participants"}
        >
          {isParticipantsExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
      </div>
      <div className={`px-4 pb-4 md:p-0 ${isParticipantsExpanded ? 'block' : 'hidden md:block'}`}>
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span>Voting Progress</span>
            <span>{stats.votedUsers}/{roomData.users.length}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <motion.div
              className="bg-blue-600 h-2.5 rounded-full"
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
              className="flex items-center justify-between p-2 bg-white rounded-md shadow-sm hover:shadow-md"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.2,
                delay: roomData.users.indexOf(user) * 0.05
              }}
              whileHover={{ scale: 1.01 }}
            >
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${roomData.votes[user] !== undefined && roomData.votes[user] !== null
                  ? 'bg-green-500'
                  : 'bg-gray-300'
                  }`} />
                <span className={`${user === name ? 'font-medium' : ''}`}>
                  {user}
                  {user === roomData.moderator && (
                    <span className="ml-1 text-xs text-blue-600">(Mod)</span>
                  )}
                  {user === name && (
                    <span className="ml-1 text-xs text-gray-500">(You)</span>
                  )}
                  {roomData.settings.showUserPresence && (
                    <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${roomData.connectedUsers?.[user]
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-200 text-gray-700'
                      }`}>
                      {roomData.connectedUsers?.[user] ? 'Online' : 'Offline'}
                    </span>
                  )}
                </span>
              </div>
              {(roomData.votes[user] !== undefined && roomData.votes[user] !== null) && (
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${roomData.showVotes
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-200'
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