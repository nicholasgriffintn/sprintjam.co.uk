import { describe, expect, it } from "vitest";

import {
  countWorkspaceTeamSessionTypes,
  getWorkspaceTeamSessionType,
} from "./workspace-session-types";

describe("workspace session types", () => {
  it("defaults missing or invalid metadata to planning", () => {
    expect(getWorkspaceTeamSessionType(null)).toBe("planning");
    expect(getWorkspaceTeamSessionType('{"type":"unknown"}')).toBe("planning");
    expect(getWorkspaceTeamSessionType("{bad-json")).toBe("planning");
  });

  it("counts planning, standup, and wheel sessions from metadata", () => {
    expect(
      countWorkspaceTeamSessionTypes([
        { metadata: null },
        { metadata: '{"type":"standup"}' },
        { metadata: { type: "wheel" } },
        { metadata: '{"type":"planning"}' },
      ]),
    ).toEqual({
      all: 4,
      planning: 2,
      standup: 1,
      wheel: 1,
    });
  });
});
