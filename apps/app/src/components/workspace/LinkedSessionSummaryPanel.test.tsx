/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TeamSession } from "@sprintjam/types";

import { LinkedSessionSummaryPanel } from "@/components/workspace/LinkedSessionSummaryPanel";
import { resolveTeamSessionRecapAction } from "@/lib/workspace-service";

vi.mock("@/lib/workspace-service", () => ({
  resolveTeamSessionRecapAction: vi.fn(),
}));

const resolveTeamSessionRecapActionMock = vi.mocked(
  resolveTeamSessionRecapAction,
);

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
  beforeEach(() => {
    resolveTeamSessionRecapActionMock.mockReset();
  });

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
            {
              type: "wheel",
              sessionContext,
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
                    },
                  ],
                },
              ],
            },
            { id: 3, name: "Wheel", roomKey: "WHEEL44" },
          ),
        ]}
      />,
    );

    expect(screen.getByText("Linked summary")).toBeTruthy();
    expect(screen.getByText("Sprint 44 session")).toBeTruthy();
    expect(screen.getByText("Estimate blocked API")).toBeTruthy();
    expect(screen.getByText(/Reviewer: Ava/)).toBeTruthy();
    expect(screen.queryByText("Planning")).toBeNull();
  });

  it("resolves recap actions and removes them from the card", async () => {
    resolveTeamSessionRecapActionMock.mockResolvedValue(
      createSession(null, { id: 2 }),
    );
    const sessionContext = {
      id: "sprint-44",
      label: "Sprint 44 session",
      intentionallyLinked: true,
    };

    render(
      <LinkedSessionSummaryPanel
        sessions={[
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
            {
              type: "wheel",
              sessionContext,
              wheelOutcomes: [],
            },
            { id: 3, name: "Wheel", roomKey: "WHEEL44" },
          ),
        ]}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Resolve Estimate blocked API" }),
    );

    await waitFor(() => {
      expect(resolveTeamSessionRecapActionMock).toHaveBeenCalledWith(7, 2, {
        actionId: "planning-follow-up-2-estimate-blocked-api-api-1",
        kind: "planning_follow_up",
      });
    });
    expect(screen.queryByText("Estimate blocked API")).toBeNull();
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
