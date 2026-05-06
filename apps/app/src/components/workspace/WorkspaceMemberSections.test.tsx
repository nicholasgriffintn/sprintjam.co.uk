/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { WorkspaceInvite, WorkspaceMember } from "@sprintjam/types";

import { WorkspaceMemberSections } from "@/components/workspace/WorkspaceMemberSections";

const baseMember = {
  id: 1,
  email: "asha@sprintjam.local",
  name: "Asha Patel",
  avatar: null,
  createdAt: 1_700_000_000_000,
  lastLoginAt: null,
  role: "member",
  status: "active",
  approvedAt: 1_700_000_000_000,
} satisfies WorkspaceMember;

const pendingMember = {
  ...baseMember,
  id: 2,
  email: "ben@sprintjam.local",
  name: "Ben Carter",
  avatar: "https://example.com/ben.png",
  status: "pending",
  approvedAt: null,
} satisfies WorkspaceMember;

const invite = {
  id: 3,
  organisationId: 1,
  email: "dev@sprintjam.local",
  invitedById: 1,
  acceptedById: null,
  createdAt: 1_700_000_000_000,
  updatedAt: 1_700_000_000_000,
  acceptedAt: null,
  revokedAt: null,
} satisfies WorkspaceInvite;

describe("WorkspaceMemberSections", () => {
  it("shows pending access before active members and uses available avatars", () => {
    render(
      <WorkspaceMemberSections
        activeMembers={[baseMember]}
        pendingMembers={[pendingMember]}
        invites={[invite]}
        isWorkspaceAdmin={true}
        isUpdatingMemberId={null}
        onApproveMember={vi.fn()}
        onRemoveMember={vi.fn()}
        onRoleChange={vi.fn()}
      />,
    );

    const pendingHeading = screen.getByText("Pending access (2)");
    const membersHeading = screen.getByText("Workspace members (1)");

    expect(
      pendingHeading.compareDocumentPosition(membersHeading) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.getByAltText("Ben Carter").getAttribute("src")).toBe(
      "https://example.com/ben.png",
    );
    expect(screen.getByText("Asha Patel")).toBeTruthy();
    expect(screen.getByText("dev@sprintjam.local")).toBeTruthy();
  });

  it("keeps member actions wired to the selected row", () => {
    const onApproveMember = vi.fn();
    const onRemoveMember = vi.fn();
    const onRoleChange = vi.fn();

    render(
      <WorkspaceMemberSections
        activeMembers={[baseMember]}
        pendingMembers={[pendingMember]}
        invites={[]}
        isWorkspaceAdmin={true}
        isUpdatingMemberId={null}
        onApproveMember={onApproveMember}
        onRemoveMember={onRemoveMember}
        onRoleChange={onRoleChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Approve" }));
    fireEvent.click(screen.getByRole("button", { name: "Make admin" }));

    expect(onApproveMember).toHaveBeenCalledWith(pendingMember);
    expect(onRoleChange).toHaveBeenCalledWith(baseMember, "admin");
  });
});
