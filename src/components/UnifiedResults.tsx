import { motion } from 'framer-motion';
import { useMemo } from 'react';

import type { RoomData, RoomStats, VotingCriterion } from '../types';
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

export function UnifiedResults({ roomData, stats, criteria }: UnifiedResultsProps) {
  const criteriaStats = useMemo((): CriteriaStats[] => {
    if (!criteria || !roomData.structuredVotes) return [];
    
    const structuredVotes = Object.values(roomData.structuredVotes);
    if (structuredVotes.length === 0) return [];

    return criteria.map(criterion => {
      const scores = structuredVotes
        .map(vote => vote.criteriaScores[criterion.id])
        .filter(score => score !== undefined);

      if (scores.length === 0) {
        return {
          criterionId: criterion.id,
          name: criterion.name,
          average: 0,
          min: 0,
          max: 0,
          variance: 0,
          consensus: 'low' as const
        };
      }

      const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      const min = Math.min(...scores);
      const max = Math.max(...scores);
      const variance = max - min;
      
      const consensus = variance <= 1 ? 'high' : variance <= 2 ? 'medium' : 'low';

      return {
        criterionId: criterion.id,
        name: criterion.name,
        average,
        min,
        max,
        variance,
        consensus
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

  const visibleStatsCount = useMemo(() => {
    let count = 0;
    if (roomData.settings.showAverage) count++;
    if (roomData.settings.showMedian) count++;
    if (roomData.settings.showTopVotes) count++;
    return count;
  }, [roomData.settings.showAverage, roomData.settings.showMedian, roomData.settings.showTopVotes]);

  const getGridCols = () => {
    if (visibleStatsCount === 0) return '';
    if (visibleStatsCount === 1) return 'grid-cols-1';
    if (visibleStatsCount === 2) return 'grid-cols-2';
    return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
  };

  return (
    <div className="space-y-4">
      {visibleStatsCount > 0 && (
        <div className={`grid ${getGridCols()} gap-4`}>
        {roomData.settings.showAverage && (
          <motion.div
            className="bg-white border border-gray-200 rounded-lg p-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <h4 className="text-sm font-medium text-gray-500 mb-1">Average</h4>
            <div className="text-2xl font-bold text-blue-600">{stats.avg}</div>
          </motion.div>
        )}
        
        {roomData.settings.showMedian && (
          <motion.div
            className="bg-white border border-gray-200 rounded-lg p-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
          >
            <h4 className="text-sm font-medium text-gray-500 mb-1">Most Common</h4>
            <div className="text-2xl font-bold text-blue-600">{stats.mode || 'N/A'}</div>
          </motion.div>
        )}

        {roomData.settings.showTopVotes && (
          <motion.div
            className="bg-white border border-gray-200 rounded-lg p-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <h4 className="text-sm font-medium text-gray-500 mb-1">Top Votes</h4>
            <div className="flex gap-2 items-center">
              {topDistribution.map(([vote, count]) => {
                const metadata = roomData.settings.voteOptionsMetadata?.find(m => m.value.toString() === vote);
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
        )}
        </div>
      )}

      {hasStructuredData && (
        <div>
          <h3 className="mb-3 text-sm font-medium text-gray-500">Criteria Breakdown</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {criteriaStats.map((stat) => (
              <motion.div
                key={stat.criterionId}
                className="bg-white border border-gray-200 rounded-lg p-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: criteriaStats.indexOf(stat) * 0.05 }}
              >
                <div className="flex flex-wrap justify-between items-start gap-2 mb-2">
                  <h4 className="font-medium text-gray-900 flex-1 min-w-0" title={stat.name}>
                    {stat.name}
                  </h4>
                  <span className={`px-2 py-1 text-xs rounded-full whitespace-nowrap flex-shrink-0 ${
                    stat.consensus === 'high' ? 'bg-green-100 text-green-800' :
                    stat.consensus === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {stat.consensus === 'high' ? 'Consensus' : 
                     stat.consensus === 'medium' ? 'Some Split' : 'Wide Split'}
                  </span>
                </div>
                
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-sm gap-2">
                    <span className="text-gray-600 flex-shrink-0">Average:</span>
                    <span className="font-medium">{stat.average.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm gap-2">
                    <span className="text-gray-600 flex-shrink-0">Range:</span>
                    <span className="text-gray-800">{stat.min} - {stat.max}</span>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1 px-0.5">
                    <span>0</span>
                    <span>5</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 relative min-w-0">
                    <div 
                      className="h-2 rounded-full bg-blue-200 absolute"
                      style={{
                        left: `${(stat.min / 5) * 100}%`,
                        width: `${((stat.max - stat.min) / 5) * 100}%`
                      }}
                    />
                    <div 
                      className="absolute w-1 h-4 bg-blue-600 rounded-full -mt-1"
                      style={{
                        left: `${(stat.average / 5) * 100}%`
                      }}
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="mb-3 text-sm font-medium text-gray-500">Vote Distribution</h3>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <VoteDistribution roomData={roomData} stats={stats} />
        </div>
      </div>
    </div>
  );
}
