import { describe, expect, it } from "vitest";

import { optionalTrimmedString } from "./string";

describe("optionalTrimmedString", () => {
  it("trims strings and applies the maximum length", () => {
    expect(optionalTrimmedString("  channel-name  ", 7)).toBe("channel");
  });

  it("returns null for empty and non-string values", () => {
    expect(optionalTrimmedString("   ", 10)).toBeNull();
    expect(optionalTrimmedString(123, 10)).toBeNull();
  });
});
