import { describe, expect, it } from "vitest";

import { boundedRecord } from "./object";

describe("boundedRecord", () => {
  it("returns objects that fit within the serialized length limit", () => {
    expect(boundedRecord({ source: "slack" }, 32)).toEqual({
      source: "slack",
    });
  });

  it("returns an empty object for non-records and oversized objects", () => {
    expect(boundedRecord(null, 32)).toEqual({});
    expect(boundedRecord(["source"], 32)).toEqual({});
    expect(boundedRecord({ value: "x".repeat(64) }, 32)).toEqual({});
  });
});
