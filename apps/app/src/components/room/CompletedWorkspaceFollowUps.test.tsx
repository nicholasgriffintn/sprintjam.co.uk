/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ComponentProps } from "react";
import type { TeamSession } from "@sprintjam/types";

import { CompletedWorkspaceFollowUps } from "@/components/room/CompletedWorkspaceFollowUps";
import {
  createTeamSession,
  recordPlanningActionsByRoomKey,
} from "@/lib/workspace-service";

const authState = vi.hoisted(() => ({
  isAuthenticated: true,
  isLoading: false,
  teams: [{ id: 7, name: "Delivery" }],
}));
const goToLoginMock = vi.hoisted(() => vi.fn());

vi.mock("@/context/WorkspaceAuthContext", () => ({
  useWorkspaceAuth: () => authState,
}));

vi.mock("@/context/SessionContext", () => ({
  useSessionActions: () => ({
    goToLogin: goToLoginMock,
  }),
}));

vi.mock("@/lib/workspace-service", () => ({
  createTeamSession: vi.fn(),
  recordPlanningActionsByRoomKey: vi.fn(),
}));

const linkedSession: TeamSession = {
  id: 21,
  teamId: 7,
  roomKey: "ROOM1",
  name: "Sprint planning",
  createdById: 1,
  createdAt: 100,
  completedAt: 200,
  metadata: JSON.stringify({ type: "planning" }),
};

function renderComponent(
  props: Partial<ComponentProps<typeof CompletedWorkspaceFollowUps>> = {},
) {
  return render(
    <MemoryRouter initialEntries={["/room/ROOM1"]}>
      <CompletedWorkspaceFollowUps
        roomKey="ROOM1"
        suggestedName="Sprint planning"
        linkedWorkspaceSession={linkedSession}
        linkedWorkspaceTeamName="Delivery"
        onWorkspaceSessionSaved={vi.fn()}
        onOpenRenameWorkspaceSession={vi.fn()}
        {...props}
      />
    </MemoryRouter>,
  );
}

describe("CompletedWorkspaceFollowUps", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.isAuthenticated = true;
    authState.isLoading = false;
    authState.teams = [{ id: 7, name: "Delivery" }];
  });

  it("records follow-ups against an existing workspace planning session", async () => {
    vi.mocked(recordPlanningActionsByRoomKey).mockResolvedValue([41]);
    renderComponent();

    fireEvent.change(screen.getByTestId("completed-follow-ups-textarea"), {
      target: { value: "Check API owner\n- Confirm release risk" },
    });
    fireEvent.click(screen.getByTestId("completed-follow-ups-save"));

    await waitFor(() => {
      expect(recordPlanningActionsByRoomKey).toHaveBeenCalledWith({
        roomKey: "ROOM1",
        followUps: [
          { title: "Check API owner" },
          { title: "Confirm release risk" },
        ],
      });
    });
    expect(createTeamSession).not.toHaveBeenCalled();
  });

  it("creates the workspace session before saving completion follow-ups", async () => {
    const onSaved = vi.fn();
    const createdSession = { ...linkedSession, id: 22 };
    vi.mocked(createTeamSession).mockResolvedValue(createdSession);
    vi.mocked(recordPlanningActionsByRoomKey).mockResolvedValue([41]);
    renderComponent({
      linkedWorkspaceSession: null,
      linkedWorkspaceTeamName: null,
      onWorkspaceSessionSaved: onSaved,
    });

    fireEvent.change(screen.getByTestId("completed-follow-ups-textarea"), {
      target: { value: "Review the rollout notes" },
    });
    fireEvent.click(screen.getByTestId("completed-follow-ups-save"));

    await waitFor(() => {
      expect(createTeamSession).toHaveBeenCalledWith(
        7,
        "Sprint planning",
        "ROOM1",
        expect.objectContaining({
          type: "planning",
        }),
      );
    });
    expect(recordPlanningActionsByRoomKey).toHaveBeenCalledWith({
      roomKey: "ROOM1",
      followUps: [{ title: "Review the rollout notes" }],
    });
    expect(onSaved).toHaveBeenCalledWith(createdSession);
  });
});
