import type {
  Request as CfRequest,
  Response as CfResponse,
} from "@cloudflare/workers-types";
import type { StatsWorkerEnv } from "@sprintjam/types";

import { StatsRepository } from "../repositories/stats";
import {
  authenticateRequest,
  isUserInTeam,
  canUserAccessRoom,
  filterAccessibleRoomKeys,
} from '../lib/auth';

export async function getRoomStatsController(
  request: CfRequest,
  env: StatsWorkerEnv,
  roomKey: string
): Promise<CfResponse> {
  const authResult = await authenticateRequest(request, env.DB);
  if ('status' in authResult && authResult.status === 'error') {
    return new Response(
      JSON.stringify({
        error:
          authResult.code === 'unauthorized'
            ? 'Unauthorized'
            : 'Session expired',
      }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    ) as unknown as CfResponse;
  }

  const auth = authResult as {
    userId: number;
    email: string;
    organisationId: number;
  };
  const hasAccess = await canUserAccessRoom(
    env.DB,
    auth.organisationId,
    roomKey
  );
  if (!hasAccess) {
    return new Response(
      JSON.stringify({ error: "You do not have access to this room's stats" }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }
    ) as unknown as CfResponse;
  }

  const repo = new StatsRepository(env.DB);
  const stats = await repo.getRoomStats(roomKey);

  if (!stats) {
    return new Response(JSON.stringify({ error: 'Room not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    }) as unknown as CfResponse;
  }

  return new Response(JSON.stringify({ stats }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  }) as unknown as CfResponse;
}

export async function getUserRoomStatsController(
  request: CfRequest,
  env: StatsWorkerEnv,
  roomKey: string,
  userName: string
): Promise<CfResponse> {
  const authResult = await authenticateRequest(request, env.DB);
  if ('status' in authResult && authResult.status === 'error') {
    return new Response(
      JSON.stringify({
        error:
          authResult.code === 'unauthorized'
            ? 'Unauthorized'
            : 'Session expired',
      }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    ) as unknown as CfResponse;
  }

  const auth = authResult as {
    userId: number;
    email: string;
    organisationId: number;
  };
  const hasAccess = await canUserAccessRoom(
    env.DB,
    auth.organisationId,
    roomKey
  );
  if (!hasAccess) {
    return new Response(
      JSON.stringify({ error: "You do not have access to this room's stats" }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }
    ) as unknown as CfResponse;
  }

  const repo = new StatsRepository(env.DB);
  const stats = await repo.getUserRoomStats(roomKey, userName);

  if (!stats) {
    return new Response(JSON.stringify({ error: 'User stats not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    }) as unknown as CfResponse;
  }

  return new Response(JSON.stringify({ stats }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  }) as unknown as CfResponse;
}

export async function getBatchRoomStatsController(
  request: CfRequest,
  env: StatsWorkerEnv
): Promise<CfResponse> {
  const authResult = await authenticateRequest(request, env.DB);
  if ('status' in authResult && authResult.status === 'error') {
    return new Response(
      JSON.stringify({
        error:
          authResult.code === 'unauthorized'
            ? 'Unauthorized'
            : 'Session expired',
      }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    ) as unknown as CfResponse;
  }

  const url = new URL(request.url);
  const keysParam = url.searchParams.get('keys');

  if (!keysParam) {
    return new Response(
      JSON.stringify({ error: 'Missing keys query parameter' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    ) as unknown as CfResponse;
  }

  const roomKeys = keysParam.split(',').filter(Boolean);

  const auth = authResult as {
    userId: number;
    email: string;
    organisationId: number;
  };
  const accessibleRoomKeys = await filterAccessibleRoomKeys(
    env.DB,
    auth.organisationId,
    roomKeys
  );

  const repo = new StatsRepository(env.DB);
  const statsMap = await repo.getBatchRoomStats(accessibleRoomKeys);

  const stats = Object.fromEntries(statsMap);

  return new Response(JSON.stringify({ stats }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  }) as unknown as CfResponse;
}

export async function getTeamStatsController(
  request: CfRequest,
  env: StatsWorkerEnv,
  teamId: number
): Promise<CfResponse> {
  const authResult = await authenticateRequest(request, env.DB);
  if ('status' in authResult && authResult.status === 'error') {
    return new Response(
      JSON.stringify({
        error:
          authResult.code === 'unauthorized'
            ? 'Unauthorized'
            : 'Session expired',
      }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    ) as unknown as CfResponse;
  }

  const isMember = await isUserInTeam(env.DB, authResult.userId, teamId);
  if (!isMember) {
    return new Response(
      JSON.stringify({ error: "You do not have access to this team's stats" }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }
    ) as unknown as CfResponse;
  }

  const repo = new StatsRepository(env.DB);
  const stats = await repo.getTeamStats(teamId);

  if (!stats) {
    return new Response(JSON.stringify({ error: 'Team stats not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    }) as unknown as CfResponse;
  }

  return new Response(JSON.stringify({ stats }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  }) as unknown as CfResponse;
}
