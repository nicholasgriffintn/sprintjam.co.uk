import type {
  Request as CfRequest,
  Response as CfResponse,
} from "@cloudflare/workers-types";
import type { StatsWorkerEnv } from "@sprintjam/types";

import { ingestRoundController } from "./ingest";
import {
  getRoomStatsController,
  getUserRoomStatsController,
  getBatchRoomStatsController,
  getTeamStatsController,
  getTeamInsightsController,
  getWorkspaceInsightsController,
  getSessionStatsController,
  getBatchSessionStatsController,
} from "./query";

type HandlerParams = Array<string | number>;

interface RouteDefinition {
  method: string;
  pattern: RegExp;
  handler: (
    request: CfRequest,
    env: StatsWorkerEnv,
    ...params: HandlerParams
  ) => Promise<CfResponse>;
  paramTypes: ("none" | "string" | "number")[];
}

const ROUTES: RouteDefinition[] = [
  {
    method: "POST",
    pattern: /^ingest\/round$/,
    handler: ingestRoundController as RouteDefinition["handler"],
    paramTypes: ["none"],
  },
  {
    method: "GET",
    pattern: /^stats\/room\/([^/]+)$/,
    handler: getRoomStatsController as RouteDefinition["handler"],
    paramTypes: ["string"],
  },
  {
    method: "GET",
    pattern: /^stats\/room\/([^/]+)\/user\/([^/]+)$/,
    handler: getUserRoomStatsController as RouteDefinition["handler"],
    paramTypes: ["string", "string"],
  },
  {
    method: "GET",
    pattern: /^stats\/rooms$/,
    handler: getBatchRoomStatsController as RouteDefinition["handler"],
    paramTypes: ["none"],
  },
  {
    method: "GET",
    pattern: /^stats\/team\/(\d+)$/,
    handler: getTeamStatsController as RouteDefinition["handler"],
    paramTypes: ["number"],
  },
  {
    method: "GET",
    pattern: /^stats\/team\/(\d+)\/insights$/,
    handler: getTeamInsightsController as RouteDefinition["handler"],
    paramTypes: ["number"],
  },
  {
    method: "GET",
    pattern: /^stats\/workspace\/insights$/,
    handler: getWorkspaceInsightsController as RouteDefinition["handler"],
    paramTypes: ["none"],
  },
  {
    method: "GET",
    pattern: /^stats\/session\/([^/]+)$/,
    handler: getSessionStatsController as RouteDefinition["handler"],
    paramTypes: ["string"],
  },
  {
    method: "GET",
    pattern: /^stats\/sessions$/,
    handler: getBatchSessionStatsController as RouteDefinition["handler"],
    paramTypes: ["none"],
  },
];

function notFoundResponse(): CfResponse {
  return new Response(JSON.stringify({ error: "Stats Route Not found" }), {
    status: 404,
    headers: { "Content-Type": "application/json" },
  }) as unknown as CfResponse;
}

function rootResponse(): CfResponse {
  return new Response(
    JSON.stringify({
      status: "success",
      message: "Sprintjam Stats Worker is running.",
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    },
  ) as unknown as CfResponse;
}

function parseParams(
  match: RegExpMatchArray,
  paramTypes: RouteDefinition["paramTypes"],
): HandlerParams {
  const params: HandlerParams = [];
  for (let i = 1; i < match.length; i++) {
    const paramType = paramTypes[i - 1];
    if (paramType === "number") {
      params.push(Number.parseInt(match[i], 10));
    } else {
      params.push(match[i]);
    }
  }
  return params;
}

export async function handleRequest(
  request: CfRequest,
  env: StatsWorkerEnv,
): Promise<CfResponse> {
  try {
    const url = new URL(request.url);
    const path = url.pathname.startsWith("/api/")
      ? url.pathname.substring(5)
      : url.pathname.substring(1);

    if (path === "" || path === "/") {
      return rootResponse();
    }

    for (const route of ROUTES) {
      if (route.method !== request.method) continue;

      const match = path.match(route.pattern);
      if (!match) continue;

      const params = parseParams(match, route.paramTypes);
      return route.handler(request, env, ...params);
    }

    return notFoundResponse();
  } catch (error) {
    console.error("[stats-worker] handleRequest errored:", error);
    return new Response(
      JSON.stringify({ error: "[stats-worker] Internal Server Error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    ) as unknown as CfResponse;
  }
}
