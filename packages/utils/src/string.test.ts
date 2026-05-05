import { describe, expect, it } from "vitest";

import { normaliseOptionalString } from "./string";

describe("normaliseOptionalString", () => {
  it("trims strings and drops empty values", () => {
    expect(normaliseOptionalString("  Sprint 44  ")).toBe("Sprint 44");
    expect(normaliseOptionalString("   ")).toBeUndefined();
  });

  it("rejects non-string values", () => {
    expect(normaliseOptionalString(44)).toBeUndefined();
    expect(normaliseOptionalString(null)).toBeUndefined();
  });
});
