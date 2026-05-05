import { describe, expect, it } from "vitest";
import type { TeamSession } from "@sprintjam/types";

import {
  buildTeamSessionMetadata,
  buildLinkedSessionSummaries,
  getTeamSessionType,
  getLinkedSessionContext,
  getPlanningFollowUps,
  parseTeamSessionMetadata,
} from "@/lib/team-session-metadata";

function createSession(
  metadata: string | null,
  overrides: Partial<TeamSession> = {},
): TeamSession {
  return {
    id: 1,
    teamId: 7,
    roomKey: "ROOM1",
    name: "Session",
    createdById: 2,
    createdAt: Date.now(),
    completedAt: null,
    metadata,
    ...overrides,
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

  it("parses wheel metadata safely", () => {
    const session = createSession(JSON.stringify({ type: "wheel" }));

    expect(getTeamSessionType(session)).toBe("wheel");
  });

  it("ignores invalid metadata", () => {
    const session = createSession("{bad json");

    expect(parseTeamSessionMetadata(session)).toBeNull();
    expect(getTeamSessionType(session)).toBe("planning");
  });

  it("requires intentional context before grouping sessions", () => {
    const session = createSession(
      JSON.stringify({
        type: "standup",
        sessionContext: { id: "sprint-44", label: "Sprint 44" },
      }),
    );

    expect(getLinkedSessionContext(session)).toBeNull();
  });

  it("normalises planning follow-ups from metadata", () => {
    const session = createSession(
      JSON.stringify({
        type: "standup",
        planningFollowUps: [
          "Review release blocker",
          {
            title: "Split deployment story",
            detail: "Auth deploy still blocked",
            ticketKey: "SJ-44",
          },
          { detail: "missing title" },
        ],
      }),
    );

    expect(getPlanningFollowUps(session)).toEqual([
      { title: "Review release blocker", source: "standup" },
      {
        title: "Split deployment story",
        detail: "Auth deploy still blocked",
        ticketKey: "SJ-44",
        source: "standup",
      },
    ]);
  });

  it("builds linked session metadata with planning follow-ups", () => {
    expect(
      buildTeamSessionMetadata({
        type: "planning",
        teamId: 7,
        linkSessionContext: true,
        planningFollowUps: ["Review API blocker"],
        date: new Date("2026-05-05T12:00:00Z"),
      }),
    ).toEqual({
      type: "planning",
      sessionContext: {
        id: "team-7-2026-05-05",
        label: "Team sessions 2026-05-05",
        intentionallyLinked: true,
      },
      planningFollowUps: ["Review API blocker"],
    });
  });

  it("builds combined recaps only for intentionally linked sessions", () => {
    const sessionContext = {
      id: "sprint-44",
      label: "Sprint 44 session",
      intentionallyLinked: true,
    };
    const recaps = buildLinkedSessionSummaries([
      createSession(JSON.stringify({ type: "planning" }), {
        id: 1,
        roomKey: "PLAN44",
        name: "Planning",
        createdAt: 2,
      }),
      createSession(
        JSON.stringify({
          type: "standup",
          sessionContext,
          planningFollowUps: [{ title: "Estimate blocked API", ticketKey: "API-1" }],
        }),
        { id: 2, roomKey: "STAND44", name: "Standup", createdAt: 1 },
      ),
      createSession(JSON.stringify({ type: "wheel", sessionContext }), {
        id: 3,
        roomKey: "WHEEL44",
        name: "Wheel",
        createdAt: 3,
      }),
    ]);

    expect(recaps).toHaveLength(1);
    expect(recaps[0]?.sessionTypes).toEqual(["standup", "wheel"]);
    expect(recaps[0]?.planningFollowUps).toEqual([
      { title: "Estimate blocked API", ticketKey: "API-1", source: "standup" },
    ]);
    expect(recaps[0]?.recapText).toContain("Sprint 44 session");
  });
});
