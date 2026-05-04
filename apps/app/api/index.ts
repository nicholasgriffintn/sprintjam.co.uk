import type {
  ExportedHandler,
  Request as CfRequest,
  Response as CfResponse,
  ExecutionContext,
} from "@cloudflare/workers-types";
import { createRequestHandler } from "react-router";
import type { DispatchWorkerEnv } from "@sprintjam/types";
import * as Sentry from "@sentry/cloudflare";
import { handleTeamsManifest } from "./teams-manifest";

declare module "react-router" {
  export interface AppLoadContext {
    cloudflare: {
      env: DispatchWorkerEnv;
      ctx: ExecutionContext;
    };
  }
}

const requestHandler = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE,
);

function handleRobotsTxt(env: DispatchWorkerEnv): CfResponse {
  const isStaging = env.ENVIRONMENT === "staging";
  const robotsBody = isStaging
    ? "User-agent: *\nDisallow: /"
    : "User-agent: *\nAllow: /\nSitemap: https://sprintjam.co.uk/sitemap.xml";

  // @ts-expect-error - types are weird
  return new Response(robotsBody, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      ...(isStaging ? { "X-Robots-Tag": "noindex, nofollow" } : {}),
    },
  });
}

async function handleRequest(
  request: CfRequest,
  env: DispatchWorkerEnv,
  ctx: ExecutionContext,
): Promise<CfResponse> {
  try {
    const url = new URL(request.url);

    if (url.pathname === "/robots.txt") {
      return handleRobotsTxt(env);
    }

    if (url.pathname === "/teams-manifest.json") {
      return handleTeamsManifest(request);
    }

    if (url.pathname.startsWith("/api/")) {
      const path = url.pathname.substring(5); // Remove '/api/'

      if (path.startsWith("wheels")) {
        return await env.WHEEL_WORKER.fetch(request);
      }

      if (path.startsWith("standups")) {
        return await env.STANDUP_WORKER.fetch(request);
      }

      if (
        path.startsWith("auth/") ||
        path === "teams" ||
        path.startsWith("teams/") ||
        path.startsWith("workspace/") ||
        path === "sessions/complete" ||
        path === "sessions/by-room"
      ) {
        return await env.AUTH_WORKER.fetch(request);
      }

      if (path.startsWith("stats/")) {
        return await env.STATS_WORKER.fetch(request);
      }

      return await env.ROOM_WORKER.fetch(request);
    }

    if (url.pathname === "/ws") {
      return await env.ROOM_WORKER.fetch(request);
    }

    if (url.pathname === "/ws/wheel") {
      return await env.WHEEL_WORKER.fetch(request);
    }

    if (url.pathname === "/ws/standup") {
      return await env.STANDUP_WORKER.fetch(request);
    }

    // @ts-expect-error - i dunno, types are weird
    return requestHandler(request, {
      cloudflare: { env, ctx },
    });
  } catch (error) {
    Sentry.captureException(error);
    console.error("[main] Internal Server Error", error);

    // @ts-expect-error - types are weird
    return new Response(
      JSON.stringify({ error: "[main] handleRequest errored" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

export default Sentry.withSentry(
  (env: DispatchWorkerEnv) => ({
    dsn: "https://d2b3ceb688e14058bf82a71ed27951c3@ingest.bitwobbly.com/11",
    tracesSampleRate: 0.1,
    enabled: env.ENVIRONMENT === "production" || env.ENVIRONMENT === "staging",
  }),
  {
    // @ts-expect-error - types are weird
    async fetch(
      request: CfRequest,
      env: DispatchWorkerEnv,
      ctx: ExecutionContext,
    ): Promise<CfResponse> {
      return handleRequest(request, env, ctx);
    },
  } satisfies ExportedHandler<DispatchWorkerEnv>,
);
