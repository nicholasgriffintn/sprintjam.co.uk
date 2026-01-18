import type {
  Request as CfRequest,
  Response as CfResponse,
} from "@cloudflare/workers-types";
import type { RoomWorkerEnv } from "@sprintjam/types";

import {
  rootResponse,
  notFoundResponse,
  internalErrorResponse,
  jsonError,
} from "../lib/response";
import { getRoomStub } from "@sprintjam/utils";
import { getDefaultsController } from "../controllers/room/defaults-controller";
import {
  createRoomController,
  joinRoomController,
  getRoomSettingsController,
  updateRoomSettingsController,
} from "../controllers/room/rooms-controller";
import {
  getJiraTicketController,
  getJiraBoardsController,
  getJiraSprintsController,
  getJiraIssuesController,
  updateJiraStoryPointsController,
} from "../controllers/external/jira-controller";
import {
  initiateJiraOAuthController,
  handleJiraOAuthCallbackController,
  getJiraOAuthStatusController,
  getJiraFieldsController,
  updateJiraFieldsController,
  revokeJiraOAuthController,
} from "../controllers/external/jira-oauth-controller";
import {
  getLinearIssueController,
  getLinearTeamsController,
  getLinearCyclesController,
  getLinearIssuesController,
  updateLinearEstimateController,
} from "../controllers/external/linear-controller";
import {
  initiateLinearOAuthController,
  handleLinearOAuthCallbackController,
  getLinearOAuthStatusController,
  revokeLinearOAuthController,
} from "../controllers/external/linear-oauth-controller";
import {
  getGithubIssueController,
  getGithubReposController,
  getGithubMilestonesController,
  getGithubIssuesController,
  updateGithubEstimateController,
} from "../controllers/external/github-controller";
import {
  initiateGithubOAuthController,
  handleGithubOAuthCallbackController,
  getGithubOAuthStatusController,
  revokeGithubOAuthController,
} from "../controllers/external/github-oauth-controller";
import { submitFeedbackController } from "../controllers/external/feedback-controller";

async function handleWebSocket(
  request: CfRequest,
  env: RoomWorkerEnv,
): Promise<CfResponse> {
  if (request.headers.get("Upgrade") !== "websocket") {
    return jsonError("Expected WebSocket", 400);
  }

  const url = new URL(request.url);
  const roomKey = url.searchParams.get("room");
  const userName = url.searchParams.get("name");
  const sessionToken = url.searchParams.get("token");

  if (!roomKey || !userName || !sessionToken) {
    return jsonError("Missing room key, user name, or token", 400);
  }

  const roomStub = getRoomStub(env, roomKey);
  return roomStub.fetch(request);
}

