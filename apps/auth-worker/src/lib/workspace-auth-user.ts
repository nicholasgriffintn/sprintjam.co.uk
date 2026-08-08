import type { AuthWorkerEnv } from "@sprintjam/types";
import { extractDomain } from "@sprintjam/utils";

import { WorkspaceAuthRepository } from "../repositories/workspace-auth";
import { findSprintJamAuthUser, type SprintJamAuthUser } from "./shared-auth";

export class WorkspaceAccessError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
    this.name = "WorkspaceAccessError";
  }
}

export async function resolveWorkspaceAuthUser(
  env: AuthWorkerEnv,
  email: string,
): Promise<SprintJamAuthUser> {
  const repo = new WorkspaceAuthRepository(env.DB);
  const domain = extractDomain(email);
  const [pendingInvite, existingUser, activeMembership, isDomainAllowed] =
    await Promise.all([
      repo.getPendingWorkspaceInviteByEmail(email),
      repo.getUserByEmail(email),
      repo.getActiveOrganisationMembershipByEmail(email),
      repo.isDomainAllowed(domain),
    ]);

  let organisationId: number;
  if (pendingInvite) {
    organisationId = pendingInvite.organisationId;
    if (existingUser && existingUser.organisationId !== organisationId) {
      await repo.updateUserOrganisation(existingUser.id, organisationId);
    }
  } else if (activeMembership) {
    organisationId = activeMembership.organisationId;
  } else if (isDomainAllowed) {
    organisationId = await repo.getOrCreateOrganisation(domain);
  } else {
    throw new WorkspaceAccessError(
      "Your workspace access is not allowed",
      403,
      "workspace_access_not_allowed",
    );
  }

  const userId = await repo.getOrCreateUser(email, organisationId);
  await repo.setOrganisationOwnerIfNull(organisationId, userId);
  const organisation = await repo.getOrganisationById(organisationId);
  if (!organisation) {
    throw new WorkspaceAccessError(
      "Organisation not found",
      404,
      "organisation_not_found",
    );
  }

  const role = organisation.ownerId === userId ? "admin" : "member";
  const existingMembership = await repo.getOrganisationMembership(
    userId,
    organisationId,
  );

  if (pendingInvite) {
    await repo.upsertWorkspaceMembership({
      organisationId,
      userId,
      role,
      status: "active",
      approvedById: pendingInvite.invitedById,
    });
    await repo.markWorkspaceInviteAccepted(pendingInvite.id, userId);
  } else if (!existingMembership || existingMembership.status !== "active") {
    if (organisation.requireMemberApproval && organisation.ownerId !== userId) {
      await repo.upsertWorkspaceMembership({
        organisationId,
        userId,
        role,
        status: "pending",
      });
      throw new WorkspaceAccessError(
        "Your workspace membership is pending approval",
        403,
        "workspace_membership_pending_approval",
      );
    }
    await repo.upsertWorkspaceMembership({
      organisationId,
      userId,
      role,
      status: "active",
      approvedById: organisation.ownerId === userId ? userId : null,
    });
  }

  const user = await findSprintJamAuthUser(env, userId);
  if (!user) {
    throw new WorkspaceAccessError("User not found", 404, "user_not_found");
  }
  return user;
}
