import { motion } from 'framer-motion';
import { useMemo } from 'react';

import type { RoomData, RoomStats, VotingCriterion } from '../../types';
import { VoteDistribution } from './VoteDistribution';
import { CriteriaBreakdownStat } from './CriteriaBreakdown';
import { SurfaceCard } from '../ui/SurfaceCard';
import { useCriteriaStats } from './hooks/useCriteriaStats';
import { useSummaryCardConfigs } from './hooks/useSummaryCardConfigs';
import { useSummaryCards } from './hooks/useSummaryCards';
import { useVoteDistributionControls } from './hooks/useVoteDistributionControls';
import { useJudgeAnimation } from './hooks/useJudgeAnimation';
import {
  buildConsensusSummary,
  buildRecommendation,
  calculateParticipationRate,
  getGridCols,
  getTopDistribution,
} from './utils';
import { JudgeResult } from './JudgeResult';

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
    useSummaryCardConfigs(roomData, resultsDisplay, hasStructuredData);
  const topDistribution = useMemo(
    () => getTopDistribution(stats, roomData),
    [stats.distribution, roomData.settings.topVotesCount]
  );
  const participationRate = useMemo(
    () => calculateParticipationRate(stats, roomData),
    [stats.votedUsers, stats.totalUsers, roomData.users.length]
  );

  const consensusSummary = useMemo(
    () => buildConsensusSummary(criteriaStats, roomData.judgeMetadata),
    [criteriaStats, roomData.judgeMetadata]
  );

  const recommendation = useMemo(
    () =>
      buildRecommendation({
        participationRate,
        consensusLevel: consensusSummary.level,
        needsDiscussion: consensusSummary.needsDiscussion,
      }),
    [participationRate, consensusSummary.level, consensusSummary.needsDiscussion]
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
  const {
    distributionView,
    setDistributionView,
    distributionViewOptions,
    handleExportDistribution,
  } = useVoteDistributionControls(roomData, stats);

  const criteriaSettings = resultsDisplay?.criteriaBreakdown;
  const showCriteriaBreakdown =
    hasStructuredData && (criteriaSettings?.enabled ?? true);

  const showVoteDistributionSection =
    resultsDisplay?.showVoteDistribution ?? true;
  const voteDistributionLabel =
    resultsDisplay?.voteDistributionLabel ?? 'Vote Distribution';

  return (
    <>
      {displayJudge && showVotes && (
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
          <div>
            <h3 className="mb-3 text-sm font-medium text-slate-500 dark:text-slate-300">
              {criteriaSettings?.title ?? 'Criteria Breakdown'}
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {criteriaStats.map((stat) => (
                <motion.div
                  key={stat.criterionId}
                  className="h-full"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.3,
                    delay: criteriaStats.indexOf(stat) * 0.05,
                  }}
                >
                  <SurfaceCard
                    padding="sm"
                    variant="subtle"
                    className="flex h-full flex-col"
                  >
                    <CriteriaBreakdownStat
                      stat={stat}
                      criteriaSettings={criteriaSettings}
                    />
                  </SurfaceCard>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {showVoteDistributionSection && (
          <div>
            <h3 className="mb-3 text-sm font-medium text-slate-500 dark:text-slate-300">
              {voteDistributionLabel}
            </h3>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div
                className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 text-sm dark:bg-slate-800"
                role="group"
                aria-label="Vote distribution view"
                data-testid="distribution-view-toggle-group"
              >
                {distributionViewOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setDistributionView(option.id)}
                    className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                      distributionView === option.id
                        ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                        : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                    }`}
                    aria-pressed={distributionView === option.id}
                    data-testid={`distribution-view-option-${option.id}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={handleExportDistribution}
                className="inline-flex items-center rounded-md border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Export CSV
              </button>
            </div>
            <SurfaceCard padding="sm">
              <VoteDistribution
                roomData={roomData}
                stats={stats}
                viewMode={distributionView}
              />
            </SurfaceCard>
          </div>
        )}
      </div>
    </>
  );
}
