import type { SpinResult } from "@sprintjam/types";

import { csvEscape } from "@/utils/csv";

export function buildWheelResultsText(results: SpinResult[]) {
  if (results.length === 0) {
    return "No wheel results yet.";
  }

  return [...results]
    .reverse()
    .map((result, index) => {
      const spinNumber = results.length - index;
      const removed = result.removedAfter ? " removed after spin" : "";
      return `${spinNumber}. ${result.winner}${removed}`;
    })
    .join("\n");
}

export function buildWheelResultsCsv(results: SpinResult[]) {
  const rows = [
    ["Spin", "Winner", "Removed after spin", "Timestamp"],
    ...results.map((result, index) => [
      index + 1,
      result.winner,
      result.removedAfter ? "Yes" : "No",
      new Date(result.timestamp).toISOString(),
    ]),
  ];

  return rows.map((row) => row.map(csvEscape).join(",")).join("\n");
}
