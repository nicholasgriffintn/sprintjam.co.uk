import type {
  Request as CfRequest,
  Response as CfResponse,
} from "@cloudflare/workers-types";
import type { StatsWorkerEnv } from "@sprintjam/types";

import { StatsRepository } from "../repositories/stats";

export async function getRoomStatsController(
  _request: CfRequest,
  env: StatsWorkerEnv,
  roomKey: string,
): Promise<CfResponse> {
  const repo = new StatsRepository(env.DB);
  const stats = await repo.getRoomStats(roomKey);

  if (!stats) {
    return new Response(JSON.stringify({ error: "Room not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    }) as unknown as CfResponse;
  }

  return new Response(JSON.stringify({ stats }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  }) as unknown as CfResponse;
}

export async function getUserRoomStatsController(
  _request: CfRequest,
  env: StatsWorkerEnv,
  roomKey: string,
  userName: string,
): Promise<CfResponse> {
  const repo = new StatsRepository(env.DB);
  const stats = await repo.getUserRoomStats(roomKey, userName);

  if (!stats) {
    return new Response(JSON.stringify({ error: "User stats not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    }) as unknown as CfResponse;
  }

  return new Response(JSON.stringify({ stats }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  }) as unknown as CfResponse;
}

export async function getBatchRoomStatsController(
  request: CfRequest,
  env: StatsWorkerEnv,
): Promise<CfResponse> {
  const url = new URL(request.url);
  const keysParam = url.searchParams.get("keys");

  if (!keysParam) {
    return new Response(
      JSON.stringify({ error: "Missing keys query parameter" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    ) as unknown as CfResponse;
  }

  const roomKeys = keysParam.split(",").filter(Boolean);
  const repo = new StatsRepository(env.DB);
  const statsMap = await repo.getBatchRoomStats(roomKeys);

  const stats = Object.fromEntries(statsMap);

  return new Response(JSON.stringify({ stats }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  }) as unknown as CfResponse;
}

export async function getTeamStatsController(
  _request: CfRequest,
  env: StatsWorkerEnv,
  teamId: number,
): Promise<CfResponse> {
  const repo = new StatsRepository(env.DB);
  const stats = await repo.getTeamStats(teamId);

  if (!stats) {
    return new Response(JSON.stringify({ error: "Team stats not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    }) as unknown as CfResponse;
  }

  return new Response(JSON.stringify({ stats }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  }) as unknown as CfResponse;
}
