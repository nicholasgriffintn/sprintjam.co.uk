import type { AuthWorkerEnv } from "@sprintjam/types";
import { clearSessionCookie, hashToken } from "@sprintjam/utils";

import { WorkspaceAuthRepository } from "../../repositories/workspace-auth";
import { jsonError, jsonResponse } from "../../lib/response";
import { getSessionTokenFromRequest } from "../../lib/session";
import { buildWorkspaceTeam } from "../../lib/team-access";

const MAX_PROFILE_NAME_LENGTH = 64;
const MAX_PROFILE_AVATAR_LENGTH = 500;

export async function getCurrentUserController(
  request: Request,
  env: AuthWorkerEnv,
): Promise<Response> {
  const token = getSessionTokenFromRequest(request);
  if (!token) {
    return jsonError("Unauthorized", 401);
  }

  const tokenHash = await hashToken(token);
  const repo = new WorkspaceAuthRepository(env.DB);

  const session = await repo.validateSession(tokenHash);
  if (!session) {
    return jsonError("Invalid or expired session", 401);
  }

  const user = await repo.getUserByEmail(session.email);
  if (!user?.id) {
    return jsonError("User not found", 404);
  }

  const membership = await repo.getOrganisationMembership(
    user.id,
    user.organisationId,
  );
  if (!membership || membership.status !== "active") {
    return jsonError("Workspace access is not active", 403);
  }

  const isWorkspaceAdmin = await repo.isOrganisationAdmin(
    user.id,
    user.organisationId,
  );
  const teams = await repo.getOrganisationTeams(user.organisationId);
  const organisation = await repo.getOrganisationById(user.organisationId);
  if (!organisation) {
    return jsonError("Organisation not found", 404);
  }
  const hydratedTeams = await Promise.all(
    teams.map(async (team) => {
      const teamMembership = await repo.getTeamMembership(team.id, user.id);
      return buildWorkspaceTeam(team, teamMembership, user.id, isWorkspaceAdmin);
    }),
  );
  const members = (await repo.getOrganisationMembers(user.organisationId)).filter(
    (member) => member.status === "active" || isWorkspaceAdmin,
  );
  const invites = isWorkspaceAdmin
    ? await repo.listPendingWorkspaceInvites(user.organisationId)
    : [];

  return jsonResponse({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      organisationId: user.organisationId,
      avatar: user.avatar ?? null,
    },
    membership,
    organisation,
    teams: hydratedTeams,
    members,
    invites,
  });
}

export async function updateCurrentUserProfileController(
  request: Request,
  env: AuthWorkerEnv,
): Promise<Response> {
  const token = getSessionTokenFromRequest(request);
  if (!token) {
    return jsonError("Unauthorized", 401);
  }

  const tokenHash = await hashToken(token);
  const repo = new WorkspaceAuthRepository(env.DB);

  const session = await repo.validateSession(tokenHash);
  if (!session) {
    return jsonError("Invalid or expired session", 401);
  }

  const user = await repo.getUserByEmail(session.email);
  if (!user?.id) {
    return jsonError("User not found", 404);
  }

  const body = await request.json<{
    name?: string | null;
    avatar?: string | null;
  }>();

  const hasNameUpdate = Object.prototype.hasOwnProperty.call(body, "name");
  const hasAvatarUpdate = Object.prototype.hasOwnProperty.call(body, "avatar");

  if (!hasNameUpdate && !hasAvatarUpdate) {
    return jsonError("At least one field is required", 400);
  }

  let normalizedName: string | null | undefined;
  if (hasNameUpdate) {
    const nextName = body.name?.trim() ?? "";
    if (!nextName) {
      return jsonError("Profile name is required", 400);
    }
    if (nextName.length > MAX_PROFILE_NAME_LENGTH) {
      return jsonError(
        `Profile name must be ${MAX_PROFILE_NAME_LENGTH} characters or less`,
        400,
      );
    }
    normalizedName = nextName;
  }

  let normalizedAvatar: string | null | undefined;
  if (hasAvatarUpdate) {
    const nextAvatar = body.avatar?.trim() ?? "";
    if (!nextAvatar) {
      normalizedAvatar = null;
    } else {
      if (nextAvatar.length > MAX_PROFILE_AVATAR_LENGTH) {
        return jsonError(
          `Avatar must be ${MAX_PROFILE_AVATAR_LENGTH} characters or less`,
          400,
        );
      }
      normalizedAvatar = nextAvatar;
    }
  }

  await repo.updateUserProfile(user.id, {
    ...(hasNameUpdate ? { name: normalizedName } : {}),
    ...(hasAvatarUpdate ? { avatar: normalizedAvatar } : {}),
  });

  const updatedUser = await repo.getUserById(user.id);
  if (!updatedUser) {
    return jsonError("User not found", 404);
  }

  return jsonResponse({
    user: {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      organisationId: updatedUser.organisationId,
      avatar: updatedUser.avatar ?? null,
    },
  });
}

export async function logoutController(
  request: Request,
  env: AuthWorkerEnv,
): Promise<Response> {
  const token = getSessionTokenFromRequest(request);
  if (!token) {
    return jsonError("Unauthorized", 401);
  }

  const tokenHash = await hashToken(token);
  const repo = new WorkspaceAuthRepository(env.DB);

  await repo.invalidateSession(tokenHash);

  return new Response(
    JSON.stringify({
      message: "Logged out successfully",
    }),
    {
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": clearSessionCookie(),
      },
    },
  );
}
