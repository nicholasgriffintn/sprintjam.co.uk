import type { Request as CfRequest } from '@cloudflare/workers-types';

import type { Env, JiraOAuthIntegration } from '../types';
import { getRoomStub } from './room';

async function toJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(text || 'Unexpected response from room object');
  }
}

export async function fetchRoomJiraIntegration(
  env: Env,
  roomKey: string
): Promise<JiraOAuthIntegration | undefined> {
  const roomObject = getRoomStub(env, roomKey);
  const response = await roomObject.fetch(
    new Request('https://dummy/jira/integration', {
      method: 'GET',
    }) as unknown as CfRequest
  );

  if (!response.ok) {
    const payload = await toJson<{ error?: string }>(response).catch(() => undefined);
    if (response.status === 404) {
      return undefined;
    }
    throw new Error(payload?.error ?? 'Failed to load Jira integration');
  }

  const data = (await response.json()) as { integration?: JiraOAuthIntegration };
  return data.integration;
}

export async function persistRoomJiraIntegration(
  env: Env,
  roomKey: string,
  integration: JiraOAuthIntegration
): Promise<void> {
  const roomObject = getRoomStub(env, roomKey);
  const response = await roomObject.fetch(
    new Request('https://dummy/jira/integration', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ integration, system: true }),
    }) as unknown as CfRequest
  );

  if (!response.ok) {
    const payload = await toJson<{ error?: string }>(response).catch(() => undefined);
    throw new Error(payload?.error ?? 'Failed to persist Jira integration');
  }
}
