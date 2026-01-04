import type {
  Request as CfRequest,
  Response as CfResponse,
} from '@cloudflare/workers-types';
import type { AuthWorkerEnv } from '@sprintjam/types';
import { WorkerEntrypoint } from 'cloudflare:workers';

import {
  requestMagicLinkController,
  verifyMagicLinkController,
  getCurrentUserController,
  logoutController,
} from './controllers/auth-controller';
import {
  listTeamsController,
  createTeamController,
  getTeamController,
  updateTeamController,
  deleteTeamController,
  listTeamSessionsController,
  createTeamSessionController,
  getTeamSessionController,
  getWorkspaceStatsController,
} from './controllers/teams-controller';

async function handleRequest(
  request: CfRequest,
  env: AuthWorkerEnv
): Promise<CfResponse> {
  const url = new URL(request.url);

  const path = url.pathname.startsWith('/api/')
    ? url.pathname.substring(5)
    : url.pathname.substring(1);

  if (path === '' || path === '/') {
    return new Response(
      JSON.stringify({
        status: 'success',
        message: 'Sprintjam Auth Worker is running.',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    ) as unknown as CfResponse;
  }

  if (path === 'auth/magic-link' && request.method === 'POST') {
    return requestMagicLinkController(request, env);
  }

  if (path === 'auth/verify' && request.method === 'POST') {
    return verifyMagicLinkController(request, env);
  }

  if (path === 'auth/me' && request.method === 'GET') {
    return getCurrentUserController(request, env);
  }

  if (path === 'auth/logout' && request.method === 'POST') {
    return logoutController(request, env);
  }

  if (path === 'teams' && request.method === 'GET') {
    return listTeamsController(request, env);
  }

  if (path === 'teams' && request.method === 'POST') {
    return createTeamController(request, env);
  }

  const teamMatch = path.match(/^teams\/(\d+)$/);
  if (teamMatch) {
    const teamId = parseInt(teamMatch[1], 10);
    if (request.method === 'GET') {
      return getTeamController(request, env, teamId);
    }
    if (request.method === 'PUT') {
      return updateTeamController(request, env, teamId);
    }
    if (request.method === 'DELETE') {
      return deleteTeamController(request, env, teamId);
    }
  }

  const teamSessionsMatch = path.match(/^teams\/(\d+)\/sessions$/);
  if (teamSessionsMatch) {
    const teamId = parseInt(teamSessionsMatch[1], 10);
    if (request.method === 'GET') {
      return listTeamSessionsController(request, env, teamId);
    }
    if (request.method === 'POST') {
      return createTeamSessionController(request, env, teamId);
    }
  }

  const teamSessionMatch = path.match(/^teams\/(\d+)\/sessions\/(\d+)$/);
  if (teamSessionMatch) {
    const teamId = parseInt(teamSessionMatch[1], 10);
    const sessionId = parseInt(teamSessionMatch[2], 10);
    if (request.method === 'GET') {
      return getTeamSessionController(request, env, teamId, sessionId);
    }
  }

  if (path === 'workspace/stats' && request.method === 'GET') {
    return getWorkspaceStatsController(request, env);
  }

  return new Response(JSON.stringify({ error: 'Auth Route Not found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  }) as unknown as CfResponse;
}

export default class extends WorkerEntrypoint {
  async fetch(request: CfRequest): Promise<CfResponse> {
    const env = this.env as AuthWorkerEnv;
    return handleRequest(request, env);
  }
}