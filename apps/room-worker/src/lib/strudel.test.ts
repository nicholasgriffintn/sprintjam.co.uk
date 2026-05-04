import { describe, expect, it } from "vitest";

import { selectPresetForPhase } from "./strudel";
import { strudelMusicPresets } from "../config/strudel";

describe("strudel utils", () => {
  it("selects a preset for a known phase", () => {
    const preset = selectPresetForPhase("voting");

    expect(strudelMusicPresets.voting).toContainEqual(
      expect.objectContaining({
        style: preset.style,
        complexity: preset.complexity,
        prompt: preset.prompt,
      }),
    );
    expect(preset.tempo).toBe(120);
  });

  it("falls back to lobby presets for unknown phases", () => {
    const preset = selectPresetForPhase("unknown");

    expect(strudelMusicPresets.lobby).toContainEqual(
      expect.objectContaining({
        style: preset.style,
        complexity: preset.complexity,
        prompt: preset.prompt,
      }),
    );
    expect(preset.tempo).toBe(120);
  });
});
