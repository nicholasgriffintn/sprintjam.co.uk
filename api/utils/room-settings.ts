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

  return getDefaultRoomSettings(mergedSettings);
}
