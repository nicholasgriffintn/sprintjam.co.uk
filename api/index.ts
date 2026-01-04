import type {
  ExportedHandler,
  Request as CfRequest,
  Response as CfResponse,
} from "@cloudflare/workers-types";

import { Env } from "./types";
import { getRoomStub } from "./utils/room";
import { PlanningRoom } from "./durable-objects/planning-room";
import { getDefaultsController } from "./controllers/defaults-controller";
import {
  createRoomController,
  getRoomSettingsController,
  joinRoomController,
  updateRoomSettingsController,
} from "./controllers/rooms-controller";
import {
  getJiraTicketController,
  getJiraBoardsController,
  getJiraSprintsController,
  getJiraIssuesController,
  updateJiraStoryPointsController,
} from "./controllers/jira-controller";
import {
  initiateJiraOAuthController,
  handleJiraOAuthCallbackController,
  getJiraOAuthStatusController,
  getJiraFieldsController,
  updateJiraFieldsController,
  revokeJiraOAuthController,
} from "./controllers/jira-oauth-controller";
import {
  getLinearIssueController,
  getLinearTeamsController,
  getLinearCyclesController,
  getLinearIssuesController,
  updateLinearEstimateController,
} from "./controllers/linear-controller";
import {
  initiateLinearOAuthController,
  handleLinearOAuthCallbackController,
  getLinearOAuthStatusController,
  revokeLinearOAuthController,
} from "./controllers/linear-oauth-controller";
import {
  getGithubIssueController,
  getGithubReposController,
  getGithubMilestonesController,
  getGithubIssuesController,
  updateGithubEstimateController,
} from "./controllers/github-controller";
import {
  initiateGithubOAuthController,
  handleGithubOAuthCallbackController,
  getGithubOAuthStatusController,
  revokeGithubOAuthController,
} from "./controllers/github-oauth-controller";
import { submitFeedbackController } from "./controllers/feedback-controller";
import {
  requestMagicLinkController,
  verifyMagicLinkController,
  getCurrentUserController,
  logoutController,
} from "./controllers/auth-controller";
import {
  listTeamsController,
  createTeamController,
  getTeamController,
  updateTeamController,
  deleteTeamController,
  listTeamSessionsController,
  createTeamSessionController,
  getTeamSessionController,
  getWorkspaceStatsController,
} from "./controllers/teams-controller";

async function handleRequest(
  request: CfRequest,
  env: Env,
): Promise<CfResponse> {
  const url = new URL(request.url);

  if (url.pathname === "/robots.txt") {
    const isStaging = env.ENVIRONMENT === "staging";
    const robotsBody = isStaging
      ? "User-agent: *\nDisallow: /"
      : "User-agent: *\nAllow: /";

    return new Response(robotsBody, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        ...(isStaging ? { "X-Robots-Tag": "noindex, nofollow" } : {}),
      },
    }) as unknown as CfResponse;
  }

  if (url.pathname.startsWith("/api/")) {
    return handleApiRequest(url, request, env);
  }

  if (url.pathname === "/ws") {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected WebSocket", {
        status: 400,
      }) as unknown as CfResponse;
    }

    const roomKey = url.searchParams.get("room");
    const userName = url.searchParams.get("name");
    const sessionToken = url.searchParams.get("token");

    if (!roomKey || !userName || !sessionToken) {
      return new Response("Missing room key, user name, or token", {
        status: 400,
      }) as unknown as CfResponse;
    }

    const roomStub = getRoomStub(env, roomKey);

    return roomStub.fetch(request);
  }

  return env.ASSETS.fetch(request);
}

