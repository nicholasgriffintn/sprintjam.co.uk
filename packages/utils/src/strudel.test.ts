import { describe, expect, it, vi } from "vitest";

import { selectPresetForPhase } from "./strudel";
import { strudelMusicPresets } from "./lib/strudel";

describe("strudel utils", () => {
  it("selects a preset for a known phase", () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.6);
    const preset = selectPresetForPhase("voting");
    randomSpy.mockRestore();

    const expected = strudelMusicPresets.voting[1];
    expect(preset).toMatchObject({
      style: expected.style,
      complexity: expected.complexity,
      prompt: expected.prompt,
      tempo: 120,
    });
  });

  it("falls back to lobby presets for unknown phases", () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0);
    const preset = selectPresetForPhase("unknown" as any);
    randomSpy.mockRestore();

    const expected = strudelMusicPresets.lobby[0];
    expect(preset).toMatchObject({
      style: expected.style,
      complexity: expected.complexity,
      prompt: expected.prompt,
      tempo: 120,
    });
  });
});
