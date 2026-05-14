import type { AuthWorkerEnv } from "@sprintjam/types";
import { isTeamSlug, validateRequestBodySize } from "@sprintjam/utils";

import {
  requestMagicLinkController,
  verifyCodeController,
  startMfaSetupController,
  verifyMfaSetupController,
  startMfaVerifyController,
  verifyMfaController,
  getCurrentUserController,
  updateCurrentUserProfileController,
  logoutController,
} from "../controllers/auth-controller";
import {
  listTeamsController,
  createTeamController,
  getTeamController,
  updateTeamController,
  deleteTeamController,
  listTeamMembersController,
  addTeamMemberController,
  requestTeamAccessController,
  approveTeamMemberController,
  moveTeamMemberController,
  updateTeamMemberController,
  removeTeamMemberController,
  listTeamSessionsController,
  createTeamSessionController,
  getTeamSessionController,
  getTeamSessionByRoomKeyController,
  updateTeamSessionController,
  resolveTeamSessionRecapActionController,
  completeSessionByRoomKeyController,
  getWorkspaceProfileController,
  getWorkspaceStatsController,
  requireTeamMemberInternalController,
  updateWorkspaceProfileController,
  approveWorkspaceMemberController,
  updateWorkspaceMemberController,
  removeWorkspaceMemberController,
  inviteWorkspaceMemberController,
} from "../controllers/teams-controller";
import {
  createWorkspaceActionController,
  createWorkspaceActionEventController,
  createWorkspaceProcessLoopController,
  linkTeamSessionToProcessLoopController,
  listWorkspaceActionsController,
  listWorkspaceProcessLoopsController,
  recordPlanningActionsByRoomKeyController,
  recordStandupActionsByRoomKeyController,
  recordWheelOutcomeByRoomKeyController,
  updateWorkspaceActionController,
} from "../controllers/workspace-action-controllers";
import {
  getTeamRetroSettingsController,
  getTeamSettingsController,
  saveTeamRetroSettingsController,
  saveTeamSettingsController,
} from "../controllers/team-settings-controller";
import {
  deleteTeamCollaborationInstallationController,
  listTeamCollaborationInstallationsController,
  resolveTeamsCollaborationInstallationController,
  saveTeamsCollaborationInstallationController,
} from "../controllers/team-collaboration-controller";
import {
  listTeamIntegrationsController,
  getTeamIntegrationStatusController,
  listTeamIntegrationBoardsController,
  listTeamIntegrationSprintsController,
  searchTeamIntegrationTicketsController,
  initiateTeamOAuthController,
  handleJiraTeamOAuthCallbackController,
  handleLinearTeamOAuthCallbackController,
  handleGithubTeamOAuthCallbackController,
  revokeTeamIntegrationController,
  getTeamCredentialsInternalController,
  refreshTeamCredentialsInternalController,
} from "../controllers/team-integrations-controller";
import { jsonError, jsonResponse, notFoundResponse } from "../lib/response";
import { TeamRepository } from "../repositories/team-repository";

type HandlerParam = string | number;
type HandlerParams = HandlerParam[];
type RouteHandler = (
  request: Request,
  env: AuthWorkerEnv,
  params: HandlerParams,
) => Response | Promise<Response>;

interface RouteDefinition {
  method: string;
  pattern: RegExp;
  handler: RouteHandler;
  paramTypes: ("none" | "string" | "number")[];
}

function requireNumberParam(
  value: HandlerParam,
  name: string,
): { ok: true; value: number } | { ok: false; response: Response } {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return { ok: false, response: jsonError(`Invalid ${name}`, 400) };
  }
  return { ok: true, value };
}

async function requireTeamSlugParam(
  env: AuthWorkerEnv,
  value: HandlerParam,
): Promise<{ ok: true; value: number } | { ok: false; response: Response }> {
  if (typeof value !== "string" || !isTeamSlug(value)) {
    return { ok: false, response: jsonError("Invalid team slug", 400) };
  }

  const team = await new TeamRepository(env.DB).getTeamBySlug(value);
  if (!team) {
    return { ok: false, response: notFoundResponse("Team not found") };
  }

  return { ok: true, value: team.id };
}

