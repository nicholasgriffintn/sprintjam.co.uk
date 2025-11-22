import { motion } from "framer-motion";

import type { RoomData, RoomStats } from "@/types";
import { getContrastingTextColor } from '@/utils/colors';

export type VoteDistributionViewMode = "count" | "percentage" | "cumulative";

interface VoteDistributionProps {
  roomData: RoomData;
  stats: RoomStats;
  viewMode: VoteDistributionViewMode;
}

export function VoteDistribution({
  roomData,
  stats,
  viewMode,
}: VoteDistributionProps) {
  const defaultTotal = roomData.users.length || stats.totalUsers || 1;
  const voteTotal = stats.totalVotes || defaultTotal;
  let cumulativeCount = 0;

  return (
    <div>
      {roomData.settings.estimateOptions.map((option, index) => {
        const metadata = roomData.settings.voteOptionsMetadata?.find(
          (m) => m.value === option,
        );
        const background = metadata?.background || "#ebf5ff";
        const labelTextColor = getContrastingTextColor(background);
        const voteCount = stats.distribution[option] || 0;
        cumulativeCount += voteCount;
        const asPercentage = voteTotal > 0 ? (voteCount / voteTotal) * 100 : 0;
        const cumulativePercentage =
          voteTotal > 0 ? (cumulativeCount / voteTotal) * 100 : 0;

        const width = (() => {
          if (viewMode === "cumulative") return cumulativePercentage;
          if (viewMode === "percentage") return asPercentage;
          return defaultTotal > 0 ? (voteCount / defaultTotal) * 100 : 0;
        })();

        const displayLabel = (() => {
          if (viewMode === "cumulative") {
            return `${cumulativePercentage.toFixed(1)}% cumulative`;
          }
          if (viewMode === "percentage") {
            return `${asPercentage.toFixed(1)}% of votes`;
          }
          return `${voteCount} votes`;
        })();

        return (
          <motion.div
            key={option}
            className="flex items-center mb-2"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              duration: 0.3,
              delay: 0.1 * index,
            }}
          >
            <div
              className="w-10 text-center font-medium rounded"
              style={{ backgroundColor: background, color: labelTextColor }}
            >
              {option}
            </div>
            <div className="flex-1 mx-3">
              <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-4 overflow-hidden">
                <motion.div
                  className="h-4 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${width}%` }}
                  transition={{
                    duration: 0.8,
                    delay: 0.1 * index,
                  }}
                  style={{ backgroundColor: background }}
                />
              </div>
            </div>
            <div className="w-32 text-right space-y-0.5">
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                {displayLabel}
              </div>
              <div className="text-[11px] text-slate-700 dark:text-slate-300">
                {viewMode === 'count'
                  ? `${asPercentage.toFixed(1)}% of votes`
                  : `${voteCount} votes`}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
