import { motion } from "framer-motion";
import {
  Gavel,
  Users,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
} from "lucide-react";
import { memo, useEffect, useId, useMemo, useState } from "react";

import type { RoomData, RoomStats } from "@/types";

function getSelectedModeLabel(mode: string) {
  switch (mode) {
    case "smartConsensus":
      return "Smart Consensus";
    case "conservativeMode":
      return "Conservative Mode";
    case "optimisticMode":
      return "Optimistic Mode";
    case "simpleAverage":
      return "Simple Average";
    default:
      return "Unknown Mode";
  }
}

export const JudgeResult = memo(function JudgeResult({
  roomData,
  stats,
  showJudgeAnimation,
}: {
  roomData: RoomData;
  stats: RoomStats;
  showJudgeAnimation: boolean;
}) {
  const totalParticipants = stats.totalUsers || roomData.users.length;
  const breakdown = roomData.judgeMetadata?.structuredBreakdown;
  const hasBreakdown = (breakdown?.totalVotes ?? 0) > 0;
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);
  const breakdownRegionId = useId();

  useEffect(() => {
    if (!hasBreakdown && isBreakdownOpen) {
      setIsBreakdownOpen(false);
    }
  }, [hasBreakdown, isBreakdownOpen]);

  const participationData = useMemo(() => {
    const percentage = totalParticipants
      ? Math.round((stats.votedUsers / totalParticipants) * 100)
      : 0;
    const label = totalParticipants
      ? `${stats.votedUsers} votes (${percentage}% of room)`
      : `${stats.votedUsers} votes`;
    return { percentage, label };
  }, [stats.votedUsers, totalParticipants]);

  return (
    <div className="mb-4">
      <div className="flex items-center mb-2">
        {showJudgeAnimation ? (
          <motion.div
            className="mr-2"
            animate={{
              y: [0, -10, 0],
              rotate: [0, -10, 10, -5, 0],
            }}
            transition={{
              duration: 0.8,
              repeat: 2,
              repeatType: "reverse",
            }}
          >
            <Gavel className="text-amber-700" />
          </motion.div>
        ) : (
          <Gavel className="mr-2 text-amber-700" />
        )}
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          The Judge's Verdict
        </h3>
      </div>
      <div className="bg-white/85 dark:bg-slate-900/55 border border-white/50 dark:border-white/5 shadow-[0_12px_32px_rgba(15,23,42,0.12)] backdrop-blur-xl rounded-3xl p-4">
        <motion.div
          className="flex flex-col sm:flex-row sm:justify-between sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <div className="flex flex-row items-center gap-3 mb-2 sm:mb-0">
            <div className="text-4xl sm:text-5xl font-bold text-gray-800 dark:text-white">
              {stats.judgeScore !== null ? stats.judgeScore : 0}
            </div>
            <div className="flex flex-col">
              {roomData.judgeMetadata?.confidence === "high" && (
                <span className="px-2.5 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full text-xs sm:text-sm font-medium flex items-center">
                  <CheckCircle className="w-3.5 h-3.5 mr-1" /> High Confidence
                </span>
              )}
              {roomData.judgeMetadata?.confidence === "medium" && (
                <span className="px-2.5 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-xs sm:text-sm font-medium flex items-center">
                  Medium Confidence
                </span>
              )}
              {roomData.judgeMetadata?.confidence === "low" && (
                <span className="px-2.5 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-full text-xs sm:text-sm font-medium flex items-center">
                  <AlertTriangle className="w-3.5 h-3.5 mr-1" /> Low Confidence
                </span>
              )}
              <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center sm:hidden">
                <Users className="inline w-3 h-3 mr-1" />{" "}
                {participationData.label}
              </span>
            </div>
          </div>
          <div className="mb-2 sm:mb-0">
            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-medium sm:text-right">
              {getSelectedModeLabel(roomData.settings.judgeAlgorithm || "")}
              <span className="text-gray-500 dark:text-gray-400 ml-2 hidden sm:inline">
                <Users className="inline w-3.5 h-3.5 mr-1" />{" "}
                {participationData.label}
              </span>
            </div>
          </div>
        </motion.div>

        {roomData.judgeMetadata?.reasoning && (
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
            {roomData.judgeMetadata.reasoning}
          </p>
        )}

        {roomData.judgeMetadata?.needsDiscussion && (
          <div className="mt-3 bg-amber-50 border border-amber-200 rounded-md p-3 flex items-start">
            <AlertTriangle className="w-4 h-4 text-amber-800 mr-2 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">
                Discussion Recommended
              </p>
              <p className="text-sm text-amber-700">
                Wide spread suggests different understanding of requirements.
              </p>
            </div>
          </div>
        )}

        {hasBreakdown && breakdown && (
          <div className="mt-3 border border-slate-200/80 dark:border-white/10 rounded-2xl bg-white/60 dark:bg-slate-950/40">
            <button
              type="button"
              className="w-full flex items-center justify-between px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200"
              onClick={() => setIsBreakdownOpen((prev) => !prev)}
              aria-expanded={isBreakdownOpen}
              aria-controls={breakdownRegionId}
            >
              <span>Show weighted criteria math</span>
              <ChevronDown
                className={`w-4 h-4 transition-transform ${isBreakdownOpen ? "rotate-180" : "rotate-0"}`}
              />
            </button>
            {isBreakdownOpen && (
              <motion.div
                id={breakdownRegionId}
                className="px-4 pb-4 text-xs text-slate-600 dark:text-slate-300"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                transition={{ duration: 0.25 }}
              >
                <p className="text-[13px] leading-relaxed text-slate-700 dark:text-slate-200">
                  Based on {breakdown.totalVotes} structured vote
                  {breakdown.totalVotes > 1 ? "s" : ""}, the criteria added up to
                  {" "}
                  {breakdown.averageWeightedScore.toFixed(1)}% and adjusted to
                  {" "}
                  {breakdown.averageAdjustedScore.toFixed(1)}% → roughly
                  {" "}
                  <span className="font-semibold">
                    {breakdown.weightedStoryPointEstimate}pt
                  </span>
                  {" "}
                  before consensus. Those inputs averaged
                  {" "}
                  {breakdown.averageStoryPoints.toFixed(1)}pt compared to the
                  judge's verdict of {stats.judgeScore ?? "?"}.
                </p>

                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {breakdown.contributions.map((contribution) => (
                    <div
                      key={contribution.id}
                      className="rounded-xl border border-slate-100/80 dark:border-white/5 bg-white/80 dark:bg-slate-900/50 p-3"
                    >
                      <div className="flex items-center justify-between text-[12px] font-medium">
                        <span>{contribution.label}</span>
                        <span>
                          {contribution.averageScore.toFixed(1)} /
                          {contribution.maxScore}
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 w-full rounded-full bg-slate-200/80 dark:bg-slate-800/80 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-sky-500"
                          style={{
                            width: `${Math.min(
                              100,
                              contribution.averageContributionPercent,
                            ).toFixed(1)}%`,
                          }}
                        />
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                        <span>Weight {Math.round(contribution.weightPercent)}%</span>
                        <span>
                          Avg {contribution.averageContributionPercent.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {breakdown.storyPointDistribution.length > 0 && (
                  <div className="mt-4">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Structured Story Points
                    </div>
                    <div className="mt-1 flex flex-wrap gap-2 text-[12px]">
                      {breakdown.storyPointDistribution.map((bucket) => (
                        <span
                          key={bucket.storyPoints}
                          className="px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                        >
                          <span className="font-semibold">
                            {bucket.storyPoints}pt
                          </span>
                          {" · "}
                          {bucket.count} vote
                          {bucket.count !== 1 ? "s" : ""} ({
                          bucket.percentage.toFixed(0)
                        }
                          %)
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {breakdown.conversionRules.length > 0 && (
                  <div className="mt-3 rounded-xl bg-amber-50/70 border border-amber-200/70 p-3 text-amber-800">
                    <div className="text-[11px] font-semibold uppercase tracking-wide">Conversion Rules applied</div>
                    <ul className="mt-1 space-y-1">
                      {breakdown.conversionRules.map((rule) => (
                        <li key={rule.rule}>
                          {rule.rule} – {rule.count} vote
                          {rule.count !== 1 ? "s" : ""} ({rule.percentage.toFixed(0)}%)
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});
