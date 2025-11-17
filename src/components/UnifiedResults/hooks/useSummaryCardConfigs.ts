import { useMemo } from 'react';

import type {
  ResultsDisplaySettings,
  RoomData,
  SummaryCardSetting,
} from '../../../types';

const judgeSuppressedCards = new Set([
  'participation',
  'consensusHealth',
  'nextStep',
]);

export function useSummaryCardConfigs(
  roomData: RoomData,
  resultsDisplay: ResultsDisplaySettings | undefined,
  hasStructuredData: boolean
) {
  const useConfiguredSummaryCards = Boolean(
    resultsDisplay?.summaryCards && resultsDisplay.summaryCards.length > 0
  );
  const judgeEnabled = roomData.settings.enableJudge;

  const summaryCardConfigs = useMemo((): SummaryCardSetting[] => {
    if (useConfiguredSummaryCards && resultsDisplay?.summaryCards) {
      return resultsDisplay.summaryCards
        .filter((card) => card.enabled !== false)
        .filter((card) =>
          judgeEnabled ? !judgeSuppressedCards.has(card.id) : true
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
      {
        id: 'participation',
        label: 'Participation',
        enabled: !judgeEnabled,
      },
      {
        id: 'consensusHealth',
        label: 'Consensus Health',
        enabled: hasStructuredData && !judgeEnabled,
      },
      {
        id: 'nextStep',
        label: 'Suggested Next Step',
        enabled: !judgeEnabled,
      },
    ].filter((card) => card.enabled);
  }, [
    resultsDisplay?.summaryCards,
    roomData.settings.showAverage,
    roomData.settings.showMedian,
    roomData.settings.showTopVotes,
    useConfiguredSummaryCards,
    hasStructuredData,
    judgeEnabled,
  ]);

  return { summaryCardConfigs, useConfiguredSummaryCards };
}
