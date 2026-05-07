import type {
  Request as CfRequest,
  Response as CfResponse,
} from "@cloudflare/workers-types";
import type { StandupWorkerEnv } from "@sprintjam/types";

import {
  rootResponse,
  notFoundResponse,
  internalErrorResponse,
} from "../lib/response";
import {
  handleStandupApiRoute,
  handleStandupWebSocket,
} from "../controllers/standup/api-controller";

export async function handleRequest(
  request: CfRequest,
  env: StandupWorkerEnv,
): Promise<CfResponse> {
  try {
    const url = new URL(request.url);
    const pathname = url.pathname;

    if (pathname === "" || pathname === "/") {
      return rootResponse("Standup Worker");
    }

    if (pathname === "/ws/standup") {
      return await handleStandupWebSocket(request, env);
    }

    if (pathname.startsWith("/api/")) {
      const path = pathname.substring(5);
      return handleStandupApiRoute(request, env, path);
    }

    return notFoundResponse("Main");
  } catch (error) {
    console.error("[standup-worker] handleRequest errored:", error);
    return internalErrorResponse("standup-worker");
  }
}
