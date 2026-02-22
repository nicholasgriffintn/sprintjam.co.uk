import type { AuthWorkerEnv, RoomSettings } from "@sprintjam/types";
import { authenticateRequest, isAuthError, type AuthResult } from "../lib/auth";
import {
  jsonResponse,
  jsonError,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
} from "../lib/response";

async function getAuthOrError(
  request: Request,
  env: AuthWorkerEnv,
): Promise<{ result: AuthResult } | { response: Response }> {
  const result = await authenticateRequest(request, env.DB);
  if (isAuthError(result)) {
    return { response: unauthorizedResponse() };
  }
  return { result };
}

export async function getTeamSettingsController(
  request: Request,
  env: AuthWorkerEnv,
  teamId: number,
): Promise<Response> {
  const auth = await getAuthOrError(request, env);
  if ("response" in auth) return auth.response;

  const { userId, repo } = auth.result;
  const team = await repo.getTeamById(teamId);

  if (!team) return notFoundResponse("Team not found");

  const user = await repo.getUserById(userId);
  if (!user || user.organisationId !== team.organisationId) {
    return forbiddenResponse();
  }

  const settings = await repo.getTeamSettings(teamId);
  return jsonResponse({ settings });
}

export async function saveTeamSettingsController(
  request: Request,
  env: AuthWorkerEnv,
  teamId: number,
): Promise<Response> {
  const auth = await getAuthOrError(request, env);
  if ("response" in auth) return auth.response;

  const { userId, repo } = auth.result;
  const team = await repo.getTeamById(teamId);

  if (!team) return notFoundResponse("Team not found");

  if (team.ownerId !== userId) {
    return forbiddenResponse("Only the team owner can update team settings");
  }

  let settings: RoomSettings;
  try {
    const body = await request.json<{ settings?: RoomSettings }>();
    if (!body?.settings || typeof body.settings !== "object") {
      return jsonError("settings object is required", 400);
    }
    settings = body.settings;
  } catch {
    return jsonError("Invalid request body", 400);
  }

  await repo.saveTeamSettings(teamId, settings);
  return jsonResponse({ settings });
}
