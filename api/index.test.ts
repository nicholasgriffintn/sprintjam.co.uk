import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Request as CfRequest } from '@cloudflare/workers-types';

import type { Env } from './types';

const mocks = vi.hoisted(() => ({
  getDefaultsController: vi.fn(),
  createRoomController: vi.fn(),
  getRoomSettingsController: vi.fn(),
  joinRoomController: vi.fn(),
  updateRoomSettingsController: vi.fn(),
  getJiraTicketController: vi.fn(),
  updateJiraStoryPointsController: vi.fn(),
  initiateJiraOAuthController: vi.fn(),
  handleJiraOAuthCallbackController: vi.fn(),
  getJiraOAuthStatusController: vi.fn(),
  getJiraFieldsController: vi.fn(),
  updateJiraFieldsController: vi.fn(),
  revokeJiraOAuthController: vi.fn(),
  getLinearIssueController: vi.fn(),
  updateLinearEstimateController: vi.fn(),
  initiateLinearOAuthController: vi.fn(),
  handleLinearOAuthCallbackController: vi.fn(),
  getLinearOAuthStatusController: vi.fn(),
  revokeLinearOAuthController: vi.fn(),
  getRoomStub: vi.fn(),
}));

const {
  getDefaultsController: mockGetDefaultsController,
  getRoomStub: mockGetRoomStub,
} = mocks;

vi.mock('./controllers/defaults-controller', () => ({
  getDefaultsController: mocks.getDefaultsController,
}));

vi.mock('./controllers/rooms-controller', () => ({
  createRoomController: mocks.createRoomController,
  getRoomSettingsController: mocks.getRoomSettingsController,
  joinRoomController: mocks.joinRoomController,
  updateRoomSettingsController: mocks.updateRoomSettingsController,
}));

vi.mock('./controllers/jira-controller', () => ({
  getJiraTicketController: mocks.getJiraTicketController,
  updateJiraStoryPointsController: mocks.updateJiraStoryPointsController,
}));

vi.mock('./controllers/jira-oauth-controller', () => ({
  initiateJiraOAuthController: mocks.initiateJiraOAuthController,
  handleJiraOAuthCallbackController: mocks.handleJiraOAuthCallbackController,
  getJiraOAuthStatusController: mocks.getJiraOAuthStatusController,
  getJiraFieldsController: mocks.getJiraFieldsController,
  updateJiraFieldsController: mocks.updateJiraFieldsController,
  revokeJiraOAuthController: mocks.revokeJiraOAuthController,
}));

vi.mock('./controllers/linear-controller', () => ({
  getLinearIssueController: mocks.getLinearIssueController,
  updateLinearEstimateController: mocks.updateLinearEstimateController,
}));

vi.mock('./controllers/linear-oauth-controller', () => ({
  initiateLinearOAuthController: mocks.initiateLinearOAuthController,
  handleLinearOAuthCallbackController:
    mocks.handleLinearOAuthCallbackController,
  getLinearOAuthStatusController: mocks.getLinearOAuthStatusController,
  revokeLinearOAuthController: mocks.revokeLinearOAuthController,
}));

vi.mock('./utils/room', () => ({
  getRoomStub: mocks.getRoomStub,
}));

import handler from './index';

const makeEnv = () =>
  ({
    ASSETS: {
      fetch: vi.fn(async () => new Response('asset-content')),
    },
  } as unknown as Env);

const cfRequest = (url: string, init?: RequestInit) =>
  new Request(url, init) as unknown as CfRequest;

describe('api entrypoint routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects websocket requests without an upgrade header', async () => {
    const env = makeEnv();
    const request = cfRequest('https://test.sprintjam.co.uk/ws');

    const response = (await handler.fetch(request, env)) as Response;

    expect(response.status).toBe(400);
    expect(await response.text()).toContain('Expected WebSocket');
  });

  it('rejects websocket requests missing required query params', async () => {
    const env = makeEnv();
    const request = cfRequest('https://test.sprintjam.co.uk/ws?room=abc', {
      headers: { Upgrade: 'websocket' },
    });

    const response = (await handler.fetch(request, env)) as Response;

    expect(response.status).toBe(400);
    expect(await response.text()).toContain(
      'Missing room key, user name, or token'
    );
  });

  it('forwards websocket requests to the room durable object', async () => {
    const roomFetch = vi.fn(async () => new Response('ws-ok'));
    mockGetRoomStub.mockReturnValue({ fetch: roomFetch });
    const env = makeEnv();
    const request = cfRequest(
      'https://test.sprintjam.co.uk/ws?room=room1&name=alice&token=abc',
      { headers: { Upgrade: 'websocket' } }
    );

    const response = (await handler.fetch(request, env)) as Response;

    expect(roomFetch).toHaveBeenCalledWith(request);
    expect(await response.text()).toBe('ws-ok');
  });

  it('routes /api/defaults to the defaults controller', async () => {
    const env = makeEnv();
    mockGetDefaultsController.mockReturnValue(new Response('defaults'));
    const request = cfRequest('https://test.sprintjam.co.uk/api/defaults', {
      method: 'GET',
    });

    const response = (await handler.fetch(request, env)) as Response;

    expect(mockGetDefaultsController).toHaveBeenCalled();
    expect(await response.text()).toBe('defaults');
  });

  it('returns 404 for unknown api paths', async () => {
    const env = makeEnv();
    const request = cfRequest('https://test.sprintjam.co.uk/api/unknown', {
      method: 'GET',
    });

    const response = (await handler.fetch(request, env)) as Response;
    const payload = (await response.json()) as { error: string };

    expect(response.status).toBe(404);
    expect(payload.error).toBe('Not found');
  });

  it('falls back to asset fetches for non-api routes', async () => {
    const env = makeEnv();
    const request = cfRequest('https://test.sprintjam.co.uk/', {
      method: 'GET',
    });

    const response = (await handler.fetch(request, env)) as Response;

    expect(env.ASSETS.fetch).toHaveBeenCalledWith(request);
    expect(await response.text()).toBe('asset-content');
  });
});
