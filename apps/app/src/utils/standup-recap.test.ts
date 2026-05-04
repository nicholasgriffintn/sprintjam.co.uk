import { describe, expect, it } from "vitest";
import type { StandupData } from "@sprintjam/types";

import {
  buildStandupBlockerFollowUpText,
  buildStandupRecapCsv,
  getOrderedStandupResponses,
} from "@/utils/standup-recap";

const standupData: StandupData = {
  key: "ABC123",
  users: ["Alice", "Bob"],
  moderator: "Alice",
  connectedUsers: { Alice: true, Bob: true },
  status: "presenting",
  respondedUsers: ["Alice", "Bob"],
  responses: [
    {
      userName: "Alice",
      isInPerson: true,
      hasBlocker: false,
      healthCheck: 4,
      submittedAt: 1000,
      updatedAt: 1000,
    },
    {
      userName: "Bob",
      isInPerson: false,
      yesterday: "Fixed imports",
      today: "Ship recap",
      hasBlocker: true,
      blockerDescription: "Needs review",
      healthCheck: 2,
      linkedTickets: [
        {
          id: "1",
          key: "SJ-1",
          title: "Review recap",
          provider: "github",
        },
      ],
      submittedAt: 2000,
      updatedAt: 2000,
    },
  ],
};

describe("standup recap utilities", () => {
  it("builds blocker follow-up text with linked tickets", () => {
    expect(buildStandupBlockerFollowUpText(standupData)).toContain(
      "- Bob (SJ-1): Needs review",
    );
  });

  it("excludes resolved blockers from follow-up text", () => {
    expect(
      buildStandupBlockerFollowUpText(standupData, {
        resolvedBlockers: new Set(["Bob"]),
      }),
    ).toBe("No unresolved blockers.");
  });

  it("exports responses as csv", () => {
    const csv = buildStandupRecapCsv(standupData);

    expect(csv).toContain('"User","Attendance"');
    expect(csv).toContain('"Bob","Not attending"');
    expect(csv).toContain('"Yes","No","Needs review"');
  });

  it("uses presentation order when present", () => {
    const ordered = getOrderedStandupResponses({
      ...standupData,
      presentationOrder: ["Bob", "Alice"],
    });

    expect(ordered.map((response) => response.userName)).toEqual([
      "Bob",
      "Alice",
    ]);
  });
});
