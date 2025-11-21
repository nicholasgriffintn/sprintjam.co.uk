import { useCallback, useMemo, useState } from "react";

import type { RoomData, RoomStats } from "../../../types";
import type { VoteDistributionViewMode } from "../VoteDistribution";
import { downloadCsv } from '../../../utils/csv';

const VIEW_OPTIONS: { id: VoteDistributionViewMode; label: string }[] = [
  { id: 'count', label: 'Votes' },
  { id: 'percentage', label: 'Percent' },
  { id: 'cumulative', label: 'Cumulative' },
];

export function useVoteDistributionControls(
  roomData: RoomData,
  stats: RoomStats
) {
  const [distributionView, setDistributionView] =
    useState<VoteDistributionViewMode>('count');

  const distributionViewOptions = useMemo(() => VIEW_OPTIONS, []);

  const handleExportDistribution = useCallback(() => {
    if (typeof window === 'undefined') return;

    const rows = [['Vote', 'Count', 'Percentage']];
    const total = stats.totalVotes || roomData.users.length || 1;
    roomData.settings.estimateOptions.forEach((option) => {
      const count = stats.distribution[option] || 0;
      const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0';
      rows.push([String(option), String(count), `${percentage}%`]);
    });

    const csvContent = rows.map((row) => row.join(',')).join('\n');

    downloadCsv(`vote_distribution_${roomData.key}.csv`, csvContent);
  }, [
    roomData.key,
    roomData.settings.estimateOptions,
    roomData.users.length,
    stats.distribution,
    stats.totalVotes,
  ]);

  return {
    distributionView,
    setDistributionView,
    distributionViewOptions,
    handleExportDistribution,
  };
}