async function handleApiRoutes(
  request: CfRequest,
  env: RoomWorkerEnv,
  path: string,
): Promise<CfResponse> {
  const url = new URL(request.url);
  const method = request.method;

  if (path === "defaults" && method === "GET") {
    return getDefaultsController();
  }

  if (path === "rooms" && method === "POST") {
    return createRoomController(request, env);
  }

  if (path === "rooms/join" && method === "POST") {
    return joinRoomController(request, env);
  }

  if (path === "rooms/settings" && method === "GET") {
    return getRoomSettingsController(url, env);
  }

  if (path === "rooms/settings" && method === "PUT") {
    return updateRoomSettingsController(request, env);
  }

  if (path === "jira/ticket" && method === "GET") {
    return getJiraTicketController(url, env);
  }

  if (path === "jira/boards" && method === "GET") {
    return getJiraBoardsController(url, env);
  }

  if (path === "jira/sprints" && method === "GET") {
    return getJiraSprintsController(url, env);
  }

  if (path === "jira/issues" && method === "GET") {
    return getJiraIssuesController(url, env);
  }

  if (
    path.startsWith("jira/ticket/") &&
    path.endsWith("/storyPoints") &&
    method === "PUT"
  ) {
    const ticketId = path.split("/")[2];
    if (ticketId) {
      return updateJiraStoryPointsController(ticketId, request, env);
    }
  }

  if (path === "jira/oauth/authorize" && method === "POST") {
    return initiateJiraOAuthController(request, env);
  }

  if (path === "jira/oauth/callback" && method === "GET") {
    return handleJiraOAuthCallbackController(url, env);
  }

  if (path === "jira/oauth/status" && method === "GET") {
    return getJiraOAuthStatusController(url, env);
  }

  if (path === "jira/oauth/fields" && method === "GET") {
    return getJiraFieldsController(url, env);
  }

  if (path === "jira/oauth/fields" && method === "PUT") {
    return updateJiraFieldsController(request, env);
  }

  if (path === "jira/oauth/revoke" && method === "DELETE") {
    return revokeJiraOAuthController(request, env);
  }

  if (path === "linear/issue" && method === "GET") {
    return getLinearIssueController(url, env);
  }

  if (path === "linear/teams" && method === "GET") {
    return getLinearTeamsController(url, env);
  }

  if (path === "linear/cycles" && method === "GET") {
    return getLinearCyclesController(url, env);
  }

  if (path === "linear/issues" && method === "GET") {
    return getLinearIssuesController(url, env);
  }

  if (
    path.startsWith("linear/issue/") &&
    path.endsWith("/estimate") &&
    method === "PUT"
  ) {
    const issueId = path.split("/")[2];
    if (issueId) {
      return updateLinearEstimateController(issueId, request, env);
    }
  }

  if (path === "linear/oauth/authorize" && method === "POST") {
    return initiateLinearOAuthController(request, env);
  }

  if (path === "linear/oauth/callback" && method === "GET") {
    return handleLinearOAuthCallbackController(url, env);
  }

  if (path === "linear/oauth/status" && method === "GET") {
    return getLinearOAuthStatusController(url, env);
  }

  if (path === "linear/oauth/revoke" && method === "DELETE") {
    return revokeLinearOAuthController(request, env);
  }

  if (path === "github/issue" && method === "GET") {
    return getGithubIssueController(url, env);
  }

  if (path === "github/repos" && method === "GET") {
    return getGithubReposController(url, env);
  }

  if (path === "github/milestones" && method === "GET") {
    return getGithubMilestonesController(url, env);
  }

  if (path === "github/issues" && method === "GET") {
    return getGithubIssuesController(url, env);
  }

  if (
    path.startsWith("github/issue/") &&
    path.endsWith("/estimate") &&
    method === "PUT"
  ) {
    const issueId = decodeURIComponent(path.split("/")[2] || "");
    if (issueId) {
      return updateGithubEstimateController(issueId, request, env);
    }
  }

  if (path === "github/oauth/authorize" && method === "POST") {
    return initiateGithubOAuthController(request, env);
  }

  if (path === "github/oauth/callback" && method === "GET") {
    return handleGithubOAuthCallbackController(url, env);
  }

  if (path === "github/oauth/status" && method === "GET") {
    return getGithubOAuthStatusController(url, env);
  }

  if (path === "github/oauth/revoke" && method === "DELETE") {
    return revokeGithubOAuthController(request, env);
  }

  if (path === "feedback" && method === "POST") {
    return submitFeedbackController(request, env);
  }

  return notFoundResponse("API");
}

export async function handleRequest(
  request: CfRequest,
  env: RoomWorkerEnv,
): Promise<CfResponse> {
  try {
    const url = new URL(request.url);
    const pathname = url.pathname;

    if (pathname === "" || pathname === "/") {
      return rootResponse("Room Worker");
    }

    if (pathname === "/ws") {
      return await handleWebSocket(request, env);
    }

    if (pathname.startsWith("/api/")) {
      const path = pathname.substring(5);
      return handleApiRoutes(request, env, path);
    }

    return notFoundResponse("Main");
  } catch (error) {
    console.error("[room-worker] handleRequest errored:", error);
    return internalErrorResponse("room-worker");
  }
}
