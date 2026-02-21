import { describe, expect, it } from "vitest";

import { convertVoteValueToEstimate } from "@/utils/external-estimate";

describe("convertVoteValueToEstimate", () => {
  it("returns null for ignored values", () => {
    expect(convertVoteValueToEstimate("?")).toBeNull();
    expect(convertVoteValueToEstimate("❓")).toBeNull();
    expect(convertVoteValueToEstimate("coffee")).toBeNull();
    expect(convertVoteValueToEstimate("☕")).toBeNull();
    expect(convertVoteValueToEstimate("♾️")).toBeNull();
    expect(convertVoteValueToEstimate(null)).toBeNull();
  });

  it("returns numeric values for valid votes", () => {
    expect(convertVoteValueToEstimate(5)).toBe(5);
    expect(convertVoteValueToEstimate("8")).toBe(8);
    expect(convertVoteValueToEstimate("3.5")).toBe(3.5);
  });

  it("returns null for non-numeric values", () => {
    expect(convertVoteValueToEstimate("unknown")).toBeNull();
  });
});
