import { motion } from 'framer-motion';

import type { RoomData, RoomStats } from '../types';

export function VoteDistribution({
  roomData,
  stats,
}: {
  roomData: RoomData;
  stats: RoomStats;
}) {
  return (
    <div>
      {roomData.settings.estimateOptions.map((option) => {
        const metadata = roomData.settings.voteOptionsMetadata?.find(m => m.value === option);
        const background = metadata?.background || '#ebf5ff';

        return (
          <motion.div
            key={option}
            className="flex items-center mb-2"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.1 * roomData.settings.estimateOptions.indexOf(option) }}
          >
            <div className="w-8 text-center font-medium rounded" style={{ backgroundColor: background }}>
              {option}
            </div>
            <div className="flex-1 mx-2">
              <div className="w-full bg-gray-200 rounded-full h-4">
                <motion.div
                  className="h-4 rounded-full"
                  initial={{ width: 0 }}
                  animate={{
                    width: `${roomData.users.length > 0
                      ? (stats.distribution[option] / roomData.users.length) * 100
                      : 0}%`
                  }}
                  transition={{ duration: 0.8, delay: 0.1 * roomData.settings.estimateOptions.indexOf(option) }}
                  style={{ backgroundColor: background }}
                />
              </div>
            </div>
            <div className="w-10 text-center">
              <span className="px-2 py-1 rounded bg-grey-100 border-grey-200 text-grey-800">
                {stats.distribution[option] || 0}
              </span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}