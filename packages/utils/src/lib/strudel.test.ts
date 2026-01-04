import { describe, expect, it } from "vitest";
import { strudelMusicPresets } from "./strudel";

describe("strudelMusicPresets", () => {
  it("includes presets for all expected phases", () => {
    expect(Object.keys(strudelMusicPresets)).toEqual(
      expect.arrayContaining([
        "lobby",
        "voting",
        "discussion",
        "reveal",
        "wrapup",
      ]),
    );
  });

  it("provides non-empty preset lists with required fields", () => {
    const requiredFields = [
      "id",
      "name",
      "description",
      "style",
      "complexity",
      "prompt",
      "exampleCode",
    ];

    for (const [_phase, presets] of Object.entries(strudelMusicPresets)) {
      expect(Array.isArray(presets)).toBe(true);
      expect(presets.length).toBeGreaterThan(0);

      presets.forEach((preset) => {
        requiredFields.forEach((field) => {
          expect((preset as any)[field]).toBeTruthy();
        });
      });
    }
  });
});
