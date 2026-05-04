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
        onSetPresentationOrder={vi.fn()}
        onCompleteStandup={vi.fn()}
        onAddReaction={vi.fn()}
        onRemoveReaction={vi.fn()}
        currentUserName="Alice"
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
        onSetPresentationOrder={vi.fn()}
        onCompleteStandup={vi.fn()}
        onAddReaction={vi.fn()}
        onRemoveReaction={vi.fn()}
        currentUserName="Alice"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    expect(onFocusUser).toHaveBeenCalledWith("Bob");
  });

  it("uses the persisted presentation order", () => {
    const onFocusUser = vi.fn();

    render(
      <StandupPresentationView
        standupData={{
          ...baseStandupData,
          focusedUser: "Bob",
          presentationOrder: ["Bob", "Alice"],
        }}
        onFocusUser={onFocusUser}
        onEndPresentation={vi.fn()}
        onSetPresentationOrder={vi.fn()}
        onCompleteStandup={vi.fn()}
        onAddReaction={vi.fn()}
        onRemoveReaction={vi.fn()}
        currentUserName="Alice"
      />,
    );

    expect(screen.getByText(/1 of 2/).textContent).toContain("Bob");
  });

  it("persists shuffled order through the room state", () => {
    const onSetPresentationOrder = vi.fn();

    render(
      <StandupPresentationView
        standupData={{ ...baseStandupData, focusedUser: "Alice" }}
        onFocusUser={vi.fn()}
        onEndPresentation={vi.fn()}
        onSetPresentationOrder={onSetPresentationOrder}
        onCompleteStandup={vi.fn()}
        onAddReaction={vi.fn()}
        onRemoveReaction={vi.fn()}
        currentUserName="Alice"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Shuffle" }));

    expect(onSetPresentationOrder).toHaveBeenCalledWith(
      expect.arrayContaining(["Alice", "Bob"]),
    );
  });
});
