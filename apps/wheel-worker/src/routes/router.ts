import type {
  Request as CfRequest,
  Response as CfResponse,
} from "@cloudflare/workers-types";
import type { WheelWorkerEnv } from "@sprintjam/types";

import {
  rootResponse,
  notFoundResponse,
  internalErrorResponse,
} from "../lib/response";
import {
  handleWheelApiRoute,
  handleWheelWebSocket,
} from "../controllers/wheel/api-controller";

export async function handleRequest(
  request: CfRequest,
  env: WheelWorkerEnv,
): Promise<CfResponse> {
  try {
    const url = new URL(request.url);
    const pathname = url.pathname;

    if (pathname === "" || pathname === "/") {
      return rootResponse("Wheel Worker");
    }

    if (pathname === "/ws/wheel") {
      return await handleWheelWebSocket(request, env);
    }

    if (pathname.startsWith("/api/")) {
      const path = pathname.substring(5);
      return handleWheelApiRoute(request, env, path);
    }

    return notFoundResponse("Main");
  } catch (error) {
    console.error("[wheel-worker] handleRequest errored:", error);
    return internalErrorResponse("wheel-worker");
  }
}
