import type {
  Request as CfRequest,
  Response as CfResponse,
} from "@cloudflare/workers-types";

import type { Env } from "../types";
import { getDefaultsController } from "../controllers/defaults-controller";
import {
  createRoomController,
  getRoomSettingsController,
  joinRoomController,
  updateRoomSettingsController,
} from "../controllers/rooms-controller";
import {
  getJiraTicketController,
  updateJiraStoryPointsController,
} from "../controllers/jira-controller";
import {
  initiateJiraOAuthController,
  handleJiraOAuthCallbackController,
  getJiraOAuthStatusController,
  getJiraFieldsController,
  updateJiraFieldsController,
  revokeJiraOAuthController,
} from "../controllers/jira-oauth-controller";
import {
  getLinearIssueController,
  updateLinearEstimateController,
} from "../controllers/linear-controller";
import {
  initiateLinearOAuthController,
  handleLinearOAuthCallbackController,
  getLinearOAuthStatusController,
  revokeLinearOAuthController,
} from "../controllers/linear-oauth-controller";

const normalizePath = (path: string): string =>
  path.replace(/^\/+/, "").replace(/\/+$/, "");

export async function handlePlanningApiRequest(
  path: string,
  url: URL,
  request: CfRequest,
  env: Env,
): Promise<CfResponse | null> {
  const normalizedPath = normalizePath(path);
  const method = request.method.toUpperCase();

  if (normalizedPath === "defaults" && method === "GET") {
    return getDefaultsController(env);
  }

  if (normalizedPath === "rooms" && method === "POST") {
    return createRoomController(request, env);
  }

  if (normalizedPath === "rooms/join" && method === "POST") {
    return joinRoomController(request, env);
  }

  if (normalizedPath === "rooms/settings" && method === "GET") {
    return getRoomSettingsController(url, env);
  }

  if (normalizedPath === "rooms/settings" && method === "PUT") {
    return updateRoomSettingsController(request, env);
  }

  if (normalizedPath === "jira/ticket" && method === "GET") {
    return getJiraTicketController(url, env);
  }

  if (
    normalizedPath.startsWith("jira/ticket/") &&
    normalizedPath.endsWith("/storyPoints") &&
    method === "PUT"
  ) {
    const ticketId = normalizedPath.split("/")[2];
    return updateJiraStoryPointsController(ticketId, request, env);
  }

  if (normalizedPath === "jira/oauth/authorize" && method === "POST") {
    return initiateJiraOAuthController(request, env);
  }

  if (normalizedPath === "jira/oauth/callback" && method === "GET") {
    return handleJiraOAuthCallbackController(url, env);
  }

  if (normalizedPath === "jira/oauth/status" && method === "GET") {
    return getJiraOAuthStatusController(url, env);
  }

  if (normalizedPath === "jira/oauth/fields" && method === "GET") {
    return getJiraFieldsController(url, env);
  }

  if (normalizedPath === "jira/oauth/fields" && method === "PUT") {
    return updateJiraFieldsController(request, env);
  }

  if (normalizedPath === "jira/oauth/revoke" && method === "DELETE") {
    return revokeJiraOAuthController(request, env);
  }

  if (normalizedPath === "linear/issue" && method === "GET") {
    return getLinearIssueController(url, env);
  }

  if (
    normalizedPath.startsWith("linear/issue/") &&
    normalizedPath.endsWith("/estimate") &&
    method === "PUT"
  ) {
    const issueId = normalizedPath.split("/")[2];
    return updateLinearEstimateController(issueId, request, env);
  }

  if (normalizedPath === "linear/oauth/authorize" && method === "POST") {
    return initiateLinearOAuthController(request, env);
  }

  if (normalizedPath === "linear/oauth/callback" && method === "GET") {
    return handleLinearOAuthCallbackController(url, env);
  }

  if (normalizedPath === "linear/oauth/status" && method === "GET") {
    return getLinearOAuthStatusController(url, env);
  }

  if (normalizedPath === "linear/oauth/revoke" && method === "DELETE") {
    return revokeLinearOAuthController(request, env);
  }

  return null;
}