async function handleApiRequest(
  url: URL,
  request: CfRequest,
  env: Env,
): Promise<CfResponse> {
  const path = url.pathname.substring(5);

  if (path === "defaults" && request.method === "GET") {
    return getDefaultsController();
  }

  if (path === "feedback" && request.method === "POST") {
    return submitFeedbackController(request, env);
  }

  if (path === "auth/magic-link" && request.method === "POST") {
    return requestMagicLinkController(request, env);
  }

  if (path === "auth/verify" && request.method === "POST") {
    return verifyMagicLinkController(request, env);
  }

  if (path === "auth/me" && request.method === "GET") {
    return getCurrentUserController(request, env);
  }

  if (path === "auth/logout" && request.method === "POST") {
    return logoutController(request, env);
  }

  if (path === "rooms" && request.method === "POST") {
    return createRoomController(request, env);
  }

  if (path === "rooms/join" && request.method === "POST") {
    return joinRoomController(request, env);
  }

  if (path === "rooms/settings" && request.method === "GET") {
    return getRoomSettingsController(url, env);
  }

  if (path === "rooms/settings" && request.method === "PUT") {
    return updateRoomSettingsController(request, env);
  }

  if (path === "jira/ticket" && request.method === "GET") {
    return getJiraTicketController(url, env);
  }

  if (path === "jira/boards" && request.method === "GET") {
    return getJiraBoardsController(url, env);
  }

  if (path === "jira/sprints" && request.method === "GET") {
    return getJiraSprintsController(url, env);
  }

  if (path === "jira/issues" && request.method === "GET") {
    return getJiraIssuesController(url, env);
  }

  if (
    path.startsWith("jira/ticket/") &&
    path.endsWith("/storyPoints") &&
    request.method === "PUT"
  ) {
    const ticketId = path.split("/")[2];
    return updateJiraStoryPointsController(ticketId, request, env);
  }

  if (path === "jira/oauth/authorize" && request.method === "POST") {
    return initiateJiraOAuthController(request, env);
  }

  if (path === "jira/oauth/callback" && request.method === "GET") {
    return handleJiraOAuthCallbackController(url, env);
  }

  if (path === "jira/oauth/status" && request.method === "GET") {
    return getJiraOAuthStatusController(url, env);
  }

  if (path === "jira/oauth/fields" && request.method === "GET") {
    return getJiraFieldsController(url, env);
  }

  if (path === "jira/oauth/fields" && request.method === "PUT") {
    return updateJiraFieldsController(request, env);
  }

  if (path === "jira/oauth/revoke" && request.method === "DELETE") {
    return revokeJiraOAuthController(request, env);
  }

  if (path === "linear/issue" && request.method === "GET") {
    return getLinearIssueController(url, env);
  }

  if (path === "linear/teams" && request.method === "GET") {
    return getLinearTeamsController(url, env);
  }

  if (path === "linear/cycles" && request.method === "GET") {
    return getLinearCyclesController(url, env);
  }

  if (path === "linear/issues" && request.method === "GET") {
    return getLinearIssuesController(url, env);
  }

  if (
    path.startsWith("linear/issue/") &&
    path.endsWith("/estimate") &&
    request.method === "PUT"
  ) {
    const issueId = path.split("/")[2];
    return updateLinearEstimateController(issueId, request, env);
  }

  if (path === "linear/oauth/authorize" && request.method === "POST") {
    return initiateLinearOAuthController(request, env);
  }

  if (path === "linear/oauth/callback" && request.method === "GET") {
    return handleLinearOAuthCallbackController(url, env);
  }

  if (path === "linear/oauth/status" && request.method === "GET") {
    return getLinearOAuthStatusController(url, env);
  }

  if (path === "linear/oauth/revoke" && request.method === "DELETE") {
    return revokeLinearOAuthController(request, env);
  }

  if (path === "github/issue" && request.method === "GET") {
    return getGithubIssueController(url, env);
  }

  if (path === "github/repos" && request.method === "GET") {
    return getGithubReposController(url, env);
  }

  if (path === "github/milestones" && request.method === "GET") {
    return getGithubMilestonesController(url, env);
  }

  if (path === "github/issues" && request.method === "GET") {
    return getGithubIssuesController(url, env);
  }

  if (
    path.startsWith("github/issue/") &&
    path.endsWith("/estimate") &&
    request.method === "PUT"
  ) {
    const issueId = decodeURIComponent(path.split("/")[2] ?? "");
    return updateGithubEstimateController(issueId, request, env);
  }

  if (path === "github/oauth/authorize" && request.method === "POST") {
    return initiateGithubOAuthController(request, env);
  }

  if (path === "github/oauth/callback" && request.method === "GET") {
    return handleGithubOAuthCallbackController(url, env);
  }

  if (path === "github/oauth/status" && request.method === "GET") {
    return getGithubOAuthStatusController(url, env);
  }

  if (path === "github/oauth/revoke" && request.method === "DELETE") {
    return revokeGithubOAuthController(request, env);
  }

  if (path === "teams" && request.method === "GET") {
    return listTeamsController(request, env);
  }

  if (path === "teams" && request.method === "POST") {
    return createTeamController(request, env);
  }

  const teamMatch = path.match(/^teams\/(\d+)$/);
  if (teamMatch) {
    const teamId = parseInt(teamMatch[1], 10);
    if (request.method === "GET") {
      return getTeamController(request, env, teamId);
    }
    if (request.method === "PUT") {
      return updateTeamController(request, env, teamId);
    }
    if (request.method === "DELETE") {
      return deleteTeamController(request, env, teamId);
    }
  }

  const teamSessionsMatch = path.match(/^teams\/(\d+)\/sessions$/);
  if (teamSessionsMatch) {
    const teamId = parseInt(teamSessionsMatch[1], 10);
    if (request.method === "GET") {
      return listTeamSessionsController(request, env, teamId);
    }
    if (request.method === "POST") {
      return createTeamSessionController(request, env, teamId);
    }
  }

  const teamSessionMatch = path.match(/^teams\/(\d+)\/sessions\/(\d+)$/);
  if (teamSessionMatch) {
    const teamId = parseInt(teamSessionMatch[1], 10);
    const sessionId = parseInt(teamSessionMatch[2], 10);
    if (request.method === "GET") {
      return getTeamSessionController(request, env, teamId, sessionId);
    }
  }

  if (path === "workspace/stats" && request.method === "GET") {
    return getWorkspaceStatsController(request, env);
  }

  return new Response(JSON.stringify({ error: "Not found" }), {
    status: 404,
    headers: { "Content-Type": "application/json" },
  }) as unknown as CfResponse;
}

export default {
  async fetch(request: CfRequest, env: Env): Promise<CfResponse> {
    return handleRequest(request, env);
  },
} satisfies ExportedHandler<Env>;

export { PlanningRoom };
