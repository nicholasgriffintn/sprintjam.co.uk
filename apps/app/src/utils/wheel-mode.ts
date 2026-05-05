import type { WheelMode } from "@sprintjam/types";
import { getWorkspaceWheelModeResultLabel } from "@sprintjam/utils";

export const WHEEL_MODE_OPTIONS: Array<{
  value: WheelMode;
  label: string;
  description: string;
  resultLabel: string;
}> = [
  {
    value: "decision",
    label: "Decision",
    description:
      "Record a team choice that can be shared to Slack or Teams and attached to linked work.",
    resultLabel: getWorkspaceWheelModeResultLabel("decision"),
  },
  {
    value: "speaker_order",
    label: "Speaker order",
    description:
      "Build a facilitation queue for linked planning or standup sessions.",
    resultLabel: getWorkspaceWheelModeResultLabel("speaker_order"),
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
