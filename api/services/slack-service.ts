import type { SlackOAuthCredentials, SlackMessage, RoomData } from '../types';

function getOAuthHeaders(accessToken: string): Headers {
  return new Headers({
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  });
}

async function refreshOAuthToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}> {
  const response = await fetch('https://slack.com/api/oauth.v2.access', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }).toString(),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('Token refresh failed:', errorData);
    throw new Error(
      'Failed to refresh OAuth token. User needs to re-authenticate.'
    );
  }

  const data = await response.json<{
    ok: boolean;
    access_token: string;
    refresh_token: string;
    expires_in: number;
    error?: string;
  }>();

  if (!data.ok) {
    throw new Error(`Slack token refresh failed: ${data.error || 'Unknown error'}`);
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

async function executeWithTokenRefresh<T>(
  credentials: SlackOAuthCredentials,
  operation: (accessToken: string) => Promise<T>,
  onTokenRefresh: (
    accessToken: string,
    refreshToken: string,
    expiresAt: number
  ) => Promise<void>,
  clientId: string,
  clientSecret: string
): Promise<T> {
  const isExpiringSoon = credentials.expiresAt - Date.now() < 5 * 60 * 1000;

  if (isExpiringSoon && credentials.refreshToken) {
    try {
      const refreshed = await refreshOAuthToken(
        credentials.refreshToken,
        clientId,
        clientSecret
      );

      const newExpiresAt = Date.now() + refreshed.expiresIn * 1000;

      await onTokenRefresh(
        refreshed.accessToken,
        refreshed.refreshToken,
        newExpiresAt
      );

      return await operation(refreshed.accessToken);
    } catch (error) {
      console.error('Token refresh failed:', error);
      // Try with existing token anyway
    }
  }

  try {
    return await operation(credentials.accessToken);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('401') &&
      credentials.refreshToken
    ) {
      try {
        const refreshed = await refreshOAuthToken(
          credentials.refreshToken,
          clientId,
          clientSecret
        );

        const newExpiresAt = Date.now() + refreshed.expiresIn * 1000;

        await onTokenRefresh(
          refreshed.accessToken,
          refreshed.refreshToken,
          newExpiresAt
        );

        return await operation(refreshed.accessToken);
      } catch (refreshError) {
        console.error('Token refresh retry failed:', refreshError);
        throw new Error(
          'OAuth token expired. Please reconnect your Slack workspace.'
        );
      }
    }
    throw error;
  }
}

async function executeSlackAPI<T>(
  accessToken: string,
  endpoint: string,
  method: string = 'GET',
  body?: Record<string, unknown>
): Promise<T> {
  const headers = getOAuthHeaders(accessToken);
  const url = `https://slack.com/api/${endpoint}`;

  const options: RequestInit = {
    method,
    headers,
  };

  if (body && method !== 'GET') {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('401: Unauthorized');
    }
    const bodyText = await response.text();
    throw new Error(
      `Slack API request failed: ${response.status} ${bodyText}`.trim()
    );
  }

  const data = await response.json<T & { ok: boolean; error?: string }>();

  if (!data.ok) {
    throw new Error(`Slack API error: ${data.error || 'Unknown error'}`);
  }

  return data;
}

export async function postSlackMessage(
  credentials: SlackOAuthCredentials,
  message: SlackMessage,
  onTokenRefresh: (
    accessToken: string,
    refreshToken: string,
    expiresAt: number
  ) => Promise<void>,
  clientId: string,
  clientSecret: string
): Promise<{ ts: string; channel: string }> {
  return executeWithTokenRefresh(
    credentials,
    async (accessToken) => {
      const data = await executeSlackAPI<{
        ok: boolean;
        ts: string;
        channel: string;
      }>(accessToken, 'chat.postMessage', 'POST', message);

      return {
        ts: data.ts,
        channel: data.channel,
      };
    },
    onTokenRefresh,
    clientId,
    clientSecret
  );
}

export async function getSlackTeamInfo(
  accessToken: string
): Promise<{
  id: string;
  name: string;
}> {
  const data = await executeSlackAPI<{
    ok: boolean;
    team: {
      id: string;
      name: string;
    };
  }>(accessToken, 'team.info');

  return data.team;
}

export async function getSlackUserInfo(
  accessToken: string
): Promise<{
  id: string;
  name: string;
  email?: string;
}> {
  const data = await executeSlackAPI<{
    ok: boolean;
    user: {
      id: string;
      name: string;
      profile?: {
        email?: string;
      };
    };
  }>(accessToken, 'auth.test');

  return {
    id: data.user.id,
    name: data.user.name,
    email: data.user.profile?.email,
  };
}

export function formatVotingResultsForSlack(roomData: RoomData): SlackMessage {
  const channel = roomData.settings.externalService === 'slack' ? '' : '';

  // Calculate voting statistics
  const votes = Object.entries(roomData.votes)
    .filter(([_, vote]) => vote !== null)
    .map(([user, vote]) => ({ user, vote }));

  const voteValues = votes
    .map(v => v.vote)
    .filter(v => typeof v === 'number' || !isNaN(Number(v)))
    .map(v => Number(v));

  const average = voteValues.length > 0
    ? (voteValues.reduce((a, b) => a + b, 0) / voteValues.length).toFixed(1)
    : 'N/A';

  const median = voteValues.length > 0
    ? (() => {
        const sorted = [...voteValues].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 === 0
          ? ((sorted[mid - 1] + sorted[mid]) / 2).toFixed(1)
          : sorted[mid].toString();
      })()
    : 'N/A';

  // Build vote distribution
  const voteDistribution = votes.reduce((acc, { vote }) => {
    const key = String(vote);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const distributionText = Object.entries(voteDistribution)
    .sort((a, b) => Number(b[1]) - Number(a[1]))
    .map(([vote, count]) => `*${vote}*: ${count} vote${count > 1 ? 's' : ''}`)
    .join(' | ');

  const ticketInfo = roomData.currentTicket
    ? `*Ticket:* ${roomData.currentTicket.title || roomData.currentTicket.ticketId}`
    : '*Planning Poker Session*';

  return {
    channel,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🎯 Voting Results',
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: ticketInfo,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Average:*\n${average}`,
          },
          {
            type: 'mrkdwn',
            text: `*Median:*\n${median}`,
          },
          {
            type: 'mrkdwn',
            text: `*Total Votes:*\n${votes.length}`,
          },
          {
            type: 'mrkdwn',
            text: `*Participants:*\n${roomData.users.length}`,
          },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Vote Distribution:*\n${distributionText}`,
        },
      },
      {
        type: 'divider',
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Room: *${roomData.key}* | Posted by SprintJam`,
          },
        ],
      },
    ],
  };
}

export function formatSessionStartForSlack(roomData: RoomData): SlackMessage {
  const channel = roomData.settings.externalService === 'slack' ? '' : '';

  const ticketInfo = roomData.currentTicket
    ? `*Ticket:* ${roomData.currentTicket.title || roomData.currentTicket.ticketId}`
    : '*New Planning Poker Session*';

  return {
    channel,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🚀 Planning Session Started',
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: ticketInfo,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Room:*\n${roomData.key}`,
          },
          {
            type: 'mrkdwn',
            text: `*Moderator:*\n${roomData.moderator}`,
          },
          {
            type: 'mrkdwn',
            text: `*Participants:*\n${roomData.users.length}`,
          },
        ],
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: 'Posted by SprintJam',
          },
        ],
      },
    ],
  };
}
