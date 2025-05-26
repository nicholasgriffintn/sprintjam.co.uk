import { generateColorFromValue, generateColorFromString } from './colors'
import { SPECIAL_COLORS } from '../constants'
import { getTaskSize } from './tasks'
import type { VoteOptionMetadata } from '../types'

/**
 * Generates metadata for vote options including background colors and task sizes
 */
export function generateVoteOptionsMetadata(options: (string | number)[]): VoteOptionMetadata[] {
  const numericValues = options.filter(value => !isNaN(Number(value))).map(value => Number(value));
  const maxValue = (numericValues.length > 0 ? Math.max(...numericValues) : 34);

  return options.map(value => {
    let background: string;
    const stringValue = String(value);

    if (SPECIAL_COLORS[stringValue]) {
      background = SPECIAL_COLORS[stringValue];
    }
    else if (!isNaN(Number(value))) {
      background = generateColorFromValue(Number(value), maxValue);
    }
    else {
      background = generateColorFromString(stringValue);
    }

    const taskSize = getTaskSize(value);

    return {
      value,
      background,
      taskSize
    };
  });
}