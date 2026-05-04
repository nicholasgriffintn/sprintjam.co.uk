// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { StandupData } from "@sprintjam/types";

import { StandupFacilitatorView } from "@/components/standup/StandupFacilitatorView";

const standupData: StandupData = {
  key: "ABC123",
  users: ["Alice", "Bob"],
  moderator: "Alice",
  connectedUsers: { Alice: true, Bob: true },
  status: "active",
  respondedUsers: ["Alice", "Bob"],
  responses: [
    {
      userName: "Alice",
      hasBlocker: false,
      healthCheck: 4,
      submittedAt: 1000,
      updatedAt: 1000,
    },
    {
      userName: "Bob",
      hasBlocker: true,
      blockerDescription: "Needs review",
      healthCheck: 2,
      submittedAt: 2000,
      updatedAt: 2000,
    },
  ],
};

describe("StandupFacilitatorView", () => {
  it("shows persisted blocker resolution state and allows undo", () => {
    const onSetBlockerResolved = vi.fn();
    const { rerender } = render(
      <StandupFacilitatorView
        standupData={standupData}
        isSocketConnected
        onLockResponses={vi.fn()}
        onUnlockResponses={vi.fn()}
        onStartPresentation={vi.fn()}
        onCompleteStandup={vi.fn()}
        onFocusUser={vi.fn()}
        onSetBlockerResolved={onSetBlockerResolved}
      />,
    );

    expect(screen.getByText("1 blocker")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Mark resolved" }));

    expect(onSetBlockerResolved).toHaveBeenCalledWith("Bob", true);

    rerender(
      <StandupFacilitatorView
        standupData={{
          ...standupData,
          responses: standupData.responses.map((response) =>
            response.userName === "Bob"
              ? { ...response, blockerResolved: true }
              : response,
          ),
        }}
        isSocketConnected
        onLockResponses={vi.fn()}
        onUnlockResponses={vi.fn()}
        onStartPresentation={vi.fn()}
        onCompleteStandup={vi.fn()}
        onFocusUser={vi.fn()}
        onSetBlockerResolved={onSetBlockerResolved}
      />,
    );

    expect(screen.queryByText("1 blocker")).toBeNull();
    expect(screen.getByText("Resolved")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Mark unresolved" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Mark unresolved" }));

    expect(onSetBlockerResolved).toHaveBeenCalledWith("Bob", false);
  });
});
