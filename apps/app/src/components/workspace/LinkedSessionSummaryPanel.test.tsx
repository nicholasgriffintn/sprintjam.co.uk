/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { TeamSession } from "@sprintjam/types";

import { LinkedSessionSummaryPanel } from "@/components/workspace/LinkedSessionSummaryPanel";

function createSession(
  metadata: Record<string, unknown> | null,
  overrides: Partial<TeamSession>,
): TeamSession {
  return {
    id: 1,
    teamId: 7,
    roomKey: "ROOM1",
    name: "Session",
    createdById: 2,
    createdAt: Date.now(),
    completedAt: null,
    metadata: metadata ? JSON.stringify(metadata) : null,
    ...overrides,
  };
}

describe("LinkedSessionSummaryPanel", () => {
  it("renders combined recap only for intentionally linked sessions", () => {
    const sessionContext = {
      id: "sprint-44",
      label: "Sprint 44 session",
      intentionallyLinked: true,
    };

    render(
      <LinkedSessionSummaryPanel
        sessions={[
          createSession({ type: "planning" }, { id: 1, name: "Planning" }),
          createSession(
            {
              type: "standup",
              sessionContext,
              planningFollowUps: [
                { title: "Estimate blocked API", ticketKey: "API-1" },
              ],
            },
            { id: 2, name: "Standup", roomKey: "STAND44" },
          ),
          createSession(
            { type: "wheel", sessionContext },
            { id: 3, name: "Wheel", roomKey: "WHEEL44" },
          ),
        ]}
      />,
    );

    expect(screen.getByText("Linked summary")).toBeTruthy();
    expect(screen.getByText("Sprint 44 session")).toBeTruthy();
    expect(screen.getByText("Estimate blocked API")).toBeTruthy();
    expect(screen.queryByText("Planning")).toBeNull();
  });

  it("does not render for unlinked sessions", () => {
    const { container } = render(
      <LinkedSessionSummaryPanel
        sessions={[
          createSession({ type: "standup" }, { id: 1, name: "Standup" }),
        ]}
      />,
    );

    expect(container.textContent).toBe("");
  });
});