const ROUTES: RouteDefinition[] = [
  {
    method: "POST",
    pattern: /^auth\/magic-link$/,
    handler: (request, env) => requestMagicLinkController(request, env),
    paramTypes: ["none"],
  },
  {
    method: "POST",
    pattern: /^auth\/verify$/,
    handler: (request, env) => verifyCodeController(request, env),
    paramTypes: ["none"],
  },
  {
    method: "POST",
    pattern: /^auth\/mfa\/setup\/start$/,
    handler: (request, env) => startMfaSetupController(request, env),
    paramTypes: ["none"],
  },
  {
    method: "POST",
    pattern: /^auth\/mfa\/setup\/verify$/,
    handler: (request, env) => verifyMfaSetupController(request, env),
    paramTypes: ["none"],
  },
  {
    method: "POST",
    pattern: /^auth\/mfa\/verify\/start$/,
    handler: (request, env) => startMfaVerifyController(request, env),
    paramTypes: ["none"],
  },
  {
    method: "POST",
    pattern: /^auth\/mfa\/verify$/,
    handler: (request, env) => verifyMfaController(request, env),
    paramTypes: ["none"],
  },
  {
    method: "GET",
    pattern: /^auth\/me$/,
    handler: (request, env) => getCurrentUserController(request, env),
    paramTypes: ["none"],
  },
  {
    method: "PUT",
    pattern: /^auth\/me$/,
    handler: (request, env) => updateCurrentUserProfileController(request, env),
    paramTypes: ["none"],
  },
  {
    method: "POST",
    pattern: /^auth\/logout$/,
    handler: (request, env) => logoutController(request, env),
    paramTypes: ["none"],
  },
  {
    method: "GET",
    pattern: /^teams$/,
    handler: (request, env) => listTeamsController(request, env),
    paramTypes: ["none"],
  },
  {
    method: "POST",
    pattern: /^teams$/,
    handler: (request, env) => createTeamController(request, env),
    paramTypes: ["none"],
  },
  {
    method: "GET",
    pattern: /^teams\/([a-z]+(?:-[a-z]+){2})$/,
    handler: async (request, env, params) => {
      const teamIdResult = await requireTeamSlugParam(env, params[0]);
      if (!teamIdResult.ok) return teamIdResult.response;
      return getTeamController(request, env, teamIdResult.value);
    },
    paramTypes: ["string"],
  },
  {
    method: "PUT",
    pattern: /^teams\/([a-z]+(?:-[a-z]+){2})$/,
    handler: async (request, env, params) => {
      const teamIdResult = await requireTeamSlugParam(env, params[0]);
      if (!teamIdResult.ok) return teamIdResult.response;
      return updateTeamController(request, env, teamIdResult.value);
    },
    paramTypes: ["string"],
  },
  {
    method: "DELETE",
    pattern: /^teams\/([a-z]+(?:-[a-z]+){2})$/,
    handler: async (request, env, params) => {
      const teamIdResult = await requireTeamSlugParam(env, params[0]);
      if (!teamIdResult.ok) return teamIdResult.response;
      return deleteTeamController(request, env, teamIdResult.value);
    },
    paramTypes: ["string"],
  },
  {
    method: "GET",
    pattern: /^teams\/([a-z]+(?:-[a-z]+){2})\/members$/,
    handler: async (request, env, params) => {
      const teamIdResult = await requireTeamSlugParam(env, params[0]);
      if (!teamIdResult.ok) return teamIdResult.response;
      return listTeamMembersController(request, env, teamIdResult.value);
    },
    paramTypes: ["string"],
  },
  {
    method: "POST",
    pattern: /^teams\/([a-z]+(?:-[a-z]+){2})\/members$/,
    handler: async (request, env, params) => {
      const teamIdResult = await requireTeamSlugParam(env, params[0]);
      if (!teamIdResult.ok) return teamIdResult.response;
      return addTeamMemberController(request, env, teamIdResult.value);
    },
    paramTypes: ["string"],
  },
  {
    method: "POST",
    pattern: /^teams\/([a-z]+(?:-[a-z]+){2})\/request-access$/,
    handler: async (request, env, params) => {
      const teamIdResult = await requireTeamSlugParam(env, params[0]);
      if (!teamIdResult.ok) return teamIdResult.response;
      return requestTeamAccessController(request, env, teamIdResult.value);
    },
    paramTypes: ["string"],
  },
  {
    method: "POST",
    pattern: /^teams\/([a-z]+(?:-[a-z]+){2})\/members\/(\d+)\/approve$/,
    handler: async (request, env, params) => {
      const teamIdResult = await requireTeamSlugParam(env, params[0]);
      if (!teamIdResult.ok) return teamIdResult.response;
      const userIdResult = requireNumberParam(params[1], "userId");
      if (!userIdResult.ok) return userIdResult.response;
      return approveTeamMemberController(
        request,
        env,
        teamIdResult.value,
        userIdResult.value,
      );
    },
    paramTypes: ["string", "number"],
  },
  {
    method: "POST",
    pattern: /^teams\/([a-z]+(?:-[a-z]+){2})\/members\/(\d+)\/move$/,
    handler: async (request, env, params) => {
      const teamIdResult = await requireTeamSlugParam(env, params[0]);
      if (!teamIdResult.ok) return teamIdResult.response;
      const userIdResult = requireNumberParam(params[1], "userId");
      if (!userIdResult.ok) return userIdResult.response;
      return moveTeamMemberController(
        request,
        env,
        teamIdResult.value,
        userIdResult.value,
      );
    },
    paramTypes: ["string", "number"],
  },
  {
    method: "PUT",
    pattern: /^teams\/([a-z]+(?:-[a-z]+){2})\/members\/(\d+)$/,
    handler: async (request, env, params) => {
      const teamIdResult = await requireTeamSlugParam(env, params[0]);
      if (!teamIdResult.ok) return teamIdResult.response;
      const userIdResult = requireNumberParam(params[1], "userId");
      if (!userIdResult.ok) return userIdResult.response;
      return updateTeamMemberController(
        request,
        env,
        teamIdResult.value,
        userIdResult.value,
      );
    },
    paramTypes: ["string", "number"],
  },
  {
    method: "DELETE",
    pattern: /^teams\/([a-z]+(?:-[a-z]+){2})\/members\/(\d+)$/,
    handler: async (request, env, params) => {
      const teamIdResult = await requireTeamSlugParam(env, params[0]);
      if (!teamIdResult.ok) return teamIdResult.response;
      const userIdResult = requireNumberParam(params[1], "userId");
      if (!userIdResult.ok) return userIdResult.response;
      return removeTeamMemberController(
        request,
        env,
        teamIdResult.value,
        userIdResult.value,
      );
    },
    paramTypes: ["string", "number"],
  },
  {
    method: "GET",
    pattern: /^teams\/([a-z]+(?:-[a-z]+){2})\/sessions$/,
    handler: async (request, env, params) => {
      const teamIdResult = await requireTeamSlugParam(env, params[0]);
      if (!teamIdResult.ok) return teamIdResult.response;
      return listTeamSessionsController(request, env, teamIdResult.value);
    },
    paramTypes: ["string"],
  },
  {
    method: "POST",
    pattern: /^internal\/teams\/([a-z]+(?:-[a-z]+){2})\/sessions$/,
    handler: async (request, env, params) => {
      const teamIdResult = await requireTeamSlugParam(env, params[0]);
      if (!teamIdResult.ok) return teamIdResult.response;
      return createTeamSessionController(request, env, teamIdResult.value);
    },
    paramTypes: ["string"],
  },
  {
    method: "GET",
    pattern: /^teams\/([a-z]+(?:-[a-z]+){2})\/process-loops$/,
    handler: async (request, env, params) => {
      const teamIdResult = await requireTeamSlugParam(env, params[0]);
      if (!teamIdResult.ok) return teamIdResult.response;
      return listWorkspaceProcessLoopsController(
        request,
        env,
        teamIdResult.value,
      );
    },
    paramTypes: ["string"],
  },
  {
    method: "POST",
    pattern: /^teams\/([a-z]+(?:-[a-z]+){2})\/process-loops$/,
    handler: async (request, env, params) => {
      const teamIdResult = await requireTeamSlugParam(env, params[0]);
      if (!teamIdResult.ok) return teamIdResult.response;
      return createWorkspaceProcessLoopController(
        request,
        env,
        teamIdResult.value,
      );
    },
    paramTypes: ["string"],
  },
  {
    method: "GET",
    pattern: /^teams\/([a-z]+(?:-[a-z]+){2})\/actions$/,
    handler: async (request, env, params) => {
      const teamIdResult = await requireTeamSlugParam(env, params[0]);
      if (!teamIdResult.ok) return teamIdResult.response;
      return listWorkspaceActionsController(request, env, teamIdResult.value);
    },
    paramTypes: ["string"],
  },
  {
    method: "POST",
    pattern: /^teams\/([a-z]+(?:-[a-z]+){2})\/actions$/,
    handler: async (request, env, params) => {
      const teamIdResult = await requireTeamSlugParam(env, params[0]);
      if (!teamIdResult.ok) return teamIdResult.response;
      return createWorkspaceActionController(request, env, teamIdResult.value);
    },
    paramTypes: ["string"],
  },
  {
    method: "PATCH",
    pattern: /^teams\/([a-z]+(?:-[a-z]+){2})\/actions\/(\d+)$/,
    handler: async (request, env, params) => {
      const teamIdResult = await requireTeamSlugParam(env, params[0]);
      if (!teamIdResult.ok) return teamIdResult.response;
      const actionIdResult = requireNumberParam(params[1], "actionId");
      if (!actionIdResult.ok) return actionIdResult.response;
      return updateWorkspaceActionController(
        request,
        env,
        teamIdResult.value,
        actionIdResult.value,
      );
    },
    paramTypes: ["string", "number"],
  },
  {
    method: "POST",
    pattern: /^teams\/([a-z]+(?:-[a-z]+){2})\/actions\/(\d+)\/events$/,
    handler: async (request, env, params) => {
      const teamIdResult = await requireTeamSlugParam(env, params[0]);
      if (!teamIdResult.ok) return teamIdResult.response;
      const actionIdResult = requireNumberParam(params[1], "actionId");
      if (!actionIdResult.ok) return actionIdResult.response;
      return createWorkspaceActionEventController(
        request,
        env,
        teamIdResult.value,
        actionIdResult.value,
      );
    },
    paramTypes: ["string", "number"],
  },
  {
    method: "GET",
    pattern: /^teams\/([a-z]+(?:-[a-z]+){2})\/sessions\/(\d+)$/,
    handler: async (request, env, params) => {
      const teamIdResult = await requireTeamSlugParam(env, params[0]);
      if (!teamIdResult.ok) return teamIdResult.response;
      const sessionIdResult = requireNumberParam(params[1], "sessionId");
      if (!sessionIdResult.ok) return sessionIdResult.response;
      return getTeamSessionController(
        request,
        env,
        teamIdResult.value,
        sessionIdResult.value,
      );
    },
    paramTypes: ["string", "number"],
  },
  {
    method: "POST",
    pattern: /^teams\/([a-z]+(?:-[a-z]+){2})\/sessions\/(\d+)\/link$/,
    handler: async (request, env, params) => {
      const teamIdResult = await requireTeamSlugParam(env, params[0]);
      if (!teamIdResult.ok) return teamIdResult.response;
      const sessionIdResult = requireNumberParam(params[1], "sessionId");
      if (!sessionIdResult.ok) return sessionIdResult.response;
      return linkTeamSessionToProcessLoopController(
        request,
        env,
        teamIdResult.value,
        sessionIdResult.value,
      );
    },
    paramTypes: ["string", "number"],
  },
  {
    method: "PUT",
    pattern: /^teams\/([a-z]+(?:-[a-z]+){2})\/sessions\/(\d+)$/,
    handler: async (request, env, params) => {
      const teamIdResult = await requireTeamSlugParam(env, params[0]);
      if (!teamIdResult.ok) return teamIdResult.response;
      const sessionIdResult = requireNumberParam(params[1], "sessionId");
      if (!sessionIdResult.ok) return sessionIdResult.response;
      return updateTeamSessionController(
        request,
        env,
        teamIdResult.value,
        sessionIdResult.value,
      );
    },
    paramTypes: ["string", "number"],
  },
  {
    method: "POST",
    pattern:
      /^teams\/([a-z]+(?:-[a-z]+){2})\/sessions\/(\d+)\/recap-actions\/resolve$/,
    handler: async (request, env, params) => {
      const teamIdResult = await requireTeamSlugParam(env, params[0]);
      if (!teamIdResult.ok) return teamIdResult.response;
      const sessionIdResult = requireNumberParam(params[1], "sessionId");
      if (!sessionIdResult.ok) return sessionIdResult.response;
      return resolveTeamSessionRecapActionController(
        request,
        env,
        teamIdResult.value,
        sessionIdResult.value,
      );
    },
    paramTypes: ["string", "number"],
  },
  {
    method: "GET",
    pattern: /^sessions\/by-room$/,
    handler: (request, env) => getTeamSessionByRoomKeyController(request, env),
    paramTypes: ["none"],
  },
  {
    method: "POST",
    pattern: /^internal\/sessions\/complete$/,
    handler: (request, env) => completeSessionByRoomKeyController(request, env),
    paramTypes: ["none"],
  },
  {
    method: "POST",
    pattern: /^internal\/sessions\/wheel-outcomes$/,
    handler: (request, env) =>
      recordWheelOutcomeByRoomKeyController(request, env),
    paramTypes: ["none"],
  },
  {
    method: "POST",
    pattern: /^internal\/sessions\/planning-actions$/,
    handler: (request, env) =>
      recordPlanningActionsByRoomKeyController(request, env),
    paramTypes: ["none"],
  },
  {
    method: "POST",
    pattern: /^internal\/sessions\/standup-actions$/,
    handler: (request, env) =>
      recordStandupActionsByRoomKeyController(request, env),
    paramTypes: ["none"],
  },
  {
    method: "GET",
    pattern: /^workspace\/profile$/,
    handler: (request, env) => getWorkspaceProfileController(request, env),
    paramTypes: ["none"],
  },
  {
    method: "GET",
    pattern: /^workspace\/stats$/,
    handler: (request, env) => getWorkspaceStatsController(request, env),
    paramTypes: ["none"],
  },
  {
    method: "PUT",
    pattern: /^workspace\/profile$/,
    handler: (request, env) => updateWorkspaceProfileController(request, env),
    paramTypes: ["none"],
  },
  {
    method: "POST",
    pattern: /^workspace\/invites$/,
    handler: (request, env) => inviteWorkspaceMemberController(request, env),
    paramTypes: ["none"],
  },
  {
    method: "POST",
    pattern: /^workspace\/members\/(\d+)\/approve$/,
    handler: (request, env, params) => {
      const userIdResult = requireNumberParam(params[0], "userId");
      if (!userIdResult.ok) return userIdResult.response;
      return approveWorkspaceMemberController(request, env, userIdResult.value);
    },
    paramTypes: ["number"],
  },
  {
    method: "PUT",
    pattern: /^workspace\/members\/(\d+)$/,
    handler: (request, env, params) => {
      const userIdResult = requireNumberParam(params[0], "userId");
      if (!userIdResult.ok) return userIdResult.response;
      return updateWorkspaceMemberController(request, env, userIdResult.value);
    },
    paramTypes: ["number"],
  },
  {
    method: "DELETE",
    pattern: /^workspace\/members\/(\d+)$/,
    handler: (request, env, params) => {
      const userIdResult = requireNumberParam(params[0], "userId");
      if (!userIdResult.ok) return userIdResult.response;
      return removeWorkspaceMemberController(request, env, userIdResult.value);
    },
    paramTypes: ["number"],
  },
  {
    method: "GET",
    pattern: /^teams\/([a-z]+(?:-[a-z]+){2})\/settings$/,
    handler: async (request, env, params) => {
      const teamIdResult = await requireTeamSlugParam(env, params[0]);
      if (!teamIdResult.ok) return teamIdResult.response;
      return getTeamSettingsController(request, env, teamIdResult.value);
    },
    paramTypes: ["string"],
  },
  {
    method: "GET",
    pattern: /^teams\/([a-z]+(?:-[a-z]+){2})\/retro-settings$/,
    handler: async (request, env, params) => {
      const teamIdResult = await requireTeamSlugParam(env, params[0]);
      if (!teamIdResult.ok) return teamIdResult.response;
      return getTeamRetroSettingsController(request, env, teamIdResult.value);
    },
    paramTypes: ["string"],
  },
  {
    method: "PUT",
    pattern: /^teams\/([a-z]+(?:-[a-z]+){2})\/retro-settings$/,
    handler: async (request, env, params) => {
      const teamIdResult = await requireTeamSlugParam(env, params[0]);
      if (!teamIdResult.ok) return teamIdResult.response;
      return saveTeamRetroSettingsController(request, env, teamIdResult.value);
    },
    paramTypes: ["string"],
  },
  {
    method: "PUT",
    pattern: /^teams\/([a-z]+(?:-[a-z]+){2})\/settings$/,
    handler: async (request, env, params) => {
      const teamIdResult = await requireTeamSlugParam(env, params[0]);
      if (!teamIdResult.ok) return teamIdResult.response;
      return saveTeamSettingsController(request, env, teamIdResult.value);
    },
    paramTypes: ["string"],
  },
  {
    method: "GET",
    pattern: /^teams\/([a-z]+(?:-[a-z]+){2})\/collaboration-installations$/,
    handler: async (request, env, params) => {
      const teamIdResult = await requireTeamSlugParam(env, params[0]);
      if (!teamIdResult.ok) return teamIdResult.response;
      return listTeamCollaborationInstallationsController(
        request,
        env,
        teamIdResult.value,
      );
    },
    paramTypes: ["string"],
  },
  {
    method: "POST",
    pattern: /^collaboration-installations\/teams\/resolve$/,
    handler: (request, env) =>
      resolveTeamsCollaborationInstallationController(request, env),
    paramTypes: ["none"],
  },
  {
    method: "POST",
    pattern:
      /^teams\/([a-z]+(?:-[a-z]+){2})\/collaboration-installations\/teams$/,
    handler: async (request, env, params) => {
      const teamIdResult = await requireTeamSlugParam(env, params[0]);
      if (!teamIdResult.ok) return teamIdResult.response;
      return saveTeamsCollaborationInstallationController(
        request,
        env,
        teamIdResult.value,
      );
    },
    paramTypes: ["string"],
  },
  {
    method: "DELETE",
    pattern:
      /^teams\/([a-z]+(?:-[a-z]+){2})\/collaboration-installations\/(\d+)$/,
    handler: async (request, env, params) => {
      const teamIdResult = await requireTeamSlugParam(env, params[0]);
      if (!teamIdResult.ok) return teamIdResult.response;
      const installationIdResult = requireNumberParam(
        params[1],
        "installationId",
      );
      if (!installationIdResult.ok) return installationIdResult.response;
      return deleteTeamCollaborationInstallationController(
        request,
        env,
        teamIdResult.value,
        installationIdResult.value,
      );
    },
    paramTypes: ["string", "number"],
  },
  {
    method: "GET",
    pattern: /^teams\/([a-z]+(?:-[a-z]+){2})\/integrations$/,
    handler: async (request, env, params) => {
      const teamIdResult = await requireTeamSlugParam(env, params[0]);
      if (!teamIdResult.ok) return teamIdResult.response;
      return listTeamIntegrationsController(request, env, teamIdResult.value);
    },
    paramTypes: ["string"],
  },
  {
    method: "POST",
    pattern:
      /^teams\/([a-z]+(?:-[a-z]+){2})\/integrations\/(jira|linear|github)\/authorize$/,
    handler: async (request, env, params) => {
      const teamIdResult = await requireTeamSlugParam(env, params[0]);
      if (!teamIdResult.ok) return teamIdResult.response;
      return initiateTeamOAuthController(
        request,
        env,
        teamIdResult.value,
        params[1] as "jira" | "linear" | "github",
      );
    },
    paramTypes: ["string", "string"],
  },
  {
    method: "GET",
    pattern:
      /^teams\/([a-z]+(?:-[a-z]+){2})\/integrations\/(jira|linear|github)\/status$/,
    handler: async (request, env, params) => {
      const teamIdResult = await requireTeamSlugParam(env, params[0]);
      if (!teamIdResult.ok) return teamIdResult.response;
      return getTeamIntegrationStatusController(
        request,
        env,
        teamIdResult.value,
        params[1] as "jira" | "linear" | "github",
      );
    },
    paramTypes: ["string", "string"],
  },
  {
    method: "POST",
    pattern:
      /^teams\/([a-z]+(?:-[a-z]+){2})\/integrations\/(jira|linear|github)\/boards$/,
    handler: async (request, env, params) => {
      const teamIdResult = await requireTeamSlugParam(env, params[0]);
      if (!teamIdResult.ok) return teamIdResult.response;
      return listTeamIntegrationBoardsController(
        request,
        env,
        teamIdResult.value,
        params[1] as "jira" | "linear" | "github",
      );
    },
    paramTypes: ["string", "string"],
  },
  {
    method: "POST",
    pattern:
      /^teams\/([a-z]+(?:-[a-z]+){2})\/integrations\/(jira|linear|github)\/sprints$/,
    handler: async (request, env, params) => {
      const teamIdResult = await requireTeamSlugParam(env, params[0]);
      if (!teamIdResult.ok) return teamIdResult.response;
      return listTeamIntegrationSprintsController(
        request,
        env,
        teamIdResult.value,
        params[1] as "jira" | "linear" | "github",
      );
    },
    paramTypes: ["string", "string"],
  },
  {
    method: "POST",
    pattern:
      /^teams\/([a-z]+(?:-[a-z]+){2})\/integrations\/(jira|linear|github)\/tickets$/,
    handler: async (request, env, params) => {
      const teamIdResult = await requireTeamSlugParam(env, params[0]);
      if (!teamIdResult.ok) return teamIdResult.response;
      return searchTeamIntegrationTicketsController(
        request,
        env,
        teamIdResult.value,
        params[1] as "jira" | "linear" | "github",
      );
    },
    paramTypes: ["string", "string"],
  },
  {
    method: "DELETE",
    pattern:
      /^teams\/([a-z]+(?:-[a-z]+){2})\/integrations\/(jira|linear|github)$/,
    handler: async (request, env, params) => {
      const teamIdResult = await requireTeamSlugParam(env, params[0]);
      if (!teamIdResult.ok) return teamIdResult.response;
      return revokeTeamIntegrationController(
        request,
        env,
        teamIdResult.value,
        params[1] as "jira" | "linear" | "github",
      );
    },
    paramTypes: ["string", "string"],
  },
  {
    method: "GET",
    pattern: /^teams\/integrations\/jira\/callback$/,
    handler: async (request, env) => {
      if (env.IP_RATE_LIMITER) {
        const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
        const { success } = await env.IP_RATE_LIMITER.limit({
          key: `oauth-callback:${ip}`,
        });
        if (!success) return jsonError("Rate limit exceeded", 429);
      }
      return handleJiraTeamOAuthCallbackController(new URL(request.url), env);
    },
    paramTypes: ["none"],
  },
  {
    method: "GET",
    pattern: /^teams\/integrations\/linear\/callback$/,
    handler: async (request, env) => {
      if (env.IP_RATE_LIMITER) {
        const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
        const { success } = await env.IP_RATE_LIMITER.limit({
          key: `oauth-callback:${ip}`,
        });
        if (!success) return jsonError("Rate limit exceeded", 429);
      }
      return handleLinearTeamOAuthCallbackController(new URL(request.url), env);
    },
    paramTypes: ["none"],
  },
  {
    method: "GET",
    pattern: /^teams\/integrations\/github\/callback$/,
    handler: async (request, env) => {
      if (env.IP_RATE_LIMITER) {
        const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
        const { success } = await env.IP_RATE_LIMITER.limit({
          key: `oauth-callback:${ip}`,
        });
        if (!success) return jsonError("Rate limit exceeded", 429);
      }
      return handleGithubTeamOAuthCallbackController(new URL(request.url), env);
    },
    paramTypes: ["none"],
  },
  {
    method: "GET",
    pattern: /^internal\/teams\/(\d+)\/write-access$/,
    handler: (request, env, params) => {
      const teamIdResult = requireNumberParam(params[0], "teamId");
      if (!teamIdResult.ok) return teamIdResult.response;
      return requireTeamMemberInternalController(
        request,
        env,
        teamIdResult.value,
      );
    },
    paramTypes: ["number"],
  },
  {
    method: "GET",
    pattern: /^internal\/teams\/(\d+)$/,
    handler: (request, env, params) => {
      const teamIdResult = requireNumberParam(params[0], "teamId");
      if (!teamIdResult.ok) return teamIdResult.response;
      return getTeamController(request, env, teamIdResult.value);
    },
    paramTypes: ["number"],
  },
  {
    method: "POST",
    pattern: /^internal\/team-credentials$/,
    handler: (request, env) =>
      getTeamCredentialsInternalController(request, env),
    paramTypes: ["none"],
  },
  {
    method: "POST",
    pattern: /^internal\/team-credentials\/refresh$/,
    handler: (request, env) =>
      refreshTeamCredentialsInternalController(request, env),
    paramTypes: ["none"],
  },
];

