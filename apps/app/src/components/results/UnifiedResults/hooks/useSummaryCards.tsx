import { useMemo, type JSX } from "react";
import { motion } from "framer-motion";
import type { SummaryCardSetting } from "@sprintjam/types";

import type { RoomData, RoomStats } from "@/types";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import type { ConsensusSummaryResult } from "@/components/results/UnifiedResults/utils";
import { getContrastingTextColor } from "@/utils/colors";

const parseOptionLabel = (optionText: string) => {
  const [first, ...rest] = optionText.split(" ");
  const hasLeadingEmoji =
    first && /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u.test(first);

  return {
    icon: hasLeadingEmoji ? first : "",
    label: hasLeadingEmoji ? rest.join(" ").trim() || first : optionText,
  };
};

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

            if (
              !stats.isNumericScale ||
              stats.avg === null ||
              stats.avg === undefined
            ) {
              return null;
            }

            const displayAverage =
              typeof stats.avg === "number" ? stats.avg.toFixed(1) : stats.avg;

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
                    {displayAverage}
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
                          (m) => String(m.value) === vote,
                        );
                      const background = metadata?.background || "#ebf5ff";
                      const { icon, label } = parseOptionLabel(String(vote));
                      const textColor = getContrastingTextColor(background);

                      return (
                        <div key={vote} className="flex items-center gap-1">
                          <div
                            className="relative flex h-7 w-7 items-center justify-center overflow-hidden rounded-xl text-xs font-semibold"
                            style={{
                              backgroundColor: background,
                              color: textColor,
                            }}
                          >
                            {icon ? (
                              <>
                                <span
                                  aria-hidden="true"
                                  className="text-sm leading-none"
                                >
                                  {icon}
                                </span>
                                <span className="sr-only">{label}</span>
                              </>
                            ) : (
                              <span
                                className="truncate px-1 leading-tight"
                                title={label}
                              >
                                {label}
                              </span>
                            )}
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
    stats.isNumericScale,
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
