import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRightCircle,
  BarChart3,
  Eye,
  EyeOff,
  RotateCcw,
} from "lucide-react";

import type { RoomData } from "../types";

const buttonBase =
  "group relative overflow-hidden rounded-xl px-4 py-2 text-sm font-semibold shadow-md transition hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";

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
  const voteToggleLabel = roomData.showVotes ? "Hide Votes" : "Show Votes";
  const voteToggleClasses = roomData.showVotes
    ? `${buttonBase} bg-amber-600/90 text-white hover:bg-amber-700 focus-visible:ring-amber-100 focus-visible:ring-offset-amber-950/30`
    : `${buttonBase} bg-blue-700 text-white hover:bg-blue-800 focus-visible:ring-blue-200 focus-visible:ring-offset-slate-900/30`;

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
            className={voteToggleClasses}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            aria-pressed={roomData.showVotes}
            aria-label={roomData.showVotes ? "Hide votes" : "Show votes"}
          >
            <span className="relative flex items-center gap-2">
              {roomData.showVotes ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
              <span>{voteToggleLabel}</span>
            </span>
          </motion.button>
        )}
        {(isModeratorView ||
          roomData.settings.allowOthersToDeleteEstimates) && (
          <motion.button
            type="button"
            data-testid="reset-votes-button"
            onClick={onResetVotes}
            className={`${buttonBase} bg-red-600 text-white shadow-red-900/25 hover:bg-red-700 focus-visible:ring-red-200/70 focus-visible:ring-offset-red-950/25`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="relative flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              <span>Reset Votes</span>
            </span>
          </motion.button>
        )}
        {queueEnabled &&
          (isModeratorView || roomData.settings.allowOthersToManageQueue) && (
            <motion.button
              type="button"
              data-testid="next-ticket-button"
              onClick={onNextTicket}
              className={`${buttonBase} bg-green-600/90 text-white shadow-green-900/20 hover:bg-green-700 focus-visible:ring-green-200 focus-visible:ring-offset-green-950/30`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="relative flex items-center gap-2">
                <ArrowRightCircle className="h-4 w-4" />
                <span>Next Ticket</span>
              </span>
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
              className={`${buttonBase} bg-amber-600/90 text-white shadow-amber-900/20 hover:bg-amber-700 focus-visible:ring-amber-200 focus-visible:ring-offset-amber-950/30`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="relative flex items-center gap-2">
                <RotateCcw className="h-4 w-4" />
                <span>Revisit Later</span>
              </span>
            </motion.button>
          )}
      </div>
    </div>
  );
}
