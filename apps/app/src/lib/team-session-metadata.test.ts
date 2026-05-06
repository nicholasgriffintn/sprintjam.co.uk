import { describe, expect, it } from "vitest";
import type { TeamSession } from "@sprintjam/types";

import {
  buildTeamSessionMetadata,
  buildLinkedSessionSummaries,
  getTeamSessionType,
  getLinkedSessionContext,
  getPlanningFollowUps,
  getWheelOutcomes,
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

  it("requires a valid process loop before grouping sessions", () => {
    const session = createSession(
      JSON.stringify({
        type: "standup",
        processLoop: { key: "sprint-44" },
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
      {
        id: "planning-follow-up-1-review-release-blocker",
        sessionId: 1,
        title: "Review release blocker",
        source: "standup",
      },
      {
        id: "planning-follow-up-1-split-deployment-story-sj-44",
        sessionId: 1,
        title: "Split deployment story",
        detail: "Auth deploy still blocked",
        ticketKey: "SJ-44",
        source: "standup",
      },
    ]);
  });

  it("normalises wheel outcomes from metadata", () => {
    const session = createSession(
      JSON.stringify({
        type: "wheel",
        wheelOutcomes: [
          {
            id: "spin-1",
            mode: "reviewer",
            resultLabel: "Reviewer",
            winner: "Ava",
            timestamp: 1_700_000_000_000,
            removedAfter: false,
            recordedAt: 1_700_000_000_100,
            automation: [
              {
                label: "Assign reviewer",
                detail: "Assign Ava on the linked item.",
                provider: "github",
              },
            ],
          },
          { id: "spin-2", mode: "pair_picker" },
        ],
      }),
    );

    expect(getWheelOutcomes(session)).toEqual([
      expect.objectContaining({
        id: "spin-1",
        sessionId: 1,
        mode: "reviewer",
        resultLabel: "Reviewer",
        winner: "Ava",
      }),
    ]);
  });

  it("builds linked session metadata with planning follow-ups", () => {
    expect(
      buildTeamSessionMetadata({
        type: "planning",
        teamId: 7,
        planningFollowUps: ["Review API blocker"],
        date: new Date("2026-05-05T12:00:00Z"),
      }),
    ).toEqual({
      type: "planning",
      processLoop: {
        key: "team-7-2026-05-05",
        name: "Team loop 2026-05-05",
        status: "active",
        startsAt: new Date("2026-05-05T00:00:00").getTime(),
      },
      planningFollowUps: ["Review API blocker"],
    });
  });

  it("builds combined recaps only for process-loop linked sessions", () => {
    const processLoop = {
      key: "sprint-44",
      name: "Sprint 44 session",
      status: "active",
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
          processLoop,
          planningFollowUps: [
            { title: "Estimate blocked API", ticketKey: "API-1" },
          ],
        }),
        { id: 2, roomKey: "STAND44", name: "Standup", createdAt: 1 },
      ),
      createSession(
        JSON.stringify({
          type: "wheel",
          processLoop,
          wheelOutcomes: [
            {
              id: "spin-1",
              mode: "decision",
              resultLabel: "Decision",
              winner: "Ship it",
              timestamp: 1_700_000_000_000,
              removedAfter: false,
              recordedAt: 1_700_000_000_100,
              automation: [],
            },
          ],
        }),
        {
          id: 3,
          roomKey: "WHEEL44",
          name: "Wheel",
          createdAt: 3,
        },
      ),
    ]);

    expect(recaps).toHaveLength(1);
    expect(recaps[0]?.sessionTypes).toEqual(["standup", "wheel"]);
    expect(recaps[0]?.planningFollowUps).toEqual([
      {
        id: "planning-follow-up-2-estimate-blocked-api-api-1",
        sessionId: 2,
        title: "Estimate blocked API",
        ticketKey: "API-1",
        source: "standup",
      },
    ]);
    expect(recaps[0]?.wheelOutcomes).toEqual([
      expect.objectContaining({ resultLabel: "Decision", winner: "Ship it" }),
    ]);
    expect(recaps[0]?.recapText).toContain("Sprint 44 session");
    expect(recaps[0]?.recapText).toContain("Decision: Ship it");
  });

  it("excludes resolved recap actions from linked summaries", () => {
    const processLoop = {
      key: "sprint-44",
      name: "Sprint 44 session",
      status: "active",
    };
    const recaps = buildLinkedSessionSummaries([
      createSession(
        JSON.stringify({
          type: "standup",
          processLoop,
          planningFollowUps: [
            {
              title: "Estimate blocked API",
              status: "resolved",
              resolvedAt: 1_700_000_000_000,
            },
            "Review release blocker",
          ],
        }),
        { id: 2, roomKey: "STAND44", name: "Standup", createdAt: 1 },
      ),
      createSession(
        JSON.stringify({
          type: "wheel",
          processLoop,
          wheelOutcomes: [
            {
              id: "spin-1",
              mode: "decision",
              resultLabel: "Decision",
              winner: "Ship it",
              timestamp: 1_700_000_000_000,
              removedAfter: false,
              recordedAt: 1_700_000_000_100,
              status: "resolved",
              automation: [],
            },
          ],
        }),
        { id: 3, roomKey: "WHEEL44", name: "Wheel", createdAt: 2 },
      ),
    ]);

    expect(recaps[0]?.planningFollowUps).toEqual([
      expect.objectContaining({ title: "Review release blocker" }),
    ]);
    expect(recaps[0]?.wheelOutcomes).toEqual([]);
    expect(recaps[0]?.recapText).not.toContain("Estimate blocked API");
    expect(recaps[0]?.recapText).not.toContain("Decision: Ship it");
  });
});
