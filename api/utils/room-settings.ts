import type { RoomSettings } from "../types";
import {
  getDefaultEstimateOptions,
  getDefaultRoomSettings,
  getDefaultStructuredVotingOptions,
} from "./defaults";
import { generateVoteOptionsMetadata } from "./votes";

export function applySettingsUpdate({
  currentSettings,
  settingsUpdate,
}: {
  currentSettings?: RoomSettings;
  settingsUpdate?: Partial<RoomSettings>;
}): RoomSettings {
  const defaultSettings = getDefaultRoomSettings();
  const baseSettings: RoomSettings = {
    ...defaultSettings,
    ...(currentSettings ?? {}),
  };

  const updates = settingsUpdate ?? {};
  let result: RoomSettings = {
    ...baseSettings,
    ...updates,
  };

  if (updates.enableStructuredVoting === true) {
    const structuredOptions = getDefaultStructuredVotingOptions();
    result = {
      ...result,
      estimateOptions: structuredOptions,
      voteOptionsMetadata: generateVoteOptionsMetadata(structuredOptions),
      votingCriteria: result.votingCriteria ?? defaultSettings.votingCriteria,
    };
  } else if (
    updates.enableStructuredVoting === false &&
    !updates.estimateOptions
  ) {
    const defaultOptions = getDefaultEstimateOptions();
    result = {
      ...result,
      estimateOptions: defaultOptions,
      voteOptionsMetadata: generateVoteOptionsMetadata(defaultOptions),
      votingCriteria: result.votingCriteria ?? defaultSettings.votingCriteria,
    };
  }

  if (updates.estimateOptions) {
    result = {
      ...result,
      voteOptionsMetadata: generateVoteOptionsMetadata(updates.estimateOptions),
    };
  } else if (!result.voteOptionsMetadata && result.estimateOptions) {
    result = {
      ...result,
      voteOptionsMetadata: generateVoteOptionsMetadata(result.estimateOptions),
    };
  }

  return result;
}
