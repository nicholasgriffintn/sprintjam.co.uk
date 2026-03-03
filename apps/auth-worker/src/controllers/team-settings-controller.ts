import type { AuthWorkerEnv, RoomSettings } from "@sprintjam/types";
import { authenticateRequest, isAuthError, type AuthResult } from "../lib/auth";
import {
  jsonResponse,
  jsonError,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
} from "../lib/response";
import { canAccessTeam, canManageTeam } from "../lib/team-access";

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

const ALLOWED_SETTINGS_KEYS = new Set<string>([
  "estimateOptions",
  "voteOptionsMetadata",
  "allowOthersToShowEstimates",
  "allowOthersToDeleteEstimates",
  "allowOthersToManageQueue",
  "allowVotingAfterReveal",
  "enableAutoReveal",
  "alwaysRevealVotes",
  "capacityPoints",
  "showTimer",
  "showUserPresence",
  "showAverage",
  "showMedian",
  "showTopVotes",
  "topVotesCount",
  "anonymousVotes",
  "enableFacilitationGuidance",
  "enableJudge",
  "judgeAlgorithm",
  "hideParticipantNames",
  "externalService",
  "autoSyncEstimates",
  "enableTicketQueue",
  "enableStructuredVoting",
  "votingCriteria",
  "resultsDisplay",
  "structuredVotingDisplay",
  "autoHandoverModerator",
  "enableStrudelPlayer",
  "strudelAutoGenerate",
  "votingSequenceId",
  "customEstimateOptions",
  "extraVoteOptions",
]);

function sanitizeSettings(raw: Record<string, unknown>): Partial<RoomSettings> {
  const sanitized: Record<string, unknown> = {};
  for (const key of Object.keys(raw)) {
    if (ALLOWED_SETTINGS_KEYS.has(key)) {
      sanitized[key] = raw[key];
    }
  }
  return sanitized as Partial<RoomSettings>;
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

  const isWorkspaceAdmin = await repo.isOrganisationAdmin(
    userId,
    user.organisationId,
  );
  const teamMembership = await repo.getTeamMembership(teamId, userId);
  const canAccess = canAccessTeam(
    team,
    teamMembership,
    userId,
    isWorkspaceAdmin,
  );

  if (!canAccess) {
    return forbiddenResponse("You do not have access to this team");
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

  const user = await repo.getUserById(userId);
  if (!user || user.organisationId !== team.organisationId) {
    return forbiddenResponse();
  }

  const isWorkspaceAdmin = await repo.isOrganisationAdmin(
    userId,
    user.organisationId,
  );
  const teamMembership = await repo.getTeamMembership(teamId, userId);
  const isTeamAdmin = canManageTeam(
    team,
    teamMembership,
    userId,
    isWorkspaceAdmin,
  );
  if (!isTeamAdmin) {
    return forbiddenResponse("Only team admins can update team settings");
  }

  let settings: Partial<RoomSettings>;
  try {
    const body = await request.json<{ settings?: Record<string, unknown> }>();
    if (
      !body?.settings ||
      typeof body.settings !== "object" ||
      Array.isArray(body.settings)
    ) {
      return jsonError("settings object is required", 400);
    }
    settings = sanitizeSettings(body.settings);
  } catch {
    return jsonError("Invalid request body", 400);
  }

  const existing = await repo.getTeamSettings(teamId);
  const merged = { ...(existing ?? {}), ...settings } as RoomSettings;
  await repo.saveTeamSettings(teamId, merged);
  return jsonResponse({ settings: merged });
}
