import type { AuthWorkerEnv } from "@sprintjam/types";

import { authenticateRequest, isAuthError, type AuthResult } from "../lib/auth";
import {
  forbiddenResponse,
  notFoundResponse,
  unauthorizedResponse,
} from "../lib/response";
import {
  canAccessTeam,
  canManageTeam,
  isActiveTeamMember,
} from "../lib/team-access";

export type WorkspaceViewer = {
  user: NonNullable<Awaited<ReturnType<AuthResult["repo"]["getUserById"]>>>;
  membership: NonNullable<
    Awaited<ReturnType<AuthResult["repo"]["getOrganisationMembership"]>>
  >;
  isWorkspaceAdmin: boolean;
};

export type TeamViewer = WorkspaceViewer & {
  team: NonNullable<Awaited<ReturnType<AuthResult["repo"]["getTeamById"]>>>;
  teamMembership: Awaited<
    ReturnType<AuthResult["repo"]["getTeamMembership"]>
  > | null;
  isTeamAdmin: boolean;
  isTeamMember: boolean;
  canAccess: boolean;
};

export async function getAuthOrError(
  request: Request,
  env: AuthWorkerEnv,
): Promise<{ result: AuthResult } | { response: Response }> {
  const result = await authenticateRequest(request, env.DB);

  if (isAuthError(result)) {
    if (result.code === "unauthorized") {
      return { response: unauthorizedResponse() };
    }

    return {
      response: unauthorizedResponse("Session expired", "session_expired"),
    };
  }

  return { result };
}

export async function getWorkspaceViewer(
  result: AuthResult,
): Promise<{ viewer: WorkspaceViewer } | { response: Response }> {
  const user = await result.repo.getUserById(result.userId);
  if (!user) {
    return { response: notFoundResponse("User not found") };
  }

  const membership = await result.repo.getOrganisationMembership(
    result.userId,
    user.organisationId,
  );
  if (!membership || membership.status !== "active") {
    return { response: forbiddenResponse("Workspace access is not active") };
  }

  const isWorkspaceAdmin = await result.repo.isOrganisationAdmin(
    result.userId,
    user.organisationId,
  );

  return {
    viewer: {
      user,
      membership,
      isWorkspaceAdmin,
    },
  };
}

export async function getTeamViewer(
  result: AuthResult,
  teamId: number,
): Promise<{ viewer: TeamViewer } | { response: Response }> {
  const workspace = await getWorkspaceViewer(result);
  if ("response" in workspace) {
    return workspace;
  }

  const team = await result.repo.getTeamById(teamId);
  if (!team) {
    return { response: notFoundResponse("Team not found") };
  }

  if (team.organisationId !== workspace.viewer.user.organisationId) {
    return { response: forbiddenResponse() };
  }

  const teamMembership = await result.repo.getTeamMembership(
    teamId,
    result.userId,
  );
  const isTeamMember = isActiveTeamMember(team, teamMembership, result.userId);
  const isTeamAdmin = canManageTeam(
    team,
    teamMembership,
    result.userId,
    workspace.viewer.isWorkspaceAdmin,
  );
  const canAccess = canAccessTeam(
    team,
    teamMembership,
    result.userId,
    workspace.viewer.isWorkspaceAdmin,
  );

  return {
    viewer: {
      ...workspace.viewer,
      team,
      teamMembership,
      isTeamAdmin,
      isTeamMember,
      canAccess,
    },
  };
}

export function requireTeamMemberWriteAccess(
  viewer: TeamViewer,
  message = "You must be a team member to update this team",
): Response | null {
  if (!viewer.isWorkspaceAdmin && !viewer.isTeamMember) {
    return forbiddenResponse(message);
  }

  return null;
}
