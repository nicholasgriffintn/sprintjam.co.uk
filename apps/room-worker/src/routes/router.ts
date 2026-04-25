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
import { getRoomSessionToken, getRoomStub } from "@sprintjam/utils";
import { getDefaultsController } from "../controllers/room/defaults-controller";
import {
  createRoomController,
  joinRoomController,
  recoverRoomController,
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
  getLinearIssueController,
  getLinearTeamsController,
  getLinearCyclesController,
  getLinearIssuesController,
  updateLinearEstimateController,
} from "../controllers/external/linear-controller";
import {
  getGithubIssueController,
  getGithubReposController,
  getGithubMilestonesController,
  getGithubIssuesController,
  updateGithubEstimateController,
} from "../controllers/external/github-controller";
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
  const sessionToken = getRoomSessionToken(request);

  if (!roomKey || !userName || !sessionToken) {
    return jsonError("Missing room key, user name, or session token", 400);
  }

  const roomStub = getRoomStub(env, roomKey);
  return roomStub.fetch(request);
}

async function handleApiRoutes(
  request: CfRequest,
  env: RoomWorkerEnv,
  path: string,
): Promise<CfResponse> {
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

  if (path === "rooms/recover" && method === "POST") {
    return recoverRoomController(request, env);
  }

  if (path === "rooms/settings" && method === "GET") {
    return getRoomSettingsController(request, env);
  }

  if (path === "rooms/settings" && method === "PUT") {
    return updateRoomSettingsController(request, env);
  }

  if (path === "jira/ticket" && method === "POST") {
    return getJiraTicketController(request, env);
  }

  if (path === "jira/boards" && method === "POST") {
    return getJiraBoardsController(request, env);
  }

  if (path === "jira/sprints" && method === "POST") {
    return getJiraSprintsController(request, env);
  }

  if (path === "jira/issues" && method === "POST") {
    return getJiraIssuesController(request, env);
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

  if (path === "linear/issue" && method === "POST") {
    return getLinearIssueController(request, env);
  }

  if (path === "linear/teams" && method === "POST") {
    return getLinearTeamsController(request, env);
  }

  if (path === "linear/cycles" && method === "POST") {
    return getLinearCyclesController(request, env);
  }

  if (path === "linear/issues" && method === "POST") {
    return getLinearIssuesController(request, env);
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

  if (path === "github/issue" && method === "POST") {
    return getGithubIssueController(request, env);
  }

  if (path === "github/repos" && method === "POST") {
    return getGithubReposController(request, env);
  }

  if (path === "github/milestones" && method === "POST") {
    return getGithubMilestonesController(request, env);
  }

  if (path === "github/issues" && method === "POST") {
    return getGithubIssuesController(request, env);
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
