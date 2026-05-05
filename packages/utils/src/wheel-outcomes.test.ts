import { describe, expect, it } from "vitest";

import {
  appendWorkspaceWheelOutcome,
  buildWorkspaceWheelOutcome,
  isWorkspaceWheelMode,
} from "./wheel-outcomes";

describe("wheel outcome utilities", () => {
  it("keeps only workspace-backed wheel modes", () => {
    expect(isWorkspaceWheelMode("decision")).toBe(true);
    expect(isWorkspaceWheelMode("reviewer")).toBe(true);
    expect(isWorkspaceWheelMode("speaker_order")).toBe(true);
    expect(isWorkspaceWheelMode("pair_picker" as never)).toBe(false);
  });

  it("builds automation suggestions for reviewer outcomes", () => {
    const outcome = buildWorkspaceWheelOutcome(
      {
        id: "spin-1",
        winner: "Ava",
        timestamp: 1_700_000_000_000,
        removedAfter: false,
      },
      "reviewer",
      1_700_000_000_100,
    );

    expect(outcome).toEqual(
      expect.objectContaining({
        id: "spin-1",
        mode: "reviewer",
        resultLabel: "Reviewer",
        winner: "Ava",
        recordedAt: 1_700_000_000_100,
      }),
    );
    expect(outcome.automation[0]?.label).toBe("Assign reviewer");
  });

  it("deduplicates outcomes when appending to metadata", () => {
    const firstOutcome = buildWorkspaceWheelOutcome(
      {
        id: "spin-1",
        winner: "Ava",
        timestamp: 1_700_000_000_000,
        removedAfter: false,
      },
      "decision",
      1,
    );
    const replacementOutcome = {
      ...firstOutcome,
      winner: "No-go",
      recordedAt: 2,
    };

    const metadata = appendWorkspaceWheelOutcome(
      appendWorkspaceWheelOutcome({ type: "wheel" }, firstOutcome),
      replacementOutcome,
    );

    expect(metadata.wheelOutcomes).toEqual([replacementOutcome]);
  });
});
