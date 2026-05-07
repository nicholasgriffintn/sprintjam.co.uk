import type {
  Request as CfRequest,
  Response as CfResponse,
} from "@cloudflare/workers-types";
import type { RoomWorkerEnv } from "@sprintjam/types";

import {
  rootResponse,
  notFoundResponse,
  internalErrorResponse,
} from "../lib/response";
import {
  handleRoomApiRoute,
  handleRoomWebSocket,
} from "../controllers/room/api-controller";

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
      return await handleRoomWebSocket(request, env);
    }

    if (pathname.startsWith("/api/")) {
      const path = pathname.substring(5);
      return handleRoomApiRoute(request, env, path);
    }

    return notFoundResponse("Main");
  } catch (error) {
    console.error("[room-worker] handleRequest errored:", error);
    return internalErrorResponse("room-worker");
  }
}
