import { useMemo } from "react";
import type { VotingCriterion } from "@sprintjam/types";

import type { RoomData, RoomStats } from "@/types";
import { VoteDistribution } from "./VoteDistribution";
import { CriteriaBreakdown } from "./CriteriaBreakdown";
import { useCriteriaStats } from "./hooks/useCriteriaStats";
import { useSummaryCardConfigs } from "./hooks/useSummaryCardConfigs";
import { useSummaryCards } from "./hooks/useSummaryCards";
import { useJudgeAnimation } from "./hooks/useJudgeAnimation";
import {
  buildConsensusSummary,
  buildRecommendation,
  calculateParticipationRate,
  getGridCols,
  getTopDistribution,
} from "./utils";
import { JudgeResult } from "./JudgeResult";

interface UnifiedResultsProps {
  roomData: RoomData;
  stats: RoomStats;
  criteria?: VotingCriterion[];
  displayJudge?: boolean;
  showVotes?: boolean;
}

export function UnifiedResults({
  roomData,
  stats,
  criteria,
  displayJudge = false,
  showVotes = false,
}: UnifiedResultsProps) {
  const showJudgeAnimation = useJudgeAnimation(roomData);

  const resultsDisplay = roomData.settings.resultsDisplay;
  const criteriaStats = useCriteriaStats(roomData, criteria);
  const hasStructuredData = criteriaStats.length > 0;
  const { summaryCardConfigs, useConfiguredSummaryCards } =
    useSummaryCardConfigs(
      roomData,
      resultsDisplay,
      hasStructuredData,
      stats.isNumericScale,
    );
  const topDistribution = useMemo(
    () => getTopDistribution(stats, roomData),
    [stats.distribution, roomData.settings.topVotesCount],
  );
  const participationRate = useMemo(
    () => calculateParticipationRate(stats, roomData),
    [stats.votedUsers, stats.totalUsers, roomData.users.length],
  );

  const consensusSummary = useMemo(
    () => buildConsensusSummary(criteriaStats, roomData.judgeMetadata),
    [criteriaStats, roomData.judgeMetadata],
  );

  const recommendation = useMemo(
    () =>
      buildRecommendation({
        participationRate,
        consensusLevel: consensusSummary.level,
        needsDiscussion: consensusSummary.needsDiscussion,
      }),
    [
      participationRate,
      consensusSummary.level,
      consensusSummary.needsDiscussion,
    ],
  );
  const { summaryCardElements, visibleStatsCount } = useSummaryCards({
    summaryCardConfigs,
    useConfiguredSummaryCards,
    roomData,
    stats,
    topDistribution,
    participationRate,
    consensusSummary,
    recommendation,
    hasStructuredData,
  });

  const criteriaSettings = resultsDisplay?.criteriaBreakdown;
  const showCriteriaBreakdown =
    hasStructuredData && (criteriaSettings?.enabled ?? true);

  const showVoteDistributionSection =
    resultsDisplay?.showVoteDistribution ?? true;
  const canShowJudge = displayJudge && showVotes && stats.isNumericScale;

  return (
    <>
      {canShowJudge && (
        <JudgeResult
          roomData={roomData}
          stats={stats}
          showJudgeAnimation={showJudgeAnimation}
        />
      )}

      <div
        className="space-y-4"
        data-testid="vote-results"
        id="vote-results-region"
        role="region"
        aria-live="polite"
        aria-atomic="false"
        aria-label="Voting results"
      >
        {visibleStatsCount > 0 && (
          <div className={`grid ${getGridCols(visibleStatsCount)} gap-4`}>
            {summaryCardElements}
          </div>
        )}

        {showCriteriaBreakdown && (
          <CriteriaBreakdown
            criteriaStats={criteriaStats}
            criteriaSettings={criteriaSettings}
          />
        )}

        {showVoteDistributionSection && (
          <VoteDistribution roomData={roomData} stats={stats} />
        )}
      </div>
    </>
  );
}
