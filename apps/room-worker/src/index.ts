import type {
  ExportedHandler,
  Request as CfRequest,
  Response as CfResponse,
} from '@cloudflare/workers-types';

import type { RoomWorkerEnv } from '@sprintjam/types/env';
import { getRoomStub } from '@sprintjam/utils';
import { PlanningRoom } from './durable-objects/planning-room';
import { getDefaultsController } from './controllers/room/defaults-controller';
import {
  createRoomController,
  getRoomSettingsController,
  joinRoomController,
  updateRoomSettingsController,
} from './controllers/room/rooms-controller';
import {
  getJiraTicketController,
  getJiraBoardsController,
  getJiraSprintsController,
  getJiraIssuesController,
  updateJiraStoryPointsController,
} from './controllers/external/jira-controller';
import {
  initiateJiraOAuthController,
  handleJiraOAuthCallbackController,
  getJiraOAuthStatusController,
  getJiraFieldsController,
  updateJiraFieldsController,
  revokeJiraOAuthController,
} from './controllers/external/jira-oauth-controller';
import {
  getLinearIssueController,
  getLinearTeamsController,
  getLinearCyclesController,
  getLinearIssuesController,
  updateLinearEstimateController,
} from './controllers/external/linear-controller';
import {
  initiateLinearOAuthController,
  handleLinearOAuthCallbackController,
  getLinearOAuthStatusController,
  revokeLinearOAuthController,
} from './controllers/external/linear-oauth-controller';
import {
  getGithubIssueController,
  getGithubReposController,
  getGithubMilestonesController,
  getGithubIssuesController,
  updateGithubEstimateController,
} from './controllers/external/github-controller';
import {
  initiateGithubOAuthController,
  handleGithubOAuthCallbackController,
  getGithubOAuthStatusController,
  revokeGithubOAuthController,
} from './controllers/external/github-oauth-controller';
import { submitFeedbackController } from './controllers/external/feedback-controller';

