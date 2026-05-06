import { describe, expect, it } from "vitest";
import type { SpinResult } from "@sprintjam/types";

import {
  buildWheelResultsCsv,
  buildWheelResultsText,
} from "@/utils/wheel-results";

const results: SpinResult[] = [
  {
    id: "1",
    winner: "Alice",
    timestamp: 1_700_000_000_000,
    removedAfter: false,
  },
  {
    id: "2",
    winner: "Bob",
    timestamp: 1_700_000_100_000,
    removedAfter: true,
  },
];

describe("wheel result utilities", () => {
  it("formats latest result first for copying", () => {
    expect(buildWheelResultsText(results, "facilitator").split("\n")[0]).toBe(
      "Speaker 2: Bob removed after spin",
    );
  });

  it("exports wheel results as csv", () => {
    const csv = buildWheelResultsCsv(results);

    expect(csv).toContain('"Spin","Speaker","Mode"');
    expect(csv).toContain('"2","Bob","Facilitator","Yes"');
  });
});
