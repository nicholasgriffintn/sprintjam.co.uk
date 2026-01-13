import type {
  Request as CfRequest,
  Response as CfResponse,
} from "@cloudflare/workers-types";
import type { StatsWorkerEnv } from "@sprintjam/types";
import { WorkerEntrypoint } from "cloudflare:workers";

import { ingestRoundController } from "./routes/ingest";
import {
  getRoomStatsController,
  getUserRoomStatsController,
  getBatchRoomStatsController,
  getTeamStatsController,
} from "./routes/query";

async function handleRequest(
  request: CfRequest,
  env: StatsWorkerEnv,
): Promise<CfResponse> {
  try {
    const url = new URL(request.url);
    const path = url.pathname.startsWith("/api/")
      ? url.pathname.substring(5)
      : url.pathname.substring(1);

    if (path === "" || path === "/") {
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

    if (path === "ingest/round" && request.method === "POST") {
      return await ingestRoundController(request, env);
    }

    const roomStatsMatch = path.match(/^stats\/room\/([^/]+)$/);
    if (roomStatsMatch && request.method === "GET") {
      return await getRoomStatsController(request, env, roomStatsMatch[1]);
    }

    const userRoomStatsMatch = path.match(
      /^stats\/room\/([^/]+)\/user\/([^/]+)$/,
    );
    if (userRoomStatsMatch && request.method === "GET") {
      return await getUserRoomStatsController(
        request,
        env,
        userRoomStatsMatch[1],
        decodeURIComponent(userRoomStatsMatch[2]),
      );
    }

    if (path === "stats/rooms" && request.method === "GET") {
      return await getBatchRoomStatsController(request, env);
    }

    const teamStatsMatch = path.match(/^stats\/team\/(\d+)$/);
    if (teamStatsMatch && request.method === "GET") {
      return await getTeamStatsController(
        request,
        env,
        parseInt(teamStatsMatch[1], 10),
      );
    }

    return new Response(JSON.stringify({ error: "Stats Route Not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    }) as unknown as CfResponse;
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

export default class extends WorkerEntrypoint {
  async fetch(request: CfRequest): Promise<CfResponse> {
    const env = this.env as StatsWorkerEnv;
    return handleRequest(request, env);
  }
}
