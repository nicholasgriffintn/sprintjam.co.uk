import type { AuthWorkerEnv } from "@sprintjam/types";
import { sendWorkspaceInviteEmail } from "@sprintjam/services";
import { jsonError } from "../lib/response";

import { authenticateRequest, isAuthError, type AuthResult } from "../lib/auth";
import { EMAIL_REGEX } from "../lib/auth-helpers";
import {
  jsonResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
} from "../lib/response";

const MAX_WORKSPACE_NAME_LENGTH = 120;
const MAX_LOGO_URL_LENGTH = 500;

async function getAuthOrError(
  request: Request,
  env: AuthWorkerEnv,
): Promise<{ result: AuthResult } | { response: Response }> {
  const result = await authenticateRequest(request, env.DB);

  if (isAuthError(result)) {
    if (result.code === "unauthorized") {
      return { response: unauthorizedResponse() };
    }
    return { response: unauthorizedResponse("Session expired") };
  }

  return { result };
}

export async function listTeamsController(
  request: Request,
  env: AuthWorkerEnv,
): Promise<Response> {
  const auth = await getAuthOrError(request, env);

  if ("response" in auth) {
    return auth.response;
  }

  const { userId, repo } = auth.result;
  const teams = await repo.getUserTeams(userId);

  return jsonResponse({ teams });
}

export async function createTeamController(
  request: Request,
  env: AuthWorkerEnv,
): Promise<Response> {
  const auth = await getAuthOrError(request, env);

  if ("response" in auth) {
    return auth.response;
  }

  const { userId, repo } = auth.result;
  const body = await request.json<{ name?: string }>();
  const name = body?.name?.trim();

  if (!name) {
    return jsonError("Team name is required", 400);
  }

  if (name.length > 100) {
    return jsonError("Team name must be 100 characters or less", 400);
  }

  const user = await repo.getUserById(userId);
  if (!user) {
    return notFoundResponse("User not found");
  }

  const teamId = await repo.createTeam(user.organisationId, name, userId);
  const team = await repo.getTeamById(teamId);

  return jsonResponse({ team }, 201);
}

export async function getTeamController(
  request: Request,
  env: AuthWorkerEnv,
  teamId: number,
): Promise<Response> {
  const auth = await getAuthOrError(request, env);

  if ("response" in auth) {
    return auth.response;
  }

  const { userId, repo } = auth.result;
  const team = await repo.getTeamById(teamId);

  if (!team) {
    return notFoundResponse("Team not found");
  }

  const user = await repo.getUserById(userId);
  if (!user || user.organisationId !== team.organisationId) {
    return forbiddenResponse();
  }

  return jsonResponse({ team });
}

export async function updateTeamController(
  request: Request,
  env: AuthWorkerEnv,
  teamId: number,
): Promise<Response> {
  const auth = await getAuthOrError(request, env);

  if ("response" in auth) {
    return auth.response;
  }

  const { userId, repo } = auth.result;
  const team = await repo.getTeamById(teamId);

  if (!team) {
    return notFoundResponse("Team not found");
  }

  if (team.ownerId !== userId) {
    return forbiddenResponse("Only the team owner can update the team");
  }

  const body = await request.json<{ name?: string }>();
  const name = body?.name?.trim();

  if (!name) {
    return jsonError("Team name is required", 400);
  }

  if (name.length > 100) {
    return jsonError("Team name must be 100 characters or less", 400);
  }

  await repo.updateTeam(teamId, { name });
  const updatedTeam = await repo.getTeamById(teamId);

  return jsonResponse({ team: updatedTeam });
}

export async function deleteTeamController(
  request: Request,
  env: AuthWorkerEnv,
  teamId: number,
): Promise<Response> {
  const auth = await getAuthOrError(request, env);

  if ("response" in auth) {
    return auth.response;
  }

  const { userId, repo } = auth.result;
  const team = await repo.getTeamById(teamId);

  if (!team) {
    return notFoundResponse("Team not found");
  }

  if (team.ownerId !== userId) {
    return forbiddenResponse("Only the team owner can delete the team");
  }

  await repo.deleteTeam(teamId);

  return jsonResponse({ message: "Team deleted successfully" });
}

