import { motion } from 'framer-motion';
import { useMemo, type JSX } from 'react';

import type {
  RoomData,
  RoomStats,
  SummaryCardSetting,
  VotingCriterion,
  CriteriaStats,
} from '../../types';
import { VoteDistribution } from './VoteDistribution';
import { CriteriaBreakdownStat } from './CriteriaBreakdown';
import { SurfaceCard } from '../ui/SurfaceCard';

interface UnifiedResultsProps {
  roomData: RoomData;
  stats: RoomStats;
  criteria?: VotingCriterion[];
}

export function UnifiedResults({
  roomData,
  stats,
  criteria,
}: UnifiedResultsProps) {
  const resultsDisplay = roomData.settings.resultsDisplay;

  const useConfiguredSummaryCards = Boolean(
    resultsDisplay?.summaryCards && resultsDisplay.summaryCards.length > 0
  );

  const summaryCardConfigs = useMemo((): SummaryCardSetting[] => {
    if (useConfiguredSummaryCards && resultsDisplay?.summaryCards) {
      return resultsDisplay.summaryCards.filter(
        (card) => card.enabled !== false
      );
    }

    return [
      {
        id: 'average',
        label: 'Average',
        enabled: roomData.settings.showAverage,
      },
      {
        id: 'mode',
        label: 'Most Common',
        enabled: roomData.settings.showMedian,
      },
      {
        id: 'topVotes',
        label: 'Top Votes',
        enabled: roomData.settings.showTopVotes,
      },
    ].filter((card) => card.enabled);
  }, [
    resultsDisplay?.summaryCards,
    roomData.settings.showAverage,
    roomData.settings.showMedian,
    roomData.settings.showTopVotes,
    useConfiguredSummaryCards,
  ]);

  const criteriaStats = useMemo((): (CriteriaStats & {
    maxScore: number;
  })[] => {
    if (!criteria || !roomData.structuredVotes) return [];

    const structuredVotes = Object.values(roomData.structuredVotes);
    if (structuredVotes.length === 0) return [];

    return criteria.map((criterion) => {
      const scores = structuredVotes
        .map((vote) => vote.criteriaScores[criterion.id])
        .filter((score) => score !== undefined);

      if (scores.length === 0) {
        return {
          criterionId: criterion.id,
          name: criterion.name,
          average: 0,
          min: 0,
          max: 0,
          variance: 0,
          consensus: 'low' as const,
          maxScore: criterion.maxScore,
        };
      }

      const average =
        scores.reduce((sum, score) => sum + score, 0) / scores.length;
      const min = Math.min(...scores);
      const max = Math.max(...scores);
      const variance = max - min;

      let consensus: 'high' | 'medium' | 'low';
      if (criterion.id === 'unknowns') {
        consensus = variance === 0 ? 'high' : variance === 1 ? 'medium' : 'low';
      } else {
        const relativeVariance = variance / criterion.maxScore;
        consensus =
          relativeVariance <= 0.25
            ? 'high'
            : relativeVariance <= 0.5
            ? 'medium'
            : 'low';
      }

      return {
        criterionId: criterion.id,
        name: criterion.name,
        average,
        min,
        max,
        variance,
        consensus,
        maxScore: criterion.maxScore,
      };
    });
  }, [roomData.structuredVotes, criteria]);

  const hasStructuredData = criteriaStats.length > 0;

  const topDistribution = useMemo(() => {
    const maxCount = roomData.settings.topVotesCount || 4;
    return Object.entries(stats.distribution)
      .filter(([_, count]) => count > 0)
      .sort(([_, a], [__, b]) => b - a)
      .slice(0, maxCount);
  }, [stats.distribution, roomData.settings.topVotesCount]);

  const summaryCardElements = useMemo(() => {
    return summaryCardConfigs
      .map((card, index) => {
        const delay = index * 0.05;
        switch (card.id) {
          case 'average': {
            if (!useConfiguredSummaryCards && !roomData.settings.showAverage)
              return null;
            return (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay }}
              >
                <SurfaceCard padding="sm" className="text-left">
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
          case 'mode': {
            if (!useConfiguredSummaryCards && !roomData.settings.showMedian)
              return null;
            return (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay }}
              >
                <SurfaceCard padding="sm" className="text-left">
                  <h4 className="mb-1 text-sm font-medium text-slate-500 dark:text-slate-300">
                    {card.label}
                  </h4>
                  <div className="text-3xl font-semibold text-brand-600 dark:text-brand-300">
                    {stats.mode || 'N/A'}
                  </div>
                </SurfaceCard>
              </motion.div>
            );
          }
          case 'topVotes': {
            if (!useConfiguredSummaryCards && !roomData.settings.showTopVotes)
              return null;
            if (!topDistribution || topDistribution.length === 0) return null;
            return (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay }}
              >
                <SurfaceCard padding="sm" className="space-y-2">
                  <h4 className="text-sm font-medium text-slate-500 dark:text-slate-300">
                    {card.label}
                  </h4>
                  <div className="flex flex-wrap items-center gap-2">
                    {topDistribution.map(([vote, count]) => {
                      const metadata =
                        roomData.settings.voteOptionsMetadata?.find(
                          (m) => m.value.toString() === vote
                        );
                      const background = metadata?.background || '#ebf5ff';

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
          default:
            return null;
        }
      })
      .filter((element): element is JSX.Element => element !== null);
  }, [
    summaryCardConfigs,
    topDistribution,
    roomData.settings.showAverage,
    roomData.settings.showMedian,
    roomData.settings.showTopVotes,
    stats.avg,
    stats.mode,
    useConfiguredSummaryCards,
    roomData.settings.voteOptionsMetadata,
  ]);

  const visibleStatsCount = summaryCardElements.length;

  const getGridCols = () => {
    if (visibleStatsCount === 0) return '';
    if (visibleStatsCount === 1) return 'grid-cols-1';
    if (visibleStatsCount === 2) return 'grid-cols-2';
    return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
  };

  const criteriaSettings = resultsDisplay?.criteriaBreakdown;
  const showCriteriaBreakdown =
    hasStructuredData && (criteriaSettings?.enabled ?? true);

  const showVoteDistributionSection =
    resultsDisplay?.showVoteDistribution ?? true;
  const voteDistributionLabel =
    resultsDisplay?.voteDistributionLabel ?? 'Vote Distribution';

  return (
    <div className="space-y-4">
      {visibleStatsCount > 0 && (
        <div className={`grid ${getGridCols()} gap-4`}>
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
                  className="space-y-3"
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
          <SurfaceCard padding="sm">
            <VoteDistribution roomData={roomData} stats={stats} />
          </SurfaceCard>
        </div>
      )}
    </div>
  );
}