async function handleRequest(
  request: CfRequest,
  env: RoomWorkerEnv
): Promise<CfResponse> {
  const url = new URL(request.url);

  if (url.pathname === '/ws') {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected WebSocket', {
        status: 400,
      }) as unknown as CfResponse;
    }

    const roomKey = url.searchParams.get('room');
    const userName = url.searchParams.get('name');
    const sessionToken = url.searchParams.get('token');

    if (!roomKey || !userName || !sessionToken) {
      return new Response('Missing room key, user name, or token', {
        status: 400,
      }) as unknown as CfResponse;
    }

    const roomStub = getRoomStub(env as any, roomKey);
    return roomStub.fetch(request);
  }

  if (url.pathname.startsWith('/api/')) {
    return handleApiRequest(url, request, env);
  }

  return new Response(JSON.stringify({ error: 'Main API Route Not found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  }) as unknown as CfResponse;
}

async function handleApiRequest(
  url: URL,
  request: CfRequest,
  env: RoomWorkerEnv
): Promise<CfResponse> {
  const path = url.pathname.startsWith('/api/')
    ? url.pathname.substring(5)
    : url.pathname.substring(1);

  // Room management routes
  if (path === 'defaults' && request.method === 'GET') {
    return getDefaultsController();
  }

  if (path === 'rooms' && request.method === 'POST') {
    return createRoomController(request, env as any);
  }

  if (path === 'rooms/join' && request.method === 'POST') {
    return joinRoomController(request, env as any);
  }

  if (path === 'rooms/settings' && request.method === 'GET') {
    return getRoomSettingsController(url, env as any);
  }

  if (path === 'rooms/settings' && request.method === 'PUT') {
    return updateRoomSettingsController(request, env as any);
  }

  // Jira routes
  if (path === 'jira/ticket' && request.method === 'GET') {
    return getJiraTicketController(url, env as any);
  }

  if (path === 'jira/boards' && request.method === 'GET') {
    return getJiraBoardsController(url, env as any);
  }

  if (path === 'jira/sprints' && request.method === 'GET') {
    return getJiraSprintsController(url, env as any);
  }

  if (path === 'jira/issues' && request.method === 'GET') {
    return getJiraIssuesController(url, env as any);
  }

  if (
    path.startsWith('jira/ticket/') &&
    path.endsWith('/storyPoints') &&
    request.method === 'PUT'
  ) {
    const ticketId = path.split('/')[2];
    return updateJiraStoryPointsController(ticketId!, request, env as any);
  }

  if (path === 'jira/oauth/authorize' && request.method === 'POST') {
    return initiateJiraOAuthController(request, env as any);
  }

  if (path === 'jira/oauth/callback' && request.method === 'GET') {
    return handleJiraOAuthCallbackController(url, env as any);
  }

  if (path === 'jira/oauth/status' && request.method === 'GET') {
    return getJiraOAuthStatusController(url, env as any);
  }

  if (path === 'jira/oauth/fields' && request.method === 'GET') {
    return getJiraFieldsController(url, env as any);
  }

  if (path === 'jira/oauth/fields' && request.method === 'PUT') {
    return updateJiraFieldsController(request, env as any);
  }

  if (path === 'jira/oauth/revoke' && request.method === 'DELETE') {
    return revokeJiraOAuthController(request, env as any);
  }

  // Linear routes
  if (path === 'linear/issue' && request.method === 'GET') {
    return getLinearIssueController(url, env as any);
  }

  if (path === 'linear/teams' && request.method === 'GET') {
    return getLinearTeamsController(url, env as any);
  }

  if (path === 'linear/cycles' && request.method === 'GET') {
    return getLinearCyclesController(url, env as any);
  }

  if (path === 'linear/issues' && request.method === 'GET') {
    return getLinearIssuesController(url, env as any);
  }

  if (
    path.startsWith('linear/issue/') &&
    path.endsWith('/estimate') &&
    request.method === 'PUT'
  ) {
    const issueId = path.split('/')[2];
    return updateLinearEstimateController(issueId!, request, env as any);
  }

  if (path === 'linear/oauth/authorize' && request.method === 'POST') {
    return initiateLinearOAuthController(request, env as any);
  }

  if (path === 'linear/oauth/callback' && request.method === 'GET') {
    return handleLinearOAuthCallbackController(url, env as any);
  }

  if (path === 'linear/oauth/status' && request.method === 'GET') {
    return getLinearOAuthStatusController(url, env as any);
  }

  if (path === 'linear/oauth/revoke' && request.method === 'DELETE') {
    return revokeLinearOAuthController(request, env as any);
  }

  // GitHub routes
  if (path === 'github/issue' && request.method === 'GET') {
    return getGithubIssueController(url, env as any);
  }

  if (path === 'github/repos' && request.method === 'GET') {
    return getGithubReposController(url, env as any);
  }

  if (path === 'github/milestones' && request.method === 'GET') {
    return getGithubMilestonesController(url, env as any);
  }

  if (path === 'github/issues' && request.method === 'GET') {
    return getGithubIssuesController(url, env as any);
  }

  if (
    path.startsWith('github/issue/') &&
    path.endsWith('/estimate') &&
    request.method === 'PUT'
  ) {
    const issueId = decodeURIComponent(path.split('/')[2] ?? '');
    return updateGithubEstimateController(issueId, request, env as any);
  }

  if (path === 'github/oauth/authorize' && request.method === 'POST') {
    return initiateGithubOAuthController(request, env as any);
  }

  if (path === 'github/oauth/callback' && request.method === 'GET') {
    return handleGithubOAuthCallbackController(url, env as any);
  }

  if (path === 'github/oauth/status' && request.method === 'GET') {
    return getGithubOAuthStatusController(url, env as any);
  }

  if (path === 'github/oauth/revoke' && request.method === 'DELETE') {
    return revokeGithubOAuthController(request, env as any);
  }

  // Feedback route
  if (path === 'feedback' && request.method === 'POST') {
    return submitFeedbackController(request, env as any);
  }

  return new Response(JSON.stringify({ error: 'API Route Not found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  }) as unknown as CfResponse;
}

export default {
  async fetch(request: CfRequest, env: RoomWorkerEnv): Promise<CfResponse> {
    return handleRequest(request, env);
  },
} satisfies ExportedHandler<RoomWorkerEnv>;

export { PlanningRoom };
