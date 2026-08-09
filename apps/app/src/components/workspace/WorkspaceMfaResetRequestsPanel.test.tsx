/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { WorkspaceMfaResetRequest } from "@sprintjam/types";

import { WorkspaceMfaResetRequestsPanel } from "./WorkspaceMfaResetRequestsPanel";
import {
  approveMfaResetRequest,
  rejectMfaResetRequest,
} from "@/lib/workspace-service";

vi.mock("@/lib/workspace-service", () => ({
  approveMfaResetRequest: vi.fn(),
  rejectMfaResetRequest: vi.fn(),
}));

vi.mock("@/components/ui", () => ({
  toast: { success: vi.fn() },
}));

const resetRequest = {
  id: 22,
  organisationId: 10,
  userId: 2,
  status: "pending",
  requestedAt: 1_786_277_600_000,
  expiresAt: 1_786_882_400_000,
  resolvedAt: null,
  resolvedById: null,
  email: "member@example.com",
  name: "Asha Patel",
  avatar: null,
} satisfies WorkspaceMfaResetRequest;

describe("WorkspaceMfaResetRequestsPanel", () => {
  it("requires confirmation before approving the reset", async () => {
    vi.mocked(approveMfaResetRequest).mockResolvedValue(undefined);
    const onRefresh = vi.fn().mockResolvedValue(undefined);

    render(
      <WorkspaceMfaResetRequestsPanel
        requests={[resetRequest]}
        currentUserId={1}
        onRefresh={onRefresh}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Approve reset" }));
    const approveButtons = await screen.findAllByRole("button", {
      name: "Approve reset",
    });
    fireEvent.click(approveButtons.at(-1)!);

    await waitFor(() => {
      expect(approveMfaResetRequest).toHaveBeenCalledWith(22);
      expect(onRefresh).toHaveBeenCalledOnce();
    });
  });

  it("prevents an admin from approving their own request", () => {
    render(
      <WorkspaceMfaResetRequestsPanel
        requests={[resetRequest]}
        currentUserId={2}
        onRefresh={vi.fn()}
      />,
    );

    expect(
      screen
        .getByRole("button", { name: "Approve reset" })
        .hasAttribute("disabled"),
    ).toBe(true);
    expect(
      screen.getByText("Another workspace admin must approve your request."),
    ).toBeTruthy();
  });

  it("lets admins reject a request after confirmation", async () => {
    vi.mocked(rejectMfaResetRequest).mockResolvedValue(undefined);

    render(
      <WorkspaceMfaResetRequestsPanel
        requests={[resetRequest]}
        currentUserId={1}
        onRefresh={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Reject" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "Reject request" }),
    );

    await waitFor(() => {
      expect(rejectMfaResetRequest).toHaveBeenCalledWith(22);
    });
  });
});
