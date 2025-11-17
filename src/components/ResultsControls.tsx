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
    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 text-gray-900 dark:text-white">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <BarChart3 className="h-5 w-5" />
        Results
      </h2>
      <div className="flex flex-wrap gap-2">
        {(isModeratorView || roomData.settings.allowOthersToShowEstimates) && (
          <motion.button
            type="button"
            data-testid="toggle-votes-button"
            onClick={onToggleShowVotes}
            className={`rounded-xl px-4 py-2 text-sm font-semibold ${
              !roomData.showVotes
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-amber-500 text-black hover:bg-amber-600'
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {roomData.showVotes ? 'Hide Votes' : 'Show Votes'}
          </motion.button>
        )}
        {(isModeratorView ||
          roomData.settings.allowOthersToDeleteEstimates) && (
          <motion.button
            type="button"
            data-testid="reset-votes-button"
            onClick={onResetVotes}
            className="rounded-xl bg-slate-500 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-600"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Reset Votes
          </motion.button>
        )}
      </div>
    </div>
  );
}
