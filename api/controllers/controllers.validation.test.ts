import { describe, expect, it } from 'vitest';
import type { Request as CfRequest } from '@cloudflare/workers-types';

import {
  createRoomController,
  getRoomSettingsController,
  joinRoomController,
  updateRoomSettingsController,
} from './rooms-controller';
import {
  getJiraTicketController,
  updateJiraStoryPointsController,
} from './jira-controller';
import {
  initiateJiraOAuthController,
  handleJiraOAuthCallbackController,
  getJiraOAuthStatusController,
  getJiraFieldsController,
  updateJiraFieldsController,
  revokeJiraOAuthController,
} from './jira-oauth-controller';
import {
  getLinearIssueController,
  updateLinearEstimateController,
} from './linear-controller';
import {
  initiateLinearOAuthController,
  handleLinearOAuthCallbackController,
  getLinearOAuthStatusController,
  revokeLinearOAuthController,
} from './linear-oauth-controller';
import type { Env } from '../types';

const jsonRequest = (
  body: Record<string, unknown>,
  method: 'POST' | 'PUT' = 'POST'
) =>
  new Request('https://test.sprintjam.co.uk', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as CfRequest;

const makeUrl = (path: string) =>
  new URL(`https://test.sprintjam.co.uk${path}`);
const expectJsonError = async (
  response: Response,
  message: string,
  status = 400
) => {
  const payload = (await response.json()) as { error: string };
  expect(response.status).toBe(status);
  expect(payload.error).toBe(message);
};

const env = {} as unknown as Env;

describe('rooms controller validation', () => {
  it('requires a name when creating a room', async () => {
    const response = (await createRoomController(
      jsonRequest({}),
      env
    )) as Response;

    await expectJsonError(response, 'Name is required');
  });

  it('requires name and room key when joining', async () => {
    const response = (await joinRoomController(
      jsonRequest({}),
      env
    )) as Response;

    await expectJsonError(response, 'Name and room key are required');
  });

  it('requires room key when reading settings', async () => {
    const response = (await getRoomSettingsController(
      makeUrl('/api/rooms/settings'),
      env
    )) as Response;

    await expectJsonError(response, 'Room key is required');
  });

  it('requires name, room key, and settings when updating settings', async () => {
    const response = (await updateRoomSettingsController(
      jsonRequest({}, 'PUT'),
      env
    )) as Response;

    await expectJsonError(
      response,
      'Name, room key, and settings are required'
    );
  });
});

describe('jira controller validation', () => {
  it('requires a ticket id when fetching Jira tickets', async () => {
    const response = (await getJiraTicketController(
      makeUrl('/api/jira/ticket?roomKey=123&userName=test'),
      env
    )) as Response;

    await expectJsonError(response, 'Ticket ID is required');
  });

  it('requires room and user when fetching Jira tickets', async () => {
    const response = (await getJiraTicketController(
      makeUrl('/api/jira/ticket?ticketId=ABC-1'),
      env
    )) as Response;

    await expectJsonError(response, 'Room key and user name are required');
  });

  it('requires story points when updating Jira tickets', async () => {
    const response = (await updateJiraStoryPointsController(
      'ABC-1',
      jsonRequest({ roomKey: 'room-1', userName: 'alice' }, 'PUT'),
      env
    )) as Response;

    await expectJsonError(response, 'Ticket ID and story points are required');
  });

  it('requires room and user when updating Jira tickets', async () => {
    const response = (await updateJiraStoryPointsController(
      'ABC-1',
      jsonRequest({ storyPoints: 5 }, 'PUT'),
      env
    )) as Response;

    await expectJsonError(response, 'Room key and user name are required');
  });
});

describe('jira oauth validation', () => {
  it('requires room and user when initiating Jira OAuth', async () => {
    const response = (await initiateJiraOAuthController(
      jsonRequest({}),
      env
    )) as Response;

    await expectJsonError(response, 'Room key and user name are required');
  });

  it('returns an html error when callback is missing code or state', async () => {
    const response = (await handleJiraOAuthCallbackController(
      makeUrl('/api/jira/oauth/callback'),
      env
    )) as Response;

    expect(response.status).toBe(400);
    expect(await response.text()).toContain('Missing code or state');
  });

  it('requires room and user when reading Jira OAuth status', async () => {
    const response = (await getJiraOAuthStatusController(
      makeUrl('/api/jira/oauth/status'),
      env
    )) as Response;

    await expectJsonError(response, 'Room key and user name are required');
  });

  it('requires room and user when fetching Jira fields', async () => {
    const response = (await getJiraFieldsController(
      makeUrl('/api/jira/oauth/fields'),
      env
    )) as Response;

    await expectJsonError(response, 'Room key and user name are required');
  });

  it('requires updates when changing Jira fields', async () => {
    const response = (await updateJiraFieldsController(
      jsonRequest({ roomKey: 'room-1', userName: 'alice' }, 'PUT'),
      env
    )) as Response;

    await expectJsonError(response, 'No field updates provided');
  });

  it('requires room and user when revoking Jira OAuth', async () => {
    const response = (await revokeJiraOAuthController(
      jsonRequest({}),
      env
    )) as Response;

    await expectJsonError(response, 'Room key and user name are required');
  });
});

describe('linear controller validation', () => {
  it('requires an issue id when fetching Linear issues', async () => {
    const response = (await getLinearIssueController(
      makeUrl('/api/linear/issue?roomKey=room-1&userName=alice'),
      env
    )) as Response;

    await expectJsonError(response, 'Issue ID is required');
  });

  it('requires room and user when fetching Linear issues', async () => {
    const response = (await getLinearIssueController(
      makeUrl('/api/linear/issue?issueId=LIN-1'),
      env
    )) as Response;

    await expectJsonError(response, 'Room key and user name are required');
  });

  it('requires estimate when updating Linear issues', async () => {
    const response = (await updateLinearEstimateController(
      'LIN-1',
      jsonRequest({ roomKey: 'room-1', userName: 'alice' }, 'PUT'),
      env
    )) as Response;

    await expectJsonError(response, 'Issue ID and estimate are required');
  });

  it('requires room and user when updating Linear issues', async () => {
    const response = (await updateLinearEstimateController(
      'LIN-1',
      jsonRequest({ estimate: 3 }, 'PUT'),
      env
    )) as Response;

    await expectJsonError(response, 'Room key and user name are required');
  });
});

describe('linear oauth validation', () => {
  it('requires room and user when initiating Linear OAuth', async () => {
    const response = (await initiateLinearOAuthController(
      jsonRequest({}),
      env
    )) as Response;

    await expectJsonError(response, 'Room key and user name are required');
  });

  it('returns an html error when linear callback is missing code or state', async () => {
    const response = (await handleLinearOAuthCallbackController(
      makeUrl('/api/linear/oauth/callback'),
      env
    )) as Response;

    expect(response.status).toBe(400);
    expect(await response.text()).toContain('Missing code or state');
  });

  it('requires room and user when reading Linear OAuth status', async () => {
    const response = (await getLinearOAuthStatusController(
      makeUrl('/api/linear/oauth/status'),
      env
    )) as Response;

    await expectJsonError(response, 'Room key and user name are required');
  });

  it('requires room and user when revoking Linear OAuth', async () => {
    const response = (await revokeLinearOAuthController(
      jsonRequest({}),
      env
    )) as Response;

    await expectJsonError(response, 'Room key and user name are required');
  });
});
