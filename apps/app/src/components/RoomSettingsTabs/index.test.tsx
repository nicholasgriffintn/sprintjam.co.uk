/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { getDefaultRoomSettings } from "@sprintjam/utils";

import { RoomSettingsTabs } from ".";
import type { RoomSettings } from "@/types";

function buildStructuredSettings(): RoomSettings {
  return {
    ...getDefaultRoomSettings(),
    enableStructuredVoting: true,
  } as RoomSettings;
}

describe("RoomSettingsTabs structured criteria", () => {
  it("lets users choose fixed structured voting fields including optional risk", () => {
    const settings = buildStructuredSettings();
    const onSettingsChange = vi.fn();

    render(
      <RoomSettingsTabs
        initialSettings={settings}
        defaultSettings={settings}
        structuredVotingOptions={[1, 2, 3, 5, 8]}
        onSettingsChange={onSettingsChange}
      />,
    );

    expect(
      screen.getByTestId("structured-field-complexity").hasAttribute("data-checked"),
    ).toBe(true);
    expect(
      screen.getByTestId("structured-field-confidence").hasAttribute("data-checked"),
    ).toBe(true);
    expect(
      screen.getByTestId("structured-field-volume").hasAttribute("data-checked"),
    ).toBe(true);
    expect(
      screen.getByTestId("structured-field-unknowns").hasAttribute("data-checked"),
    ).toBe(true);
    expect(
      screen.getByTestId("structured-field-risk").hasAttribute("data-checked"),
    ).toBe(false);

    fireEvent.click(screen.getByTestId("structured-field-risk"));
    fireEvent.click(screen.getByTestId("structured-field-unknowns"));

    const updatedSettings = onSettingsChange.mock.calls.at(-1)?.[0] as
      | RoomSettings
      | undefined;

    expect(updatedSettings?.votingCriteria?.map(({ id }) => id)).toEqual([
      "complexity",
      "confidence",
      "volume",
      "risk",
    ]);
  });
});
