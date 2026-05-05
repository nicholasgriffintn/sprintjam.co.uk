// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { StatCards } from "./StatCards";
import type { WorkspaceStats } from "@sprintjam/types";

const stats: WorkspaceStats = {
  totalTeams: 2,
  totalSessions: 74,
  activeSessions: 46,
  completedSessions: 28,
  sessionTypeCounts: {
    all: 74,
    planning: 50,
    standup: 23,
    wheel: 1,
  },
  sessionTimeline: [],
};

describe("StatCards", () => {
  it("renders planning, standup, and wheel counts in the main stats grid", () => {
    render(<StatCards stats={stats} insights={null} />);

    expect(screen.getByText("Planning")).toBeTruthy();
    expect(screen.getByText("50")).toBeTruthy();
    expect(screen.getByText("Standups")).toBeTruthy();
    expect(screen.getByText("23")).toBeTruthy();
    expect(screen.getByText("Wheels")).toBeTruthy();
    expect(screen.getByText("1")).toBeTruthy();
    expect(screen.queryByText("Sprint tooling activity")).toBeNull();
  });

  it("renders dashboard quick actions with purpose text", () => {
    const onOpenSessions = vi.fn();
    const onCreateRoom = vi.fn();
    const onCreateStandup = vi.fn();
    const onOpenWheel = vi.fn();

    render(
      <StatCards
        stats={null}
        insights={null}
        teamCount={2}
        sessionCount={4}
        onOpenSessions={onOpenSessions}
        onCreateRoom={onCreateRoom}
        onCreateStandup={onCreateStandup}
        onOpenWheel={onOpenWheel}
      />,
    );

    expect(screen.getByText("Quick actions")).toBeTruthy();
    expect(screen.getByText("Review saved and active work")).toBeTruthy();
    expect(screen.getByText("Estimate backlog items")).toBeTruthy();
    expect(screen.getByText("Collect updates and blockers")).toBeTruthy();
    expect(screen.getByText("Pick speakers or reviewers")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Sessions/ }));
    fireEvent.click(screen.getByRole("button", { name: /Planning room/ }));
    fireEvent.click(screen.getByRole("button", { name: /Standup/ }));
    fireEvent.click(screen.getByRole("button", { name: /Wheel/ }));

    expect(onOpenSessions).toHaveBeenCalledTimes(1);
    expect(onCreateRoom).toHaveBeenCalledTimes(1);
    expect(onCreateStandup).toHaveBeenCalledTimes(1);
    expect(onOpenWheel).toHaveBeenCalledTimes(1);
  });
});
