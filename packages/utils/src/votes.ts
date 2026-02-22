import type { VoteOptionMetadata, VotingCriterion } from '@sprintjam/types';

import { generateColorFromValue, generateColorFromString } from './colors';
import { SPECIAL_COLORS } from './config/constants';
import { getTaskSize } from './tasks';

export function generateVoteOptionsMetadata(
  options: (string | number)[],
): VoteOptionMetadata[] {
  const numericValues = options
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));
  const maxValue = numericValues.length > 0 ? Math.max(...numericValues) : 34;

  return options.map((value) => {
    let background: string;
    const stringValue = String(value);

    if (SPECIAL_COLORS[stringValue]) {
      background = SPECIAL_COLORS[stringValue];
    } else if (!Number.isNaN(Number(value))) {
      background = generateColorFromValue(Number(value), maxValue);
    } else {
      background = generateColorFromString(stringValue);
    }

    const taskSize = getTaskSize(value);

    return {
      value,
      background,
      taskSize,
    };
  });
}

export function getDefaultVotingCriteria(): VotingCriterion[] {
  return [
    {
      id: 'complexity',
      name: 'Complexity',
      description:
        'Level of logic and coordination (0: same app, 2: cross repo, 4: cross team)',
      minScore: 0,
      maxScore: 4,
    },
    {
      id: 'confidence',
      name: 'Individual Confidence',
      description:
        'Your confidence in this area (0: no confidence, 4: very confident)',
      minScore: 0,
      maxScore: 4,
    },
    {
      id: 'volume',
      name: 'Volume',
      description: 'Amount of work required (0: minimal, 4: extensive)',
      minScore: 0,
      maxScore: 4,
    },
    {
      id: 'unknowns',
      name: 'Unknowns',
      description: 'Implementation unknowns (0: none, 1: some, 2: too many)',
      minScore: 0,
      maxScore: 2,
    },
  ];
}
