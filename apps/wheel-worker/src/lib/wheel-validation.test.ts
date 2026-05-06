import { describe, expect, it } from "vitest";

import { normalizeWheelSettings } from "./wheel-validation";

describe("wheel settings validation", () => {
  it("accepts supported wheel modes", () => {
    expect(normalizeWheelSettings(undefined, { mode: "reviewer" })).toEqual(
      expect.objectContaining({ mode: "reviewer" }),
    );
  });

  it("ignores unsupported wheel modes", () => {
    expect(
      normalizeWheelSettings(undefined, {
        mode: "pair_picker",
      }),
    ).toEqual(expect.objectContaining({ mode: "facilitator" }));
  });
});
