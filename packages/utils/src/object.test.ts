import { describe, expect, it } from "vitest";

import { isRecord } from "./object";

describe("isRecord", () => {
  it("accepts plain object records", () => {
    expect(isRecord({ value: "x" })).toBe(true);
  });

  it("rejects arrays and nullish values", () => {
    expect(isRecord(["x"])).toBe(false);
    expect(isRecord(null)).toBe(false);
    expect(isRecord(undefined)).toBe(false);
  });
});
