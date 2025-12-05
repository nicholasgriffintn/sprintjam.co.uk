import type { CfResponse, PlanningRoomHttpContext } from './types';
import { handleInitialize } from './initialize';
import { handleSessionValidation } from './session';
import { handleJoin } from './join';
import { handleVote } from './vote';
import { handleToggleShowVotes } from './show-votes';
import { handleResetVotes } from './reset-votes';
import { handleGetSettings, handleUpdateSettings } from './settings';
import {
  handleJiraSaveCredentials,
  handleJiraStatus,
  handleJiraCredentials,
  handleJiraRefresh,
  handleJiraUpdateFields,
  handleJiraRevoke,
} from './jira';
import {
  handleLinearSaveCredentials,
  handleLinearStatus,
  handleLinearCredentials,
  handleLinearRefresh,
  handleLinearRevoke,
} from './linear';

export type { PlanningRoomHttpContext, PlanningRoomRepositoryShape } from './types';

export async function handleHttpRequest(
  ctx: PlanningRoomHttpContext,
  request: Request
): Promise<CfResponse | null> {
  const url = new URL(request.url);

  if (url.pathname === '/initialize' && request.method === 'POST') {
    return handleInitialize(ctx, request);
  }

  if (url.pathname === '/session/validate' && request.method === 'POST') {
    return handleSessionValidation(ctx, request);
  }

  if (url.pathname === '/join' && request.method === 'POST') {
    return handleJoin(ctx, request);
  }

  if (url.pathname === '/vote' && request.method === 'POST') {
    return handleVote(ctx, request);
  }

  if (url.pathname === '/showVotes' && request.method === 'POST') {
    return handleToggleShowVotes(ctx, request);
  }

  if (url.pathname === '/resetVotes' && request.method === 'POST') {
    return handleResetVotes(ctx, request);
  }

  if (url.pathname === '/settings' && request.method === 'GET') {
    return handleGetSettings(ctx, url);
  }

  if (url.pathname === '/settings' && request.method === 'PUT') {
    return handleUpdateSettings(ctx, request);
  }

  if (url.pathname === '/jira/oauth/save' && request.method === 'POST') {
    return handleJiraSaveCredentials(ctx, request);
  }

  if (url.pathname === '/jira/oauth/status' && request.method === 'GET') {
    return handleJiraStatus(ctx, url);
  }

  if (url.pathname === '/jira/oauth/credentials' && request.method === 'GET') {
    return handleJiraCredentials(ctx);
  }

  if (url.pathname === '/jira/oauth/refresh' && request.method === 'POST') {
    return handleJiraRefresh(ctx, request);
  }

  if (url.pathname === '/jira/oauth/fields' && request.method === 'PUT') {
    return handleJiraUpdateFields(ctx, request);
  }

  if (url.pathname === '/jira/oauth/revoke' && request.method === 'DELETE') {
    return handleJiraRevoke(ctx, request);
  }

  if (url.pathname === '/linear/oauth/save' && request.method === 'POST') {
    return handleLinearSaveCredentials(ctx, request);
  }

  if (url.pathname === '/linear/oauth/status' && request.method === 'GET') {
    return handleLinearStatus(ctx, url);
  }

  if (
    url.pathname === '/linear/oauth/credentials' &&
    request.method === 'GET'
  ) {
    return handleLinearCredentials(ctx);
  }

  if (url.pathname === '/linear/oauth/refresh' && request.method === 'POST') {
    return handleLinearRefresh(ctx, request);
  }

  if (url.pathname === '/linear/oauth/revoke' && request.method === 'DELETE') {
    return handleLinearRevoke(ctx, request);
  }

  return null;
}
