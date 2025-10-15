import { motion } from 'framer-motion';
import { useMemo, type JSX } from 'react';

import type {
  RoomData,
  RoomStats,
  SummaryCardSetting,
  VotingCriterion,
} from '../types';
import { VoteDistribution } from './VoteDistribution';

interface UnifiedResultsProps {
  roomData: RoomData;
  stats: RoomStats;
  criteria?: VotingCriterion[];
}

interface CriteriaStats {
  criterionId: string;
  name: string;
  average: number;
  min: number;
  max: number;
  variance: number;
  consensus: 'high' | 'medium' | 'low';
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
                className="bg-white border border-gray-200 rounded-lg p-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay }}
              >
                <h4 className="text-sm font-medium text-gray-500 mb-1">
                  {card.label}
                </h4>
                <div className="text-2xl font-bold text-blue-600">
                  {stats.avg}
                </div>
              </motion.div>
            );
          }
          case 'mode': {
            if (!useConfiguredSummaryCards && !roomData.settings.showMedian)
              return null;
            return (
              <motion.div
                key={card.id}
                className="bg-white border border-gray-200 rounded-lg p-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay }}
              >
                <h4 className="text-sm font-medium text-gray-500 mb-1">
                  {card.label}
                </h4>
                <div className="text-2xl font-bold text-blue-600">
                  {stats.mode || 'N/A'}
                </div>
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
                className="bg-white border border-gray-200 rounded-lg p-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay }}
              >
                <h4 className="text-sm font-medium text-gray-500 mb-1">
                  {card.label}
                </h4>
                <div className="flex gap-2 items-center flex-wrap">
                  {topDistribution.map(([vote, count]) => {
                    const metadata =
                      roomData.settings.voteOptionsMetadata?.find(
                        (m) => m.value.toString() === vote
                      );
                    const background = metadata?.background || '#ebf5ff';

                    return (
                      <div key={vote} className="flex items-center gap-1">
                        <div
                          className="w-6 h-6 flex items-center justify-center text-xs font-medium rounded"
                          style={{ backgroundColor: background }}
                        >
                          {vote}
                        </div>
                        <span className="text-xs text-gray-600">×{count}</span>
                      </div>
                    );
                  })}
                </div>
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
  const consensusLabels = {
    high: criteriaSettings?.consensusLabels?.high ?? 'Consensus',
    medium: criteriaSettings?.consensusLabels?.medium ?? 'Some Split',
    low: criteriaSettings?.consensusLabels?.low ?? 'Wide Split',
  };

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
          <h3 className="mb-3 text-sm font-medium text-gray-500">
            {criteriaSettings?.title ?? 'Criteria Breakdown'}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {criteriaStats.map((stat) => (
              <motion.div
                key={stat.criterionId}
                className="bg-white border border-gray-200 rounded-lg p-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.3,
                  delay: criteriaStats.indexOf(stat) * 0.05,
                }}
              >
                <div className="flex flex-wrap justify-between items-start gap-2 mb-2">
                  <h4
                    className="font-medium text-gray-900 flex-1 min-w-0"
                    title={stat.name}
                  >
                    {stat.name}
                  </h4>
                  <span
                    className={`px-2 py-1 text-xs rounded-full whitespace-nowrap flex-shrink-0 ${
                      stat.consensus === 'high'
                        ? 'bg-green-100 text-green-800'
                        : stat.consensus === 'medium'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {stat.consensus === 'high'
                      ? consensusLabels.high
                      : stat.consensus === 'medium'
                      ? consensusLabels.medium
                      : consensusLabels.low}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center text-sm gap-2">
                    <span className="text-gray-600 flex-shrink-0">
                      Average:
                    </span>
                    <span className="font-medium">
                      {stat.average.toFixed(1)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm gap-2">
                    <span className="text-gray-600 flex-shrink-0">Range:</span>
                    <span className="text-gray-800">
                      {stat.min} - {stat.max}
                    </span>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1 px-0.5">
                    <span>0</span>
                    <span>{stat.maxScore}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 relative min-w-0">
                    <div
                      className="h-2 rounded-full bg-blue-200 absolute"
                      style={{
                        left: `${(stat.min / stat.maxScore) * 100}%`,
                        width: `${
                          ((stat.max - stat.min) / stat.maxScore) * 100
                        }%`,
                      }}
                    />
                    <div
                      className="absolute w-1 h-4 bg-blue-600 rounded-full -mt-1"
                      style={{
                        left: `${(stat.average / stat.maxScore) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {showVoteDistributionSection && (
        <div>
          <h3 className="mb-3 text-sm font-medium text-gray-500">
            {voteDistributionLabel}
          </h3>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <VoteDistribution roomData={roomData} stats={stats} />
          </div>
        </div>
      )}
    </div>
  );
}
