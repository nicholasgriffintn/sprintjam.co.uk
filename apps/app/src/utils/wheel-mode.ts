import type { WheelMode } from "@sprintjam/types";
import { getWorkspaceWheelModeResultLabel } from "@sprintjam/utils";

export const WHEEL_MODE_OPTIONS: Array<{
  value: WheelMode;
  label: string;
  description: string;
  resultLabel: string;
}> = [
  {
    value: "facilitator",
    label: "Facilitator",
    description:
      "Choose a facilitator to kick off the meeting, spin the wheel a few times to determine the order.",
    resultLabel: getWorkspaceWheelModeResultLabel("facilitator"),
  },
  {
    value: "decision",
    label: "Decision",
    description: "Record a team decision or outcome.",
    resultLabel: getWorkspaceWheelModeResultLabel("decision"),
  },
  {
    value: "reviewer",
    label: "Reviewer",
    description:
      "Choose a reviewer for a linked Jira, Linear, or GitHub item.",
    resultLabel: getWorkspaceWheelModeResultLabel("reviewer"),
  },
];

const DEFAULT_WHEEL_MODE_OPTION = WHEEL_MODE_OPTIONS[0];

export function getWheelModeOption(mode?: WheelMode) {
  return (
    WHEEL_MODE_OPTIONS.find((option) => option.value === mode) ??
    DEFAULT_WHEEL_MODE_OPTION
  );
}
