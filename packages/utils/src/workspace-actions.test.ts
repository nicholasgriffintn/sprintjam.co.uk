import { describe, expect, it } from "vitest";

import {
  buildPlanningActionIntents,
  buildPlanningFollowUpsFromTicketQueue,
  buildRetroActionIntents,
  buildStandupBlockerActionIntents,
  buildStandupNextStepActionIntents,
  buildWheelActionIntent,
  buildWorkspaceProcessLoopIntent,
} from "./workspace-actions";

describe("workspace-actions", () => {
  it("builds stable process loop intent from team and date", () => {
    expect(
      buildWorkspaceProcessLoopIntent(7, new Date("2026-05-05T12:00:00Z")),
    ).toEqual({
      key: "team-7-2026-05-05",
      name: "Team loop 2026-05-05",
      status: "active",
      startsAt: new Date("2026-05-05T00:00:00").getTime(),
    });
  });

  it("normalises planning follow-ups into action intents", () => {
    expect(
      buildPlanningActionIntents(3, [
        "Review API blocker",
        { title: "Split story", detail: "Too broad", ticketKey: "SJ-1" },
        { detail: "missing title" },
      ]),
    ).toEqual([
      {
        source: "planning",
        sourceRef: "planning-follow-up-3-review-api-blocker",
        title: "Review API blocker",
        priority: "normal",
      },
      {
        source: "planning",
        sourceRef: "planning-follow-up-3-split-story-sj-1",
        title: "Split story",
        detail: "Too broad",
        priority: "normal",
        metadata: { ticketKey: "SJ-1" },
      },
    ]);
  });

  it("extracts complete-session planning follow-ups from generated queue items", () => {
    expect(
      buildPlanningFollowUpsFromTicketQueue([
        {
          ticketId: "FOLLOW-1",
          title: "Clarify unknowns",
          outcome: "Check acceptance criteria",
        },
        {
          ticketId: "SJ-2",
          title: "Estimate login",
        },
      ]),
    ).toEqual([
      {
        title: "Clarify unknowns",
        detail: "Check acceptance criteria",
        ticketKey: "FOLLOW-1",
      },
    ]);
  });

  it("uses queue descriptions when generated follow-ups have no outcome", () => {
    expect(
      buildPlanningFollowUpsFromTicketQueue([
        {
          ticketId: "FOLLOW-2",
          title: "Split story",
          description: "Scope is too broad",
          outcome: null,
        },
      ]),
    ).toEqual([
      {
        title: "Split story",
        detail: "Scope is too broad",
        ticketKey: "FOLLOW-2",
      },
    ]);
  });

  it("builds wheel outcome action intent", () => {
    expect(
      buildWheelActionIntent(
        9,
        "decision",
        {
          id: "spin-1",
          winner: "Ship",
          timestamp: 1_700_000_000_000,
          removedAfter: false,
        },
        "Decision",
        "Create ticket",
      ),
    ).toEqual({
      source: "wheel",
      sourceRef: "wheel-outcome-9-decision",
      title: "Decision: Ship",
      detail: "Create ticket",
      priority: "high",
      metadata: {
        mode: "decision",
        resultId: "spin-1",
        removedAfter: false,
        timestamp: 1_700_000_000_000,
      },
    });
  });

  it("builds retro action intents with completion status", () => {
    expect(
      buildRetroActionIntents(14, [
        {
          id: "action-1",
          title: "Pair on release checklist",
          owner: "Ava",
          completed: false,
        },
        {
          id: "action-2",
          title: "Update incident playbook",
          completed: true,
        },
        {
          id: "",
          title: "Ignored",
        },
      ]),
    ).toEqual([
      {
        source: "retro",
        sourceRef: "retro-action-14-action-1",
        title: "Pair on release checklist",
        status: "open",
        priority: "normal",
        ownerName: "Ava",
        metadata: { retroActionId: "action-1" },
      },
      {
        source: "retro",
        sourceRef: "retro-action-14-action-2",
        title: "Update incident playbook",
        status: "resolved",
        priority: "normal",
        ownerName: undefined,
        metadata: { retroActionId: "action-2" },
      },
    ]);
  });

  it("builds standup blocker actions with ticket metadata", () => {
    expect(
      buildStandupBlockerActionIntents([
        {
          userName: "Ava",
          description: "Waiting on auth review",
          linkedTickets: [
            {
              id: "1",
              key: "SJ-12",
              title: "Auth",
              provider: "github",
            },
          ],
        },
      ]),
    ).toEqual([
      {
        source: "standup",
        sourceRef: "standup-blocker:ava",
        title: "Resolve blocker for Ava",
        detail: "Waiting on auth review · Tickets: SJ-12",
        priority: "high",
        ownerName: "Ava",
        metadata: { ticketKeys: ["SJ-12"] },
      },
    ]);
  });

  it("builds standup next-step actions from today's work", () => {
    expect(
      buildStandupNextStepActionIntents([
        {
          userName: "Ava",
          description: "Finish workspace action tracking",
          linkedTickets: [
            {
              id: "1",
              key: "SJ-42",
              title: "Workspace",
              provider: "linear",
            },
          ],
        },
        {
          userName: "Ben",
          description: "",
        },
      ]),
    ).toEqual([
      {
        source: "standup",
        sourceRef: "standup-next-step:ava",
        title: "Next step for Ava",
        detail: "Finish workspace action tracking · Tickets: SJ-42",
        priority: "normal",
        ownerName: "Ava",
        metadata: { ticketKeys: ["SJ-42"] },
      },
    ]);
  });
});
