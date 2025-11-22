import { useMemo, type JSX } from "react";
import { motion } from "framer-motion";

import type { RoomData, RoomStats, SummaryCardSetting } from "@/types";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import type { ConsensusSummaryResult } from "@/components/results/UnifiedResults/utils";

interface UseSummaryCardsParams {
  summaryCardConfigs: SummaryCardSetting[];
  useConfiguredSummaryCards: boolean;
  roomData: RoomData;
  stats: RoomStats;
  topDistribution: [string, number][];
  participationRate: number;
  consensusSummary: ConsensusSummaryResult;
  recommendation: string;
  hasStructuredData: boolean;
}

export function useSummaryCards({
  summaryCardConfigs,
  useConfiguredSummaryCards,
  roomData,
  stats,
  topDistribution,
  participationRate,
  consensusSummary,
  recommendation,
  hasStructuredData,
}: UseSummaryCardsParams) {
  const baseCardClass = "flex h-full flex-col justify-between";

  const summaryCardElements = useMemo(() => {
    return summaryCardConfigs
      .map((card, index) => {
        const delay = index * 0.05;
        switch (card.id) {
          case "average": {
            if (!useConfiguredSummaryCards && !roomData.settings.showAverage) {
              return null;
            }

            if (stats.avg === null || stats.avg === undefined) {
              return null;
            }

            return (
              <motion.div
                key={card.id}
                className="h-full"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay }}
              >
                <SurfaceCard
                  padding="sm"
                  className={`${baseCardClass} text-left`}
                >
                  <h4 className="mb-1 text-sm font-medium text-slate-500 dark:text-slate-300">
                    {card.label}
                  </h4>
                  <div className="text-3xl font-semibold text-brand-600 dark:text-brand-300">
                    {stats.avg}
                  </div>
                </SurfaceCard>
              </motion.div>
            );
          }
          case "mode": {
            if (!useConfiguredSummaryCards && !roomData.settings.showMedian) {
              return null;
            }

            if (stats.mode === null || stats.mode === undefined) {
              return null;
            }

            return (
              <motion.div
                key={card.id}
                className="h-full"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay }}
              >
                <SurfaceCard
                  padding="sm"
                  className={`${baseCardClass} text-left`}
                >
                  <h4 className="mb-1 text-sm font-medium text-slate-500 dark:text-slate-300">
                    {card.label}
                  </h4>
                  <div className="text-3xl font-semibold text-brand-600 dark:text-brand-300">
                    {stats.mode || "N/A"}
                  </div>
                </SurfaceCard>
              </motion.div>
            );
          }
          case "topVotes": {
            if (!useConfiguredSummaryCards && !roomData.settings.showTopVotes)
              return null;
            if (!topDistribution || topDistribution.length === 0) return null;
            return (
              <motion.div
                key={card.id}
                className="h-full"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay }}
              >
                <SurfaceCard
                  padding="sm"
                  className={`${baseCardClass} space-y-2`}
                >
                  <h4 className="text-sm font-medium text-slate-500 dark:text-slate-300">
                    {card.label}
                  </h4>
                  <div className="flex flex-wrap items-center gap-2">
                    {topDistribution.map(([vote, count]) => {
                      const metadata =
                        roomData.settings.voteOptionsMetadata?.find(
                          (m) => m.value.toString() === vote,
                        );
                      const background = metadata?.background || "#ebf5ff";

                      return (
                        <div key={vote} className="flex items-center gap-1">
                          <div
                            className="flex h-7 w-7 items-center justify-center rounded-xl text-xs font-semibold text-black"
                            style={{ backgroundColor: background }}
                          >
                            {vote}
                          </div>
                          <span className="text-xs text-slate-500 dark:text-slate-300">
                            ×{count}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </SurfaceCard>
              </motion.div>
            );
          }
          case "participation": {
            return (
              <motion.div
                key={card.id}
                className="h-full"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay }}
              >
                <SurfaceCard
                  padding="sm"
                  className={`${baseCardClass} text-left`}
                >
                  <h4 className="mb-1 text-sm font-medium text-slate-500 dark:text-slate-300">
                    {card.label}
                  </h4>
                  <div className="text-3xl font-semibold text-brand-600 dark:text-brand-300">
                    {(participationRate * 100).toFixed(0)}%
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-300">
                    {stats.votedUsers} of{" "}
                    {stats.totalUsers || roomData.users.length} teammates voted
                  </p>
                </SurfaceCard>
              </motion.div>
            );
          }
          case "consensusHealth": {
            if (!hasStructuredData) return null;
            return (
              <motion.div
                key={card.id}
                className="h-full"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay }}
              >
                <SurfaceCard
                  padding="sm"
                  className={`${baseCardClass} text-left`}
                >
                  <h4 className="mb-1 text-sm font-medium text-slate-500 dark:text-slate-300">
                    {card.label}
                  </h4>
                  <div className="flex items-end justify-between">
                    <span className="text-3xl font-semibold text-brand-600 dark:text-brand-300">
                      {consensusSummary.score ?? "--"}
                    </span>
                    <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      {consensusSummary.level === "high"
                        ? "High"
                        : consensusSummary.level === "medium"
                          ? "Medium"
                          : consensusSummary.level === "low"
                            ? "Low"
                            : "N/A"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">
                    {consensusSummary.summary}
                  </p>
                </SurfaceCard>
              </motion.div>
            );
          }
          case "nextStep": {
            return (
              <motion.div
                key={card.id}
                className="h-full"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay }}
              >
                <SurfaceCard
                  padding="sm"
                  className={`${baseCardClass} space-y-1`}
                >
                  <h4 className="text-sm font-medium text-slate-500 dark:text-slate-300">
                    {card.label}
                  </h4>
                  <p className="text-sm text-slate-700 dark:text-slate-200">
                    {recommendation}
                  </p>
                </SurfaceCard>
              </motion.div>
            );
          }
          default:
            return null;
        }
      })
      .filter((element): element is JSX.Element => element !== null);
  }, [
    summaryCardConfigs,
    useConfiguredSummaryCards,
    roomData.settings.showAverage,
    roomData.settings.showMedian,
    roomData.settings.showTopVotes,
    roomData.settings.voteOptionsMetadata,
    stats.avg,
    stats.mode,
    stats.votedUsers,
    stats.totalUsers,
    roomData.users.length,
    topDistribution,
    participationRate,
    consensusSummary.level,
    consensusSummary.score,
    consensusSummary.summary,
    recommendation,
    hasStructuredData,
  ]);

  return {
    summaryCardElements,
    visibleStatsCount: summaryCardElements.length,
  };
}