function parseParams(
  match: RegExpMatchArray,
  paramTypes: RouteDefinition["paramTypes"],
): HandlerParams {
  const params: HandlerParam[] = [];
  for (let i = 1; i < match.length; i++) {
    const paramType = paramTypes[i - 1];
    if (paramType === "number") {
      params.push(Number.parseInt(match[i], 10));
    } else {
      params.push(match[i]);
    }
  }
  return params;
}

export async function handleRequest(
  request: Request,
  env: AuthWorkerEnv,
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const path = url.pathname.startsWith("/api/")
      ? url.pathname.substring(5)
      : url.pathname.substring(1);

    if (path === "" || path === "/") {
      return jsonResponse({
        status: "success",
        message: "Sprintjam Auth Worker is running.",
      });
    }

    if (request.method === "POST" || request.method === "PUT") {
      const bodySizeCheck = validateRequestBodySize(request);
      if (!bodySizeCheck.ok) {
        return bodySizeCheck.response;
      }
    }

    for (const route of ROUTES) {
      if (route.method !== request.method) continue;

      const match = path.match(route.pattern);
      if (!match) continue;

      const params = parseParams(match, route.paramTypes);
      return route.handler(request, env, params);
    }

    return notFoundResponse("Auth Route Not found");
  } catch (error) {
    console.error("[auth-worker] handleRequest errored:", error);
    return new Response(
      JSON.stringify({ error: "[auth-worker] Internal Server Error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
