import { describe, expect, it, vi } from "vitest";
import type { StandupData } from "@sprintjam/types";

import { HttpError } from "@/lib/errors";
import { completeStandupWorkspaceHistory } from "./useStandupWorkspaceCompletion";

const standupData = {
  key: "5W362R",
  status: "presenting",
  moderator: "Ava",
  users: ["Ava"],
  connectedUsers: { Ava: true },
  respondedUsers: ["Ava"],
  responses: [
    {
      userName: "Ava",
      yesterday: "Shipped workspace board",
      today: "Finish action tracking",
      hasBlocker: true,
      healthCheck: 4,
      blockerDescription: "Waiting on review",
      blockerResolved: false,
      submittedAt: 1,
      updatedAt: 1,
      linkedTickets: [],
    },
  ],
  teamId: 7,
} satisfies StandupData;

describe("completeStandupWorkspaceHistory", () => {
  it("completes the workspace session when action recording fails", async () => {
    const recordActions = vi
      .fn()
      .mockRejectedValue(new Error("Action write failed"));
    const completeSession = vi.fn().mockResolvedValue({ id: 1 });

    const warning = await completeStandupWorkspaceHistory(
      {
        standupData,
        standupKey: "5W362R",
        isAuthenticated: true,
      },
      { recordActions, completeSession },
    );

    expect(recordActions).toHaveBeenCalledWith({
      roomKey: "5W362R",
      blockers: [
        {
          userName: "Ava",
          description: "Waiting on review",
          linkedTickets: [],
        },
      ],
      nextSteps: [
        {
          userName: "Ava",
          description: "Finish action tracking",
          linkedTickets: [],
        },
      ],
    });
    expect(completeSession).toHaveBeenCalledWith("5W362R");
    expect(warning).toContain("workspace actions were not updated");
  });

  it("still completes the workspace session when no action session exists yet", async () => {
    const recordActions = vi
      .fn()
      .mockRejectedValue(new HttpError({ status: 404, message: "Missing" }));
    const completeSession = vi.fn().mockResolvedValue({ id: 1 });

    const warning = await completeStandupWorkspaceHistory(
      {
        standupData,
        standupKey: "5W362R",
        isAuthenticated: true,
      },
      { recordActions, completeSession },
    );

    expect(recordActions).toHaveBeenCalledWith(
      expect.objectContaining({
        roomKey: "5W362R",
        blockers: [
          expect.objectContaining({
            userName: "Ava",
            description: "Waiting on review",
          }),
        ],
      }),
    );
    expect(completeSession).toHaveBeenCalledWith("5W362R");
    expect(warning).toBeNull();
  });

  it("does not complete workspace history again when backfilling a completed standup", async () => {
    const recordActions = vi.fn().mockResolvedValue([1]);
    const completeSession = vi.fn().mockResolvedValue({ id: 1 });

    const warning = await completeStandupWorkspaceHistory(
      {
        standupData: { ...standupData, status: "completed" },
        standupKey: "5W362R",
        isAuthenticated: true,
      },
      { recordActions, completeSession },
    );

    expect(recordActions).toHaveBeenCalledWith(
      expect.objectContaining({
        roomKey: "5W362R",
      }),
    );
    expect(completeSession).not.toHaveBeenCalled();
    expect(warning).toBeNull();
  });
});