export async function listTeamSessionsController(
  request: Request,
  env: AuthWorkerEnv,
  teamId: number,
): Promise<Response> {
  const auth = await getAuthOrError(request, env);

  if ("response" in auth) {
    return auth.response;
  }

  const { userId, repo } = auth.result;
  const team = await repo.getTeamById(teamId);

  if (!team) {
    return notFoundResponse("Team not found");
  }

  const isOwner = await repo.isTeamOwner(teamId, userId);
  if (!isOwner) {
    return forbiddenResponse("Only the team owner can access team sessions");
  }

  const sessions = await repo.getTeamSessions(teamId);

  return jsonResponse({ sessions });
}

export async function createTeamSessionController(
  request: Request,
  env: AuthWorkerEnv,
  teamId: number,
): Promise<Response> {
  const auth = await getAuthOrError(request, env);

  if ("response" in auth) {
    return auth.response;
  }

  const { userId, repo } = auth.result;
  const team = await repo.getTeamById(teamId);

  if (!team) {
    return notFoundResponse("Team not found");
  }

  const isOwner = await repo.isTeamOwner(teamId, userId);
  if (!isOwner) {
    return forbiddenResponse("Only the team owner can access team sessions");
  }

  const body = await request.json<{
    name?: string;
    roomKey?: string;
    metadata?: Record<string, unknown>;
  }>();

  const name = body?.name?.trim();
  const roomKey = body?.roomKey?.trim();

  if (!name) {
    return jsonError("Session name is required", 400);
  }

  if (!roomKey) {
    return jsonError("Room key is required", 400);
  }

  if (body?.metadata) {
    const metadataString = JSON.stringify(body.metadata);
    if (metadataString.length > 10000) {
      return jsonError("Metadata is too large (max 10KB)", 400);
    }
  }

  const sessionId = await repo.createTeamSession(
    teamId,
    roomKey,
    name,
    userId,
    body?.metadata,
  );

  const session = await repo.getTeamSessionById(sessionId);

  return jsonResponse({ session }, 201);
}

export async function getTeamSessionController(
  request: Request,
  env: AuthWorkerEnv,
  teamId: number,
  sessionId: number,
): Promise<Response> {
  const auth = await getAuthOrError(request, env);

  if ("response" in auth) {
    return auth.response;
  }

  const { userId, repo } = auth.result;
  const team = await repo.getTeamById(teamId);

  if (!team) {
    return notFoundResponse("Team not found");
  }

  const isOwner = await repo.isTeamOwner(teamId, userId);
  if (!isOwner) {
    return forbiddenResponse("Only the team owner can access team sessions");
  }

  const session = await repo.getTeamSessionById(sessionId);

  if (!session || session.teamId !== teamId) {
    return notFoundResponse("Session not found");
  }

  return jsonResponse({ session });
}

export async function completeSessionByRoomKeyController(
  request: Request,
  env: AuthWorkerEnv,
): Promise<Response> {
  const auth = await getAuthOrError(request, env);

  if ("response" in auth) {
    return auth.response;
  }

  const { userId, repo } = auth.result;
  const body = await request.json<{ roomKey?: string }>();
  const roomKey = body?.roomKey?.trim();

  if (!roomKey) {
    return jsonError("Room key is required", 400);
  }

  const updatedSession = await repo.completeLatestSessionByRoomKey(
    roomKey,
    userId,
  );

  if (!updatedSession) {
    return notFoundResponse("Session not found");
  }

  return jsonResponse({ session: updatedSession });
}

export async function getWorkspaceStatsController(
  request: Request,
  env: AuthWorkerEnv,
): Promise<Response> {
  const auth = await getAuthOrError(request, env);

  if ("response" in auth) {
    return auth.response;
  }

  const { userId, repo } = auth.result;
  const stats = await repo.getWorkspaceStats(userId);

  return jsonResponse(stats);
}

