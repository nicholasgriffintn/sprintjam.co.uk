import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import type { RoomWorkerEnv } from '@sprintjam/types';

const roomFetch = vi.fn();
const originalBtoa = globalThis.btoa;

if (typeof globalThis.btoa === 'undefined') {
  (globalThis as any).btoa = (value: string) =>
    (globalThis as any).Buffer.from(value, 'utf-8').toString('base64');
}

vi.mock('@sprintjam/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@sprintjam/utils')>();
  return {
    ...actual,
    getRoomStub: vi.fn(() => ({ fetch: roomFetch })),
  };
});

import { revokeJiraOAuthController } from './jira-oauth-controller';
import { revokeLinearOAuthController } from './linear-oauth-controller';
import { revokeGithubOAuthController } from './github-oauth-controller';

const okJson = (data: unknown) =>
  new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

describe('provider revoke controllers', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    roomFetch.mockReset();
    fetchMock.mockReset();
    // @ts-expect-error override global fetch for tests
    global.fetch = fetchMock;
  });

  afterAll(() => {
    if (originalBtoa) {
      (globalThis as any).btoa = originalBtoa;
    }
  });

  it('revokes Jira token upstream before deleting room credentials', async () => {
    const env = {
      JIRA_OAUTH_CLIENT_ID: 'jira-client',
      JIRA_OAUTH_CLIENT_SECRET: 'jira-secret',
    } as unknown as RoomWorkerEnv;

    roomFetch.mockImplementation((req: Request) => {
      if (req.url.includes('session/validate')) {
        return okJson({ ok: true });
      }
      if (req.url.includes('jira/oauth/credentials')) {
        return okJson({
          credentials: {
            accessToken: 'jira-access',
            refreshToken: 'jira-refresh',
          },
        });
      }
      if (req.url.includes('jira/oauth/revoke')) {
        return okJson({ success: true });
      }
      return new Response('not found', { status: 404 });
    });

    fetchMock.mockResolvedValue(new Response('', { status: 200 }));

    const response = (await revokeJiraOAuthController(
      new Request('https://test/api/jira/oauth/revoke', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: 'room_session=token',
        },
        body: JSON.stringify({
          roomKey: 'room-1',
          userName: 'alice',
        }),
      }),
      env
    )) as Response;

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://auth.atlassian.com/oauth/revoke',
      expect.objectContaining({
        method: 'POST',
      })
    );
    expect(roomFetch).toHaveBeenCalledWith(
      expect.objectContaining({
        url: expect.stringContaining('jira/oauth/revoke'),
      })
    );
  });

  it('revokes Linear token upstream before deleting room credentials', async () => {
    const env = {
      LINEAR_OAUTH_CLIENT_ID: 'linear-client',
      LINEAR_OAUTH_CLIENT_SECRET: 'linear-secret',
    } as unknown as RoomWorkerEnv;

    roomFetch.mockImplementation((req: Request) => {
      if (req.url.includes('session/validate')) {
        return okJson({ ok: true });
      }
      if (req.url.includes('linear/oauth/credentials')) {
        return okJson({
          credentials: {
            accessToken: 'linear-access',
            refreshToken: 'linear-refresh',
          },
        });
      }
      if (req.url.includes('linear/oauth/revoke')) {
        return okJson({ success: true });
      }
      return new Response('not found', { status: 404 });
    });

    fetchMock.mockResolvedValue(new Response('', { status: 200 }));

    const response = (await revokeLinearOAuthController(
      new Request('https://test/api/linear/oauth/revoke', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: 'room_session=token',
        },
        body: JSON.stringify({
          roomKey: 'room-1',
          userName: 'alice',
        }),
      }),
      env
    )) as Response;

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.linear.app/oauth/revoke',
      expect.objectContaining({
        method: 'POST',
      })
    );
    expect(roomFetch).toHaveBeenCalledWith(
      expect.objectContaining({
        url: expect.stringContaining('linear/oauth/revoke'),
      })
    );
  });

  it('revokes GitHub token upstream before deleting room credentials', async () => {
    const env = {
      GITHUB_OAUTH_CLIENT_ID: 'github-client',
      GITHUB_OAUTH_CLIENT_SECRET: 'github-secret',
    } as unknown as RoomWorkerEnv;

    roomFetch.mockImplementation((req: Request) => {
      if (req.url.includes('session/validate')) {
        return okJson({ ok: true });
      }
      if (req.url.includes('github/oauth/credentials')) {
        return okJson({
          credentials: {
            accessToken: 'github-access',
          },
        });
      }
      if (req.url.includes('github/oauth/revoke')) {
        return okJson({ success: true });
      }
      return new Response('not found', { status: 404 });
    });

    fetchMock.mockResolvedValue(new Response('', { status: 200 }));

    const response = (await revokeGithubOAuthController(
      new Request('https://test/api/github/oauth/revoke', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: 'room_session=token',
        },
        body: JSON.stringify({
          roomKey: 'room-1',
          userName: 'alice',
        }),
      }),
      env
    )) as Response;

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      `https://api.github.com/applications/${env.GITHUB_OAUTH_CLIENT_ID}/grant`,
      expect.objectContaining({
        method: 'DELETE',
      })
    );
    expect(roomFetch).toHaveBeenCalledWith(
      expect.objectContaining({
        url: expect.stringContaining('github/oauth/revoke'),
      })
    );
  });
});
