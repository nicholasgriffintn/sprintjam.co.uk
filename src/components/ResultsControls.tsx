import { motion } from 'framer-motion';
import { BarChart3 } from 'lucide-react';

import type { RoomData } from '../types';

export function ResultsControls({
  roomData,
  isModeratorView,
  onToggleShowVotes,
  onResetVotes,
}: {
  roomData: RoomData;
  isModeratorView: boolean;
  onToggleShowVotes: () => void;
  onResetVotes: () => void;
}) {
  return (
    <div className="mb-4">
      <div className="flex flex-wrap items-center justify-between mb-2">
        <h2 className="text-xl font-semibold flex items-center space-x-2 gap-2">
          <BarChart3 className="h-5 w-5" />
          Results
        </h2>
        <div className="flex flex-wrap mt-2 sm:mt-0 gap-2 sm:space-x-3">
          {(isModeratorView || roomData.settings.allowOthersToShowEstimates) && (
            <motion.button
              type="button"
              onClick={onToggleShowVotes}
              className={`px-3 py-1.5 text-sm sm:text-base rounded-md ${!roomData.showVotes
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-yellow-500 text-white hover:bg-yellow-600'
                }`}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              {roomData.showVotes ? 'Hide Votes' : 'Show Votes'}
            </motion.button>
          )}
          {(isModeratorView || roomData.settings.allowOthersToDeleteEstimates) && (
            <motion.button
              type="button"
              onClick={onResetVotes}
              className={`px-3 py-1.5 text-sm sm:text-base rounded-md bg-gray-500 text-white hover:bg-gray-600`}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              Reset Votes
            </motion.button>
          )}
        </div>
      </div>
    </div>
  )
}