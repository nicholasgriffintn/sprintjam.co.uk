import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRightCircle,
  BarChart3,
  Eye,
  EyeOff,
  RotateCcw,
} from "lucide-react";

import type { RoomData } from "@/types";
import { Button } from "@/components/ui/Button";

const buttonBase =
  ' group relative overflow-hidden rounded-xl px-4 py-2 text-sm font-semibold shadow-md hover:shadow-lg';

const MotionButton = motion(Button);

export function ResultsControls({
  roomData,
  isModeratorView,
  queueEnabled = true,
  onToggleShowVotes,
  onResetVotes,
  onNextTicket,
  onRevisitLater,
  onOpenResultsSettings,
}: {
  roomData: RoomData;
  isModeratorView: boolean;
  queueEnabled?: boolean;
  onToggleShowVotes: () => void;
  onResetVotes: () => void;
  onNextTicket: () => void;
  onRevisitLater?: () => void;
  onOpenResultsSettings?: () => void;
}) {
  const voteToggleLabel = roomData.showVotes ? "Hide Votes" : "Show Votes";
  const voteToggleClasses = roomData.showVotes
    ? `${buttonBase} bg-blue-900 text-white shadow-blue-950/40 hover:bg-blue-950 focus-visible:ring-blue-200/80 focus-visible:ring-offset-slate-900/40 dark:bg-blue-500/40 dark:text-blue-200 dark:hover:bg-blue-500/50`
    : `${buttonBase} bg-blue-700 text-white hover:bg-blue-800 focus-visible:ring-blue-200 focus-visible:ring-offset-slate-900/30 dark:bg-blue-500/20 dark:text-blue-200 dark:hover:bg-blue-500/30`;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 text-gray-900 dark:text-white">
      <div className="flex items-center gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <BarChart3 className="h-5 w-5" />
          Results
        </h2>
        {onOpenResultsSettings && (
          <Button
            type="button"
            variant="unstyled"
            onClick={onOpenResultsSettings}
            className="text-xs font-semibold text-blue-600 underline decoration-dotted underline-offset-4 hover:text-blue-500 dark:text-blue-300 dark:hover:text-blue-200"
          >
            Configure results
          </Button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {(isModeratorView || roomData.settings.allowOthersToShowEstimates) &&
          !roomData.settings.alwaysRevealVotes && (
            <MotionButton
              type="button"
              variant="unstyled"
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
            </MotionButton>
          )}
        {(isModeratorView ||
          roomData.settings.allowOthersToDeleteEstimates) && (
          <MotionButton
            type="button"
            variant="unstyled"
            data-testid="reset-votes-button"
            onClick={onResetVotes}
            className={`${buttonBase} bg-red-600 text-white shadow-red-900/25 hover:bg-red-700 focus-visible:ring-red-200/70 focus-visible:ring-offset-red-950/25 dark:bg-red-500/20 dark:text-red-200 dark:hover:bg-red-500/30 dark:shadow-red-900/10`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="relative flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              <span>Reset Votes</span>
            </span>
          </MotionButton>
        )}
        {queueEnabled &&
          roomData.currentTicket &&
          (isModeratorView || roomData.settings.allowOthersToManageQueue) && (
            <MotionButton
              type="button"
              variant="unstyled"
              data-testid="next-ticket-button"
              onClick={onNextTicket}
              className={`${buttonBase} bg-green-700 text-white shadow-green-900/20 hover:bg-green-800 focus-visible:ring-green-200 focus-visible:ring-offset-green-950/30 dark:bg-green-500/20 dark:text-green-200 dark:hover:bg-green-500/30`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="relative flex items-center gap-2">
                <ArrowRightCircle className="h-4 w-4" />
                <span>Next Ticket</span>
              </span>
            </MotionButton>
          )}
        {queueEnabled &&
          (isModeratorView || roomData.settings.allowOthersToManageQueue) &&
          onRevisitLater &&
          roomData.currentTicket && (
            <MotionButton
              type="button"
              variant="unstyled"
              data-testid="revisit-ticket-button"
              onClick={onRevisitLater}
              className={`${buttonBase} bg-amber-700 text-white shadow-amber-900/20 hover:bg-amber-800 focus-visible:ring-amber-200 focus-visible:ring-offset-amber-950/30 dark:bg-amber-500/20 dark:text-amber-200 dark:hover:bg-amber-500/30 dark:shadow-amber-900/10`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="relative flex items-center gap-2">
                <RotateCcw className="h-4 w-4" />
                <span>Revisit Later</span>
              </span>
            </MotionButton>
          )}
      </div>
    </div>
  );
}
