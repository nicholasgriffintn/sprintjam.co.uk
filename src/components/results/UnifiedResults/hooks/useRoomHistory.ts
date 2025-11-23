import { useQuery } from '@tanstack/react-query';
import type { RoomSnapshot } from '@/types';

interface UseRoomHistoryOptions {
  roomKey: string;
  userName: string;
  sessionToken: string;
  limit?: number;
  offset?: number;
  workspaceId?: string;
  team?: string;
  persona?: string;
  sprintId?: string;
  enabled?: boolean;
}

interface HistoryStats {
  averageDelta: number;
  consensusTrend: 'improving' | 'stable' | 'declining';
  totalSessions: number;
  regressions: Array<{
    index: number;
    snapshot: RoomSnapshot;
    reason: string;
  }>;
}

export function useRoomHistory(options: UseRoomHistoryOptions) {
  const {
    roomKey,
    userName,
    sessionToken,
    limit = 20,
    offset = 0,
    workspaceId,
    team,
    persona,
    sprintId,
    enabled = true,
  } = options;

  const query = useQuery({
    queryKey: [
      'room-history',
      roomKey,
      limit,
      offset,
      workspaceId,
      team,
      persona,
      sprintId,
    ],
    queryFn: async (): Promise<RoomSnapshot[]> => {
      const params = new URLSearchParams({
        roomKey,
        userName,
        sessionToken,
        limit: String(limit),
        offset: String(offset),
      });

      if (workspaceId) params.set('workspaceId', workspaceId);
      if (team) params.set('team', team);
      if (persona) params.set('persona', persona);
      if (sprintId) params.set('sprintId', sprintId);

      const response = await fetch(
        `/api/rooms/${roomKey}/snapshots?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch room history');
      }

      const data = await response.json();
      return data.snapshots || [];
    },
    enabled: enabled && !!roomKey && !!userName && !!sessionToken,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });

  const stats: HistoryStats | null = query.data
    ? calculateHistoryStats(query.data)
    : null;

  return {
    snapshots: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    stats,
    refetch: query.refetch,
  };
}

function calculateHistoryStats(snapshots: RoomSnapshot[]): HistoryStats {
  if (snapshots.length === 0) {
    return {
      averageDelta: 0,
      consensusTrend: 'stable',
      totalSessions: 0,
      regressions: [],
    };
  }

  // Calculate average delta between consecutive sessions
  const deltas: number[] = [];
  for (let i = 1; i < snapshots.length; i++) {
    const current = snapshots[i];
    const previous = snapshots[i - 1];

    if (current.averageVote !== undefined && previous.averageVote !== undefined) {
      deltas.push(Math.abs(current.averageVote - previous.averageVote));
    }
  }

  const averageDelta =
    deltas.length > 0 ? deltas.reduce((a, b) => a + b, 0) / deltas.length : 0;

  // Determine consensus trend
  const recentSnapshots = snapshots.slice(0, Math.min(5, snapshots.length));
  const consensusLevels = recentSnapshots
    .map((s) => s.consensusLevel)
    .filter((c): c is 'high' | 'medium' | 'low' => !!c);

  let consensusTrend: 'improving' | 'stable' | 'declining' = 'stable';
  if (consensusLevels.length >= 2) {
    const levelScore = (level: 'high' | 'medium' | 'low') => {
      switch (level) {
        case 'high':
          return 3;
        case 'medium':
          return 2;
        case 'low':
          return 1;
      }
    };

    const recentScore = levelScore(consensusLevels[0]);
    const oldestScore = levelScore(consensusLevels[consensusLevels.length - 1]);

    if (recentScore > oldestScore) {
      consensusTrend = 'improving';
    } else if (recentScore < oldestScore) {
      consensusTrend = 'declining';
    }
  }

  // Identify regressions (sudden drops in consensus or large deltas)
  const regressions: HistoryStats['regressions'] = [];
  for (let i = 1; i < snapshots.length; i++) {
    const current = snapshots[i];
    const previous = snapshots[i - 1];

    // Regression if consensus drops from high to low
    if (
      previous.consensusLevel === 'high' &&
      current.consensusLevel === 'low'
    ) {
      regressions.push({
        index: i,
        snapshot: current,
        reason: 'Consensus dropped from high to low',
      });
    }

    // Regression if average vote delta is very large
    if (
      current.averageVote !== undefined &&
      previous.averageVote !== undefined
    ) {
      const delta = Math.abs(current.averageVote - previous.averageVote);
      if (delta > 5) {
        regressions.push({
          index: i,
          snapshot: current,
          reason: `Large voting change (Δ${delta.toFixed(1)})`,
        });
      }
    }
  }

  return {
    averageDelta,
    consensusTrend,
    totalSessions: snapshots.length,
    regressions,
  };
}
