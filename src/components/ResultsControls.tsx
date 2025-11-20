import { motion } from 'framer-motion';
import { BarChart3 } from 'lucide-react';

import type { RoomData } from '../types';

export function ResultsControls({
  roomData,
  isModeratorView,
  queueEnabled = true,
  onToggleShowVotes,
  onResetVotes,
  onNextTicket,
  onRevisitLater,
}: {
  roomData: RoomData;
  isModeratorView: boolean;
  queueEnabled?: boolean;
  onToggleShowVotes: () => void;
  onResetVotes: () => void;
  onNextTicket: () => void;
  onRevisitLater?: () => void;
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
            className={`rounded-xl px-4 py-2 text-sm font-semibold ${!roomData.showVotes
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-amber-500 text-black hover:bg-amber-600'
              }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            aria-pressed={roomData.showVotes}
            aria-label={roomData.showVotes ? 'Hide votes' : 'Show votes'}
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
              className="rounded-xl bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 dark:bg-slate-600/90 dark:hover:bg-slate-500/90 dark:focus-visible:ring-slate-600"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Reset Votes
            </motion.button>
          )}
        {queueEnabled &&
          (isModeratorView || roomData.settings.allowOthersToManageQueue) && (
            <motion.button
              type="button"
              data-testid="next-ticket-button"
              onClick={onNextTicket}
              className="rounded-xl bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-300 dark:bg-green-700/90 dark:hover:bg-green-600/90 dark:focus-visible:ring-green-600"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Next Ticket
            </motion.button>
          )}
        {queueEnabled &&
          (isModeratorView || roomData.settings.allowOthersToManageQueue) &&
          onRevisitLater &&
          roomData.currentTicket && (
            <motion.button
              type="button"
              data-testid="revisit-ticket-button"
              onClick={onRevisitLater}
              className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 dark:bg-amber-600/90 dark:hover:bg-amber-500/90 dark:focus-visible:ring-amber-600"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Revisit Later
            </motion.button>
          )}
      </div>
    </div>
  );
}
