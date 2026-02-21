import { describe, expect, it } from "vitest";

import { applySettingsUpdate } from "./room-settings";
import { getDefaultRoomSettings } from "./defaults";

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
    expect(
      result.estimateOptions.slice(0, updatedEstimateOptions.length),
    ).toEqual(updatedEstimateOptions);
    expect(result.estimateOptions.length).toBeGreaterThan(
      updatedEstimateOptions.length,
    );
  });

  it("switches to structured voting defaults when enabled", () => {
    const result = applySettingsUpdate({
      currentSettings: getDefaultRoomSettings(),
      settingsUpdate: { enableStructuredVoting: true },
    });

    expect(result.enableStructuredVoting).toBe(true);
    expect(result.estimateOptions).toContain(1);
    expect(result.estimateOptions).toContain(8);
    expect(result.votingCriteria).toBeDefined();
  });

  it("restores standard options when disabling structured voting without overrides", () => {
    const currentSettings = {
      ...getDefaultRoomSettings(),
      enableStructuredVoting: true,
    };

    const result = applySettingsUpdate({
      currentSettings,
      settingsUpdate: { enableStructuredVoting: false },
    });

    expect(result.enableStructuredVoting).toBe(false);
    expect(result.estimateOptions).toEqual(
      getDefaultRoomSettings().estimateOptions,
    );
  });
});
