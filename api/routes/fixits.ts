import type {
  Request as CfRequest,
  Response as CfResponse,
} from "@cloudflare/workers-types";

import type { Env } from "../types";
import { getFixitLeaderboardController } from "../controllers/fixits/leaderboard-controller";
import {
  listFixitRunsController,
  getFixitRunController,
  createFixitRunController,
  updateFixitRunController,
  deleteFixitRunController,
} from "../controllers/fixits/runs-controller";
import { getFixitEventsController } from "../controllers/fixits/events-controller";

const JSON_HEADERS = { "Content-Type": "application/json" };

function notFound(path: string): CfResponse {
  return new Response(
    JSON.stringify({ error: "Fixits endpoint not found", path }),
    { status: 404, headers: JSON_HEADERS },
  ) as unknown as CfResponse;
}

export async function handleFixitsApiRequest(
  path: string,
  url: URL,
  request: CfRequest,
  env: Env,
): Promise<CfResponse> {
  const normalizedPath = path.replace(/^\/+/, "");

  if (
    request.method === "GET" &&
    (normalizedPath === "" || normalizedPath === "leaderboard")
  ) {
    return getFixitLeaderboardController(url, env);
  }

  if (
    request.method === "GET" &&
    normalizedPath === "events"
  ) {
    return getFixitEventsController(url, env);
  }

  if (normalizedPath === "" || normalizedPath === "leaderboard") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: JSON_HEADERS },
    ) as unknown as CfResponse;
  }

  const [segment, ...rest] = normalizedPath.split("/");

  if (segment === "runs") {
    const subPath = rest.join("/");

    if (!subPath) {
      if (request.method === "GET") {
        return listFixitRunsController(url, env);
      }
      if (request.method === "POST") {
        return createFixitRunController(request, env);
      }
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: JSON_HEADERS },
      ) as unknown as CfResponse;
    }

    const fixitId = decodeURIComponent(subPath);
    if (request.method === "GET") {
      return getFixitRunController(fixitId, env);
    }
    if (request.method === "PUT") {
      return updateFixitRunController(fixitId, request, env);
    }
    if (request.method === "DELETE") {
      return deleteFixitRunController(fixitId, request, env);
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: JSON_HEADERS },
    ) as unknown as CfResponse;
  }

  return notFound(normalizedPath);
}
