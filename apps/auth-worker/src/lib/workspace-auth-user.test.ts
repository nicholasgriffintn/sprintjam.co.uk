import { beforeEach, describe, expect, it, vi } from "vitest";

import { createTestAuthWorkerEnv } from "../test/auth-worker-env";
import {
  resolveWorkspaceAuthUser,
  WorkspaceAccessError,
} from "./workspace-auth-user";

const dependencyMocks = vi.hoisted(() => ({
  findSprintJamAuthUser: vi.fn(),
  workspaceAuthRepository: vi.fn(),
}));

vi.mock("../repositories/workspace-auth", () => ({
  WorkspaceAuthRepository: dependencyMocks.workspaceAuthRepository,
}));

vi.mock("./shared-auth", async () => {
  const actual = await vi.importActual("./shared-auth");
  return {
    ...actual,
    findSprintJamAuthUser: dependencyMocks.findSprintJamAuthUser,
  };
});

const env = createTestAuthWorkerEnv();
const authUser = {
  id: "501",
  email: "invitee@external.example",
  name: null,
  organisationId: 42,
  workspaceRole: "member" as const,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
};

describe("resolveWorkspaceAuthUser", () => {
  const repository = {
    getActiveOrganisationMembershipByEmail: vi.fn(),
    getOrCreateOrganisation: vi.fn(),
    getOrCreateUser: vi.fn(),
    getOrganisationById: vi.fn(),
    getOrganisationMembership: vi.fn(),
    getPendingWorkspaceInviteByEmail: vi.fn(),
    getUserByEmail: vi.fn(),
    isDomainAllowed: vi.fn(),
    markWorkspaceInviteAccepted: vi.fn(),
    setOrganisationOwnerIfNull: vi.fn(),
    updateUserOrganisation: vi.fn(),
    upsertWorkspaceMembership: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    dependencyMocks.workspaceAuthRepository.mockImplementation(function () {
      return repository;
    });
    dependencyMocks.findSprintJamAuthUser.mockResolvedValue(authUser);
    repository.getActiveOrganisationMembershipByEmail.mockResolvedValue(null);
    repository.getOrCreateOrganisation.mockResolvedValue(42);
    repository.getOrCreateUser.mockResolvedValue(501);
    repository.getOrganisationById.mockResolvedValue({
      id: 42,
      ownerId: 99,
      requireMemberApproval: false,
    });
    repository.getOrganisationMembership.mockResolvedValue(null);
    repository.getPendingWorkspaceInviteByEmail.mockResolvedValue(null);
    repository.getUserByEmail.mockResolvedValue(null);
    repository.isDomainAllowed.mockResolvedValue(false);
    repository.markWorkspaceInviteAccepted.mockResolvedValue(undefined);
    repository.setOrganisationOwnerIfNull.mockResolvedValue(undefined);
    repository.updateUserOrganisation.mockResolvedValue(undefined);
    repository.upsertWorkspaceMembership.mockResolvedValue(undefined);
  });

  it("rejects an email without an invite, membership, or allowed domain", async () => {
    await expect(
      resolveWorkspaceAuthUser(env, "blocked@external.example"),
    ).rejects.toEqual(
      new WorkspaceAccessError(
        "Your workspace access is not allowed",
        403,
        "workspace_access_not_allowed",
      ),
    );

    expect(repository.getOrCreateUser).not.toHaveBeenCalled();
  });

  it("accepts an invite into its organisation and activates membership", async () => {
    repository.getPendingWorkspaceInviteByEmail.mockResolvedValue({
      id: 19,
      organisationId: 42,
      invitedById: 7,
    });
    repository.getUserByEmail.mockResolvedValue({
      id: 501,
      organisationId: 3,
    });

    const result = await resolveWorkspaceAuthUser(
      env,
      "invitee@external.example",
    );

    expect(result).toBe(authUser);
    expect(repository.updateUserOrganisation).toHaveBeenCalledWith(501, 42);
    expect(repository.getOrCreateOrganisation).not.toHaveBeenCalled();
    expect(repository.upsertWorkspaceMembership).toHaveBeenCalledWith({
      organisationId: 42,
      userId: 501,
      role: "member",
      status: "active",
      approvedById: 7,
    });
    expect(repository.markWorkspaceInviteAccepted).toHaveBeenCalledWith(
      19,
      501,
    );
  });

  it("uses an existing active membership without creating an organisation", async () => {
    repository.getActiveOrganisationMembershipByEmail.mockResolvedValue({
      organisationId: 42,
      status: "active",
    });
    repository.getOrganisationMembership.mockResolvedValue({
      role: "member",
      status: "active",
    });

    const result = await resolveWorkspaceAuthUser(
      env,
      "invitee@external.example",
    );

    expect(result).toBe(authUser);
    expect(repository.getOrCreateOrganisation).not.toHaveBeenCalled();
    expect(repository.upsertWorkspaceMembership).not.toHaveBeenCalled();
  });

  it("activates the organisation owner without approval", async () => {
    repository.isDomainAllowed.mockResolvedValue(true);
    repository.getOrganisationById.mockResolvedValue({
      id: 42,
      ownerId: 501,
      requireMemberApproval: true,
    });

    await resolveWorkspaceAuthUser(env, "owner@external.example");

    expect(repository.getOrCreateOrganisation).toHaveBeenCalledWith(
      "external.example",
    );
    expect(repository.upsertWorkspaceMembership).toHaveBeenCalledWith({
      organisationId: 42,
      userId: 501,
      role: "admin",
      status: "active",
      approvedById: 501,
    });
  });

  it("persists a pending membership before rejecting an unapproved member", async () => {
    repository.isDomainAllowed.mockResolvedValue(true);
    repository.getOrganisationById.mockResolvedValue({
      id: 42,
      ownerId: 1,
      requireMemberApproval: true,
    });

    await expect(
      resolveWorkspaceAuthUser(env, "member@external.example"),
    ).rejects.toEqual(
      new WorkspaceAccessError(
        "Your workspace membership is pending approval",
        403,
        "workspace_membership_pending_approval",
      ),
    );

    expect(repository.upsertWorkspaceMembership).toHaveBeenCalledWith({
      organisationId: 42,
      userId: 501,
      role: "member",
      status: "pending",
    });
    expect(dependencyMocks.findSprintJamAuthUser).not.toHaveBeenCalled();
  });
});
