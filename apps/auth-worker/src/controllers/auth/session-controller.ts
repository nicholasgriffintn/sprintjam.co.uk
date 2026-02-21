import type { AuthWorkerEnv } from "@sprintjam/types";
import { clearSessionCookie, hashToken } from "@sprintjam/utils";

import { WorkspaceAuthRepository } from "../../repositories/workspace-auth";
import { jsonError, jsonResponse } from "../../lib/response";
import { getSessionTokenFromRequest } from "../../lib/session";

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

  const teams = await repo.getUserTeams(user.id);
  const organisation = await repo.getOrganisationById(user.organisationId);
  if (!organisation) {
    return jsonError("Organisation not found", 404);
  }
  const members = await repo.getOrganisationMembers(user.organisationId);
  const invites = await repo.listPendingWorkspaceInvites(user.organisationId);

  return jsonResponse({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      organisationId: user.organisationId,
    },
    organisation,
    teams,
    members,
    invites,
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
