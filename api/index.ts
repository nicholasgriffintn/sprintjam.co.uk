import type {
  ExportedHandler,
  Request as CfRequest,
  Response as CfResponse,
} from "@cloudflare/workers-types";

import { Env } from "./types";
import { getRoomStub } from "./utils/room";
import { PlanningRoom } from "./services/planning-room";
import { getDefaultsController } from "./controllers/defaults-controller";
import {
  createRoomController,
  getRoomSettingsController,
  joinRoomController,
  updateRoomSettingsController,
} from "./controllers/rooms-controller";
import {
  getJiraTicketController,
  updateJiraStoryPointsController,
} from "./controllers/jira-controller";
import {
  initiateJiraOAuthController,
  handleJiraOAuthCallbackController,
  getJiraOAuthStatusController,
  revokeJiraOAuthController,
} from "./controllers/jira-oauth-controller";

async function handleRequest(
  request: CfRequest,
  env: Env,
): Promise<CfResponse> {
  const url = new URL(request.url);

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

  if (path === "jira/oauth/revoke" && request.method === "DELETE") {
    return revokeJiraOAuthController(request, env);
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
