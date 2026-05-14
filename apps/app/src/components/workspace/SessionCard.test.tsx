/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { TeamSession } from "@sprintjam/types";

import { SessionCard } from "./SessionCard";

function buildSession(overrides: Partial<TeamSession> = {}): TeamSession {
  const session: TeamSession = {
    id: 7,
    teamId: 3,
    roomKey: "RETRO1",
    name: "Sprint 42 retro",
    createdById: 1,
    createdAt: 1_770_000_000,
    completedAt: null,
    metadata: JSON.stringify({
      type: "retro",
      templateName: "Start, Stop, Continue",
    }),
  };

  return { ...session, ...overrides };
}

describe("SessionCard", () => {
  it("renders retro sessions with retro labels and links", () => {
    render(<SessionCard session={buildSession()} stats={null} />);

    expect(screen.getByText("Retro")).toBeTruthy();
    expect(screen.getByText("Retro RETRO1")).toBeTruthy();
    expect(screen.getByText("Start, Stop, Continue")).toBeTruthy();

    const link = screen.getByRole("link", {
      name: /open retro/i,
    }) as HTMLAnchorElement;
    expect(link.getAttribute("href")).toBe("/retro/join/RETRO1");
  });

  it("keeps planning-specific stats off retro cards", () => {
    render(
      <SessionCard
        session={buildSession()}
        stats={{
          roomKey: "RETRO1",
          totalRounds: 3,
          totalVotes: 12,
          uniqueParticipants: 4,
          participationRate: 100,
          consensusRate: 50,
          firstRoundConsensusRate: 25,
          discussionRate: 50,
          estimationVelocity: null,
          durationMinutes: 12,
        }}
      />,
    );

    expect(screen.queryByText("rounds")).toBeNull();
    expect(screen.queryByText("consensus")).toBeNull();
  });
});
