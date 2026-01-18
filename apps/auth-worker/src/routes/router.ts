import type {
  Request as CfRequest,
  Response as CfResponse,
} from "@cloudflare/workers-types";
import type { AuthWorkerEnv } from "@sprintjam/types";

import {
  requestMagicLinkController,
  verifyCodeController,
  getCurrentUserController,
  logoutController,
} from "../controllers/auth-controller";
import {
  listTeamsController,
  createTeamController,
  getTeamController,
  updateTeamController,
  deleteTeamController,
  listTeamSessionsController,
  createTeamSessionController,
  getTeamSessionController,
  completeSessionByRoomKeyController,
  getWorkspaceStatsController,
} from "../controllers/teams-controller";

type HandlerParams = Array<string | number>;

interface RouteDefinition {
  method: string;
  pattern: RegExp;
  handler: (
    request: CfRequest,
    env: AuthWorkerEnv,
    ...params: HandlerParams
  ) => Promise<CfResponse>;
  paramTypes: ("none" | "string" | "number")[];
}

const ROUTES: RouteDefinition[] = [
  {
    method: "POST",
    pattern: /^auth\/magic-link$/,
    handler: requestMagicLinkController as RouteDefinition["handler"],
    paramTypes: ["none"],
  },
  {
    method: "POST",
    pattern: /^auth\/verify$/,
    handler: verifyCodeController as RouteDefinition["handler"],
    paramTypes: ["none"],
  },
  {
    method: "GET",
    pattern: /^auth\/me$/,
    handler: getCurrentUserController as RouteDefinition["handler"],
    paramTypes: ["none"],
  },
  {
    method: "POST",
    pattern: /^auth\/logout$/,
    handler: logoutController as RouteDefinition["handler"],
    paramTypes: ["none"],
  },
  {
    method: "GET",
    pattern: /^teams$/,
    handler: listTeamsController as RouteDefinition["handler"],
    paramTypes: ["none"],
  },
  {
    method: "POST",
    pattern: /^teams$/,
    handler: createTeamController as RouteDefinition["handler"],
    paramTypes: ["none"],
  },
  {
    method: "GET",
    pattern: /^teams\/(\d+)$/,
    handler: getTeamController as RouteDefinition["handler"],
    paramTypes: ["number"],
  },
  {
    method: "PUT",
    pattern: /^teams\/(\d+)$/,
    handler: updateTeamController as RouteDefinition["handler"],
    paramTypes: ["number"],
  },
  {
    method: "DELETE",
    pattern: /^teams\/(\d+)$/,
    handler: deleteTeamController as RouteDefinition["handler"],
    paramTypes: ["number"],
  },
  {
    method: "GET",
    pattern: /^teams\/(\d+)\/sessions$/,
    handler: listTeamSessionsController as RouteDefinition["handler"],
    paramTypes: ["number"],
  },
  {
    method: "POST",
    pattern: /^teams\/(\d+)\/sessions$/,
    handler: createTeamSessionController as RouteDefinition["handler"],
    paramTypes: ["number"],
  },
  {
    method: "GET",
    pattern: /^teams\/(\d+)\/sessions\/(\d+)$/,
    handler: getTeamSessionController as RouteDefinition["handler"],
    paramTypes: ["number", "number"],
  },
  {
    method: "POST",
    pattern: /^sessions\/complete$/,
    handler: completeSessionByRoomKeyController as RouteDefinition["handler"],
    paramTypes: ["none"],
  },
  {
    method: "GET",
    pattern: /^workspace\/stats$/,
    handler: getWorkspaceStatsController as RouteDefinition["handler"],
    paramTypes: ["none"],
  },
];

function notFoundResponse(): CfResponse {
  return new Response(JSON.stringify({ error: "Auth Route Not found" }), {
    status: 404,
    headers: { "Content-Type": "application/json" },
  }) as unknown as CfResponse;
}

function rootResponse(): CfResponse {
  return new Response(
    JSON.stringify({
      status: "success",
      message: "Sprintjam Auth Worker is running.",
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
  env: AuthWorkerEnv,
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
    console.error("[auth-worker] handleRequest errored:", error);
    return new Response(
      JSON.stringify({ error: "[auth-worker] Internal Server Error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    ) as unknown as CfResponse;
  }
}
