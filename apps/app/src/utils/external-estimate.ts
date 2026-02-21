import type { VoteValue } from "@/types";

const IGNORED_ESTIMATE_VALUES = new Set(["?", "❓", "coffee", "☕", "♾️"]);

export function convertVoteValueToEstimate(
  voteValue: VoteValue | null,
): number | null {
  if (voteValue === null || IGNORED_ESTIMATE_VALUES.has(String(voteValue))) {
    return null;
  }

  const numericValue =
    typeof voteValue === "number" ? voteValue : Number(voteValue);

  return Number.isNaN(numericValue) ? null : numericValue;
}
