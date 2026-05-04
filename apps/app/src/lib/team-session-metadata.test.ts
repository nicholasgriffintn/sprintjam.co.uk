import { describe, expect, it } from "vitest";
import type { TeamSession } from "@sprintjam/types";

import {
  getTeamSessionType,
  parseTeamSessionMetadata,
} from "@/lib/team-session-metadata";

function createSession(metadata: string | null): TeamSession {
  return {
    id: 1,
    teamId: 7,
    roomKey: "ROOM1",
    name: "Session",
    createdById: 2,
    createdAt: Date.now(),
    completedAt: null,
    metadata,
  };
}

describe("team-session-metadata", () => {
  it("defaults to planning when metadata is missing", () => {
    expect(getTeamSessionType(createSession(null))).toBe("planning");
  });

  it("parses standup metadata safely", () => {
    const session = createSession(JSON.stringify({ type: "standup" }));

    expect(parseTeamSessionMetadata(session)).toEqual({ type: "standup" });
    expect(getTeamSessionType(session)).toBe("standup");
  });

  it("ignores invalid metadata", () => {
    const session = createSession("{bad json");

    expect(parseTeamSessionMetadata(session)).toBeNull();
    expect(getTeamSessionType(session)).toBe("planning");
  });
});
