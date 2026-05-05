import type { SpinResult, WheelMode } from "@sprintjam/types";

import { csvEscape } from "@/utils/csv";
import { getWheelModeOption } from "@/utils/wheel-mode";

export function buildWheelResultsText(results: SpinResult[], mode?: WheelMode) {
  if (results.length === 0) {
    return "No wheel results yet.";
  }

  const modeOption = getWheelModeOption(mode);

  return [...results]
    .reverse()
    .map((result, index) => {
      const spinNumber = results.length - index;
      const removed = result.removedAfter ? " removed after spin" : "";
      return `${modeOption.resultLabel} ${spinNumber}: ${result.winner}${removed}`;
    })
    .join("\n");
}

export function buildWheelResultsCsv(results: SpinResult[], mode?: WheelMode) {
  const modeOption = getWheelModeOption(mode);
  const rows = [
    ["Spin", modeOption.resultLabel, "Mode", "Removed after spin", "Timestamp"],
    ...results.map((result, index) => [
      index + 1,
      result.winner,
      modeOption.label,
      result.removedAfter ? "Yes" : "No",
      new Date(result.timestamp).toISOString(),
    ]),
  ];

  return rows.map((row) => row.map(csvEscape).join(",")).join("\n");
}
