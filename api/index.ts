import type {
  ExportedHandler,
  Request as CfRequest,
  Response as CfResponse,
} from "@cloudflare/workers-types";

import { Env } from "./types";
import { getRoomStub } from "./utils/room";
import { getFixitRoomStub } from "./utils/fixit-room";
import { PlanningRoom } from "./services/planning-room";
import { FixitRoom } from "./services/fixit-room";
import { handlePlanningApiRequest } from "./routes/planning";
import { handleFixitsApiRequest } from "./routes/fixits";
import { handleGithubWebhookRequest } from "./controllers/fixits/github-webhook-controller";

async function handleRequest(
  request: CfRequest,
  env: Env,
): Promise<CfResponse> {
  const url = new URL(request.url);

  if (url.pathname.startsWith("/api/")) {
    return handleApiRequest(url, request, env);
  }

  if (url.pathname === "/ws" || url.pathname === "/ws/planning") {
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

  if (url.pathname === "/ws/fixits") {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected WebSocket", {
        status: 400,
      }) as unknown as CfResponse;
    }

    const fixitId = url.searchParams.get("fixitId");

    if (!fixitId) {
      return new Response("Missing fixitId query parameter", {
        status: 400,
      }) as unknown as CfResponse;
    }

    if (!env.FIXIT_ROOM) {
      return new Response("Fixits Durable Object binding not configured", {
        status: 500,
      }) as unknown as CfResponse;
    }

    const fixitStub = getFixitRoomStub(env, fixitId);
    return fixitStub.fetch(request);
  }

  return env.ASSETS.fetch(request);
}

async function handleApiRequest(
  url: URL,
  request: CfRequest,
  env: Env,
): Promise<CfResponse> {
  const path = url.pathname.substring(5);
  const normalizedPath = path.replace(/^\/+/, "");

  if (normalizedPath === "github/webhook" && request.method === "POST") {
    return handleGithubWebhookRequest(request, env);
  }

  if (
    normalizedPath === "fixits" ||
    normalizedPath.startsWith("fixits/")
  ) {
    const fixitsPath =
      normalizedPath === "fixits"
        ? ""
        : normalizedPath.substring("fixits/".length);
    return handleFixitsApiRequest(fixitsPath, url, request, env);
  }

  const planningPath = normalizedPath.startsWith("planning/")
    ? normalizedPath.substring("planning/".length)
    : normalizedPath === "planning"
      ? ""
      : normalizedPath;
  const planningResponse = await handlePlanningApiRequest(
    planningPath,
    url,
    request,
    env,
  );
  if (planningResponse) {
    return planningResponse;
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

export { PlanningRoom, FixitRoom };
