import type { RoomSettings } from "@sprintjam/types";

import { getDefaultRoomSettings } from "./defaults";

export function applySettingsUpdate({
  currentSettings,
  settingsUpdate,
}: {
  currentSettings?: RoomSettings;
  settingsUpdate?: Partial<RoomSettings>;
}): RoomSettings {
  const mergedSettings: Partial<RoomSettings> = {
    ...(currentSettings ?? {}),
    ...(settingsUpdate ?? {}),
  };

  const hasExplicitSequence = settingsUpdate?.votingSequenceId !== undefined;

  if (
    settingsUpdate?.estimateOptions ||
    settingsUpdate?.customEstimateOptions
  ) {
    const customOptions =
      settingsUpdate.customEstimateOptions ??
      settingsUpdate.estimateOptions ??
      mergedSettings.customEstimateOptions;

    if (!hasExplicitSequence && customOptions) {
      mergedSettings.votingSequenceId = "custom";
    }

    if (
      mergedSettings.votingSequenceId === "custom" ||
      settingsUpdate?.votingSequenceId === "custom"
    ) {
      mergedSettings.customEstimateOptions = customOptions;
    }
  }

  return getDefaultRoomSettings(mergedSettings);
}