export async function updateWorkspaceProfileController(
  request: Request,
  env: AuthWorkerEnv,
): Promise<Response> {
  const auth = await getAuthOrError(request, env);

  if ("response" in auth) {
    return auth.response;
  }

  const { userId, repo } = auth.result;
  const user = await repo.getUserById(userId);
  if (!user) {
    return notFoundResponse("User not found");
  }

  const body = await request.json<{ name?: string; logoUrl?: string | null }>();
  const nextName = body?.name?.trim();
  const hasNameUpdate = typeof nextName === "string";
  const hasLogoUpdate =
    typeof body === "object" &&
    body !== null &&
    Object.prototype.hasOwnProperty.call(body, "logoUrl");

  if (!hasNameUpdate && !hasLogoUpdate) {
    return jsonError("At least one field is required", 400);
  }

  if (hasNameUpdate) {
    if (!nextName) {
      return jsonError("Workspace name is required", 400);
    }
    if (nextName.length > MAX_WORKSPACE_NAME_LENGTH) {
      return jsonError(
        `Workspace name must be ${MAX_WORKSPACE_NAME_LENGTH} characters or less`,
        400,
      );
    }
  }

  let normalizedLogoUrl: string | null | undefined;
  if (hasLogoUpdate) {
    if (body.logoUrl === null) {
      normalizedLogoUrl = null;
    } else {
      const trimmed = body.logoUrl?.trim() ?? "";
      if (!trimmed) {
        normalizedLogoUrl = null;
      } else {
        if (trimmed.length > MAX_LOGO_URL_LENGTH) {
          return jsonError(
            `Logo URL must be ${MAX_LOGO_URL_LENGTH} characters or less`,
            400,
          );
        }

        let parsed: URL;
        try {
          parsed = new URL(trimmed);
        } catch {
          return jsonError("Logo URL must be a valid URL", 400);
        }

        if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
          return jsonError("Logo URL must start with http:// or https://", 400);
        }

        normalizedLogoUrl = parsed.toString();
      }
    }
  }

  await repo.updateOrganisation(user.organisationId, {
    ...(hasNameUpdate ? { name: nextName } : {}),
    ...(hasLogoUpdate ? { logoUrl: normalizedLogoUrl ?? null } : {}),
  });

  const organisation = await repo.getOrganisationById(user.organisationId);
  return jsonResponse({ organisation });
}

export async function inviteWorkspaceMemberController(
  request: Request,
  env: AuthWorkerEnv,
): Promise<Response> {
  const auth = await getAuthOrError(request, env);

  if ("response" in auth) {
    return auth.response;
  }

  const { userId, repo } = auth.result;
  const user = await repo.getUserById(userId);
  if (!user) {
    return notFoundResponse("User not found");
  }

  const body = await request.json<{ email?: string }>();
  const email = body?.email?.toLowerCase().trim();

  if (!email) {
    return jsonError("Email is required", 400);
  }

  if (!EMAIL_REGEX.test(email)) {
    return jsonError("Invalid email format", 400);
  }

  if (email === user.email.toLowerCase()) {
    return jsonError("You are already a workspace member", 409);
  }

  const existingUser = await repo.getUserByEmail(email);
  if (existingUser && existingUser.organisationId === user.organisationId) {
    return jsonError("This user is already in your workspace", 409);
  }

  const invite = await repo.createOrUpdateWorkspaceInvite(
    user.organisationId,
    email,
    user.id,
  );

  if (!invite) {
    return jsonError("Unable to create invite", 500);
  }

  const organisation = await repo.getOrganisationById(user.organisationId);
  const workspaceName = organisation?.name ?? "your workspace";
  const inviterName = user.name?.trim() || user.email;
  const loginUrl = `${new URL(request.url).origin}/login`;

  try {
    await sendWorkspaceInviteEmail({
      email,
      workspaceName,
      inviterName,
      loginUrl,
      resendApiKey: env.RESEND_API_KEY,
    });
  } catch (error) {
    console.error("Failed to send workspace invite email:", error);
    return jsonError("Invite created but email could not be sent", 500);
  }

  return jsonResponse({ invite }, 201);
}
