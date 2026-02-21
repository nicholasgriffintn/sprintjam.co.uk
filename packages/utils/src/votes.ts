import type { VoteOptionMetadata } from "@sprintjam/types";

import { generateColorFromValue, generateColorFromString } from "./colors";
import { SPECIAL_COLORS } from "./config/constants";
import { getTaskSize } from "./tasks";

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
