import type { AuthWorkerEnv } from "@sprintjam/types";
import { validateRequestBodySize } from "@sprintjam/utils";

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
  updateTeamMemberController,
  removeTeamMemberController,
  listTeamSessionsController,
  createTeamSessionController,
  getTeamSessionController,
  completeSessionByRoomKeyController,
  getWorkspaceStatsController,
  updateWorkspaceProfileController,
  approveWorkspaceMemberController,
  updateWorkspaceMemberController,
  removeWorkspaceMemberController,
  inviteWorkspaceMemberController,
} from "../controllers/teams-controller";
import {
  getTeamSettingsController,
  saveTeamSettingsController,
} from "../controllers/team-settings-controller";
import {
  listTeamIntegrationsController,
  getTeamIntegrationStatusController,
  initiateTeamOAuthController,
  handleJiraTeamOAuthCallbackController,
  handleLinearTeamOAuthCallbackController,
  handleGithubTeamOAuthCallbackController,
  revokeTeamIntegrationController,
  getTeamCredentialsInternalController,
  refreshTeamCredentialsInternalController,
} from "../controllers/team-integrations-controller";
import { jsonError, jsonResponse, notFoundResponse } from "../lib/response";

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
    pattern: /^teams\/(\d+)$/,
    handler: (request, env, params) => {
      const teamIdResult = requireNumberParam(params[0], "teamId");
      if (!teamIdResult.ok) return teamIdResult.response;
      return getTeamController(request, env, teamIdResult.value);
    },
    paramTypes: ["number"],
  },
  {
    method: "PUT",
    pattern: /^teams\/(\d+)$/,
    handler: (request, env, params) => {
      const teamIdResult = requireNumberParam(params[0], "teamId");
      if (!teamIdResult.ok) return teamIdResult.response;
      return updateTeamController(request, env, teamIdResult.value);
    },
    paramTypes: ["number"],
  },
  {
    method: "DELETE",
    pattern: /^teams\/(\d+)$/,
    handler: (request, env, params) => {
      const teamIdResult = requireNumberParam(params[0], "teamId");
      if (!teamIdResult.ok) return teamIdResult.response;
      return deleteTeamController(request, env, teamIdResult.value);
    },
    paramTypes: ["number"],
  },
  {
    method: "GET",
    pattern: /^teams\/(\d+)\/members$/,
    handler: (request, env, params) => {
      const teamIdResult = requireNumberParam(params[0], "teamId");
      if (!teamIdResult.ok) return teamIdResult.response;
      return listTeamMembersController(request, env, teamIdResult.value);
    },
    paramTypes: ["number"],
  },
  {
    method: "POST",
    pattern: /^teams\/(\d+)\/members$/,
    handler: (request, env, params) => {
      const teamIdResult = requireNumberParam(params[0], "teamId");
      if (!teamIdResult.ok) return teamIdResult.response;
      return addTeamMemberController(request, env, teamIdResult.value);
    },
    paramTypes: ["number"],
  },
  {
    method: "POST",
    pattern: /^teams\/(\d+)\/request-access$/,
    handler: (request, env, params) => {
      const teamIdResult = requireNumberParam(params[0], "teamId");
      if (!teamIdResult.ok) return teamIdResult.response;
      return requestTeamAccessController(request, env, teamIdResult.value);
    },
    paramTypes: ["number"],
  },
  {
    method: "POST",
    pattern: /^teams\/(\d+)\/members\/(\d+)\/approve$/,
    handler: (request, env, params) => {
      const teamIdResult = requireNumberParam(params[0], "teamId");
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
    paramTypes: ["number", "number"],
  },
  {
    method: "PUT",
    pattern: /^teams\/(\d+)\/members\/(\d+)$/,
    handler: (request, env, params) => {
      const teamIdResult = requireNumberParam(params[0], "teamId");
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
    paramTypes: ["number", "number"],
  },
  {
    method: "DELETE",
    pattern: /^teams\/(\d+)\/members\/(\d+)$/,
    handler: (request, env, params) => {
      const teamIdResult = requireNumberParam(params[0], "teamId");
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
    paramTypes: ["number", "number"],
  },
  {
    method: "GET",
    pattern: /^teams\/(\d+)\/sessions$/,
    handler: (request, env, params) => {
      const teamIdResult = requireNumberParam(params[0], "teamId");
      if (!teamIdResult.ok) return teamIdResult.response;
      return listTeamSessionsController(request, env, teamIdResult.value);
    },
    paramTypes: ["number"],
  },
  {
    method: "POST",
    pattern: /^teams\/(\d+)\/sessions$/,
    handler: (request, env, params) => {
      const teamIdResult = requireNumberParam(params[0], "teamId");
      if (!teamIdResult.ok) return teamIdResult.response;
      return createTeamSessionController(request, env, teamIdResult.value);
    },
    paramTypes: ["number"],
  },
  {
    method: "GET",
    pattern: /^teams\/(\d+)\/sessions\/(\d+)$/,
    handler: (request, env, params) => {
      const teamIdResult = requireNumberParam(params[0], "teamId");
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
    paramTypes: ["number", "number"],
  },
  {
    method: "POST",
    pattern: /^sessions\/complete$/,
    handler: (request, env) => completeSessionByRoomKeyController(request, env),
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
    pattern: /^teams\/(\d+)\/settings$/,
    handler: (request, env, params) => {
      const teamIdResult = requireNumberParam(params[0], "teamId");
      if (!teamIdResult.ok) return teamIdResult.response;
      return getTeamSettingsController(request, env, teamIdResult.value);
    },
    paramTypes: ["number"],
  },
  {
    method: "PUT",
    pattern: /^teams\/(\d+)\/settings$/,
    handler: (request, env, params) => {
      const teamIdResult = requireNumberParam(params[0], "teamId");
      if (!teamIdResult.ok) return teamIdResult.response;
      return saveTeamSettingsController(request, env, teamIdResult.value);
    },
    paramTypes: ["number"],
  },
  {
    method: "GET",
    pattern: /^teams\/(\d+)\/integrations$/,
    handler: (request, env, params) => {
      const teamIdResult = requireNumberParam(params[0], "teamId");
      if (!teamIdResult.ok) return teamIdResult.response;
      return listTeamIntegrationsController(request, env, teamIdResult.value);
    },
    paramTypes: ["number"],
  },
  {
    method: "POST",
    pattern: /^teams\/(\d+)\/integrations\/(jira|linear|github)\/authorize$/,
    handler: (request, env, params) => {
      const teamIdResult = requireNumberParam(params[0], "teamId");
      if (!teamIdResult.ok) return teamIdResult.response;
      return initiateTeamOAuthController(
        request,
        env,
        teamIdResult.value,
        params[1] as "jira" | "linear" | "github",
      );
    },
    paramTypes: ["number", "string"],
  },
  {
    method: "GET",
    pattern: /^teams\/(\d+)\/integrations\/(jira|linear|github)\/status$/,
    handler: (request, env, params) => {
      const teamIdResult = requireNumberParam(params[0], "teamId");
      if (!teamIdResult.ok) return teamIdResult.response;
      return getTeamIntegrationStatusController(
        request,
        env,
        teamIdResult.value,
        params[1] as "jira" | "linear" | "github",
      );
    },
    paramTypes: ["number", "string"],
  },
  {
    method: "DELETE",
    pattern: /^teams\/(\d+)\/integrations\/(jira|linear|github)$/,
    handler: (request, env, params) => {
      const teamIdResult = requireNumberParam(params[0], "teamId");
      if (!teamIdResult.ok) return teamIdResult.response;
      return revokeTeamIntegrationController(
        request,
        env,
        teamIdResult.value,
        params[1] as "jira" | "linear" | "github",
      );
    },
    paramTypes: ["number", "string"],
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
        return bodySizeCheck.response as unknown as Response;
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
