import type { RoomSettings } from "../types";
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

  if (settingsUpdate?.estimateOptions || settingsUpdate?.customEstimateOptions) {
    const customOptions =
      settingsUpdate.customEstimateOptions ?? settingsUpdate.estimateOptions;

    mergedSettings.votingSequenceId = "custom";
    mergedSettings.customEstimateOptions = customOptions;
  }

  return getDefaultRoomSettings(mergedSettings);
}
