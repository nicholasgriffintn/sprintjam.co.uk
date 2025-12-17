import { describe, expect, it } from "vitest";
import { applySettingsUpdate } from "./room-settings";
import {
  getDefaultEstimateOptions,
  getDefaultRoomSettings,
  getDefaultStructuredVotingOptions,
} from "./defaults";
import { generateVoteOptionsMetadata } from "./votes";

describe("room-settings utils", () => {
  it("returns defaults when no current settings or updates are provided", () => {
    const result = applySettingsUpdate({});
    expect(result).toEqual(getDefaultRoomSettings());
  });

  it("applies partial updates and regenerates vote metadata when options change", () => {
    const currentSettings = getDefaultRoomSettings();
    const updatedEstimateOptions = [1, 2, 4];
    const result = applySettingsUpdate({
      currentSettings,
      settingsUpdate: {
        showMedian: false,
        estimateOptions: updatedEstimateOptions,
      },
    });

    expect(result.showMedian).toBe(false);
    expect(result.estimateOptions).toEqual(updatedEstimateOptions);
    expect(result.voteOptionsMetadata).toEqual(
      generateVoteOptionsMetadata(updatedEstimateOptions),
    );
  });

  it("switches to structured voting defaults when enabled", () => {
    const result = applySettingsUpdate({
      currentSettings: getDefaultRoomSettings(),
      settingsUpdate: { enableStructuredVoting: true },
    });

    const structuredOptions = getDefaultStructuredVotingOptions();
    expect(result.enableStructuredVoting).toBe(true);
    expect(result.estimateOptions).toEqual(structuredOptions);
    expect(result.voteOptionsMetadata).toEqual(
      generateVoteOptionsMetadata(structuredOptions),
    );
    expect(result.votingCriteria).toBeDefined();
  });

  it("restores standard options when disabling structured voting without overrides", () => {
    const structuredOptions = getDefaultStructuredVotingOptions();
    const currentSettings = {
      ...getDefaultRoomSettings(),
      enableStructuredVoting: true,
      estimateOptions: structuredOptions,
      voteOptionsMetadata: generateVoteOptionsMetadata(structuredOptions),
    };

    const result = applySettingsUpdate({
      currentSettings,
      settingsUpdate: { enableStructuredVoting: false },
    });

    const defaultOptions = getDefaultEstimateOptions();
    expect(result.enableStructuredVoting).toBe(false);
    expect(result.estimateOptions).toEqual(defaultOptions);
    expect(result.voteOptionsMetadata).toEqual(
      generateVoteOptionsMetadata(defaultOptions),
    );
  });
});
