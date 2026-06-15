import type {
  ExportedHandler,
  Request as CfRequest,
  Response as CfResponse,
  ExecutionContext,
} from "@cloudflare/workers-types";
import { createRequestHandler } from "react-router";
import type { DispatchWorkerEnv } from "@sprintjam/types";
import * as Sentry from "@sentry/cloudflare";
import {
  createRobotsTxtResponse,
  createSitemapXmlResponse,
} from "../src/utils/search-indexing";

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

export function isAuthWorkerApiPath(path: string): boolean {
  return (
    path.startsWith("auth/") ||
    path === "teams" ||
    path.startsWith("teams/") ||
    path.startsWith("workspace/") ||
    path.startsWith("sessions/")
  );
}

async function handleRequest(
  request: CfRequest,
  env: DispatchWorkerEnv,
  ctx: ExecutionContext,
): Promise<CfResponse> {
  try {
    const url = new URL(request.url);

    if (url.pathname === "/robots.txt") {
      // @ts-expect-error - types are weird
      return createRobotsTxtResponse(env, url);
    }

    if (url.pathname === "/sitemap.xml") {
      // @ts-expect-error - types are weird
      return createSitemapXmlResponse(url);
    }

    if (url.pathname.startsWith("/api/")) {
      const path = url.pathname.substring(5); // Remove '/api/'

      if (path.startsWith("wheels")) {
        return await env.WHEEL_WORKER.fetch(request);
      }

      if (path.startsWith("standups")) {
        return await env.STANDUP_WORKER.fetch(request);
      }

      if (path.startsWith("retros")) {
        return await env.RETRO_WORKER.fetch(request);
      }

      if (isAuthWorkerApiPath(path)) {
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

    if (url.pathname === "/ws/retro") {
      return await env.RETRO_WORKER.fetch(request);
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
    sampleRate: 1,
    enableLogs: false,
    tracesSampleRate: 0,
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
