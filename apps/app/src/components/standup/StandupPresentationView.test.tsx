// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { StandupData } from "@sprintjam/types";

import { StandupPresentationView } from "@/components/standup/StandupPresentationView";

const baseStandupData: StandupData = {
  key: "ABC123",
  users: ["Alice", "Bob"],
  moderator: "Alice",
  connectedUsers: {
    Alice: true,
    Bob: true,
  },
  status: "presenting",
  responses: [
    {
      userName: "Alice",
      yesterday: "Wrapped the worker",
      today: "Guide the call",
      hasBlocker: false,
      healthCheck: 4,
      submittedAt: 1000,
      updatedAt: 1000,
    },
    {
      userName: "Bob",
      yesterday: "Implemented the router",
      today: "Tidy the UI",
      hasBlocker: true,
      blockerDescription: "Needs copy review",
      healthCheck: 3,
      submittedAt: 2000,
      updatedAt: 2000,
    },
  ],
  respondedUsers: ["Alice", "Bob"],
  focusedUser: undefined,
};

describe("StandupPresentationView", () => {
  it("focuses the first response when presentation starts without a focused user", async () => {
    const onFocusUser = vi.fn();

    render(
      <StandupPresentationView
        standupData={baseStandupData}
        onFocusUser={onFocusUser}
        onEndPresentation={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(onFocusUser).toHaveBeenCalledWith("Alice");
    });
  });

  it("moves to the next participant when the facilitator advances", () => {
    const onFocusUser = vi.fn();

    render(
      <StandupPresentationView
        standupData={{ ...baseStandupData, focusedUser: "Alice" }}
        onFocusUser={onFocusUser}
        onEndPresentation={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    expect(onFocusUser).toHaveBeenCalledWith("Bob");
  });
});
