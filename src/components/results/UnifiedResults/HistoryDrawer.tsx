import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { RoomData } from '@/types';
import { useRoomHistory } from './hooks/useRoomHistory';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { useRoomContext } from '@/context/RoomContext';
import { useSessionContext } from '@/context/SessionContext';

interface HistoryDrawerProps {
  roomData: RoomData;
  isOpen: boolean;
  onClose: () => void;
}

export function HistoryDrawer({
  roomData,
  isOpen,
  onClose,
}: HistoryDrawerProps) {
  const { authToken } = useRoomContext();
  const { userName } = useSessionContext();
  const [filterTeam, setFilterTeam] = useState<string>('');
  const [filterPersona, setFilterPersona] = useState<string>('');

  const { snapshots, isLoading, stats } = useRoomHistory({
    roomKey: roomData.key,
    userName: userName || '',
    sessionToken: authToken || '',
    limit: 20,
    team: filterTeam || undefined,
    persona: filterPersona || undefined,
    enabled: isOpen && !!userName && !!authToken,
  });

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getConsensusBadgeColor = (level?: 'high' | 'medium' | 'low') => {
    switch (level) {
      case 'high':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'low':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const getTrendIcon = (trend?: 'improving' | 'stable' | 'declining') => {
    switch (trend) {
      case 'improving':
        return '📈';
      case 'declining':
        return '📉';
      default:
        return '📊';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/50"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 z-50 h-full w-full max-w-2xl overflow-y-auto bg-white shadow-xl dark:bg-slate-900"
          >
            <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                  Voting History
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                  aria-label="Close history drawer"
                >
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6">
              {isLoading && (
                <div className="flex items-center justify-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600 dark:border-slate-700 dark:border-t-blue-400" />
                </div>
              )}

              {!isLoading && stats && (
                <div className="space-y-6">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <SurfaceCard padding="sm" variant="subtle">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">
                          {stats.totalSessions}
                        </div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">
                          Total Sessions
                        </div>
                      </div>
                    </SurfaceCard>

                    <SurfaceCard padding="sm" variant="subtle">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">
                          {getTrendIcon(stats.consensusTrend)}{' '}
                          {stats.consensusTrend}
                        </div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">
                          Consensus Trend
                        </div>
                      </div>
                    </SurfaceCard>

                    <SurfaceCard padding="sm" variant="subtle">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">
                          Δ{stats.averageDelta.toFixed(1)}
                        </div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">
                          Avg Delta
                        </div>
                      </div>
                    </SurfaceCard>
                  </div>

                  {/* Regression Callouts */}
                  {stats.regressions.length > 0 && (
                    <div>
                      <h3 className="mb-3 text-lg font-semibold text-slate-900 dark:text-white">
                        ⚠️ Regression Analysis
                      </h3>
                      <div className="space-y-2">
                        {stats.regressions.map((regression) => (
                          <SurfaceCard
                            key={regression.index}
                            padding="sm"
                            className="border-l-4 border-orange-500"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="text-sm font-medium text-slate-900 dark:text-white">
                                  {regression.reason}
                                </div>
                                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                  {formatTimestamp(
                                    regression.snapshot.snapshotTimestamp
                                  )}
                                  {regression.snapshot.ticketId && (
                                    <span className="ml-2">
                                      · {regression.snapshot.ticketId}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <span
                                className={`ml-3 rounded-full px-2 py-1 text-xs font-medium ${getConsensusBadgeColor(
                                  regression.snapshot.consensusLevel
                                )}`}
                              >
                                {regression.snapshot.consensusLevel || 'N/A'}
                              </span>
                            </div>
                          </SurfaceCard>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Timeline */}
                  <div>
                    <h3 className="mb-3 text-lg font-semibold text-slate-900 dark:text-white">
                      Session Timeline
                    </h3>
                    <div className="space-y-3">
                      {snapshots.map((snapshot, index) => (
                        <motion.div
                          key={snapshot.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <SurfaceCard padding="sm" variant="subtle">
                            <div className="space-y-2">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-slate-900 dark:text-white">
                                      {snapshot.ticketId || 'Session'}
                                    </span>
                                    <span
                                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${getConsensusBadgeColor(
                                        snapshot.consensusLevel
                                      )}`}
                                    >
                                      {snapshot.consensusLevel || 'N/A'}
                                    </span>
                                  </div>
                                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                    {formatTimestamp(snapshot.snapshotTimestamp)}
                                  </div>
                                </div>
                                <div className="text-right">
                                  {snapshot.averageVote !== undefined && (
                                    <div className="text-sm font-semibold text-slate-900 dark:text-white">
                                      Avg: {snapshot.averageVote.toFixed(1)}
                                    </div>
                                  )}
                                  {snapshot.medianVote && (
                                    <div className="text-xs text-slate-500 dark:text-slate-400">
                                      Med: {snapshot.medianVote}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Vote Distribution */}
                              {Object.keys(snapshot.voteDistribution).length >
                                0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {Object.entries(snapshot.voteDistribution).map(
                                    ([vote, count]) => (
                                      <span
                                        key={vote}
                                        className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                      >
                                        {vote}: {count}
                                      </span>
                                    )
                                  )}
                                </div>
                              )}

                              {/* Metadata Tags */}
                              {(snapshot.team ||
                                snapshot.persona ||
                                snapshot.sprintId) && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {snapshot.team && (
                                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                      👥 {snapshot.team}
                                    </span>
                                  )}
                                  {snapshot.persona && (
                                    <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                                      🎭 {snapshot.persona}
                                    </span>
                                  )}
                                  {snapshot.sprintId && (
                                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800 dark:bg-green-900 dark:text-green-200">
                                      🏃 {snapshot.sprintId}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </SurfaceCard>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {snapshots.length === 0 && (
                    <div className="py-8 text-center text-slate-500 dark:text-slate-400">
                      No voting history available yet. Vote on some tickets to
                      start building history!
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
