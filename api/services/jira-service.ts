import type { TicketMetadata } from "../../src/types";
import type { JiraFieldDefinition, JiraOAuthCredentials } from '../types';

/**
 * Parse Jira description in Atlassian Document Format (ADF)
 * @param description The description field from Jira API
 * @returns Plain text extracted from the description
 */
function parseJiraDescription(description: any): string {
  if (!description) return '';

  try {
    if (typeof description === 'string') return description;
    if (description.content && Array.isArray(description.content)) {
      return description.content
        .map((block: any) => {
          if (block.content && Array.isArray(block.content)) {
            return block.content
              .map((textNode: any) => textNode.text || '')
              .join('');
          }
          return block.text || '';
        })
        .join('\n');
    }
  } catch (e) {
    console.error('Error parsing Jira description:', e);
  }

  return '';
}

/**
 * Get OAuth authorization headers
 * @param accessToken OAuth access token
 * @returns Headers with OAuth authorization
 */
function getOAuthHeaders(accessToken: string): Headers {
  return new Headers({
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  });
}

/**
 * Refresh OAuth access token
 * @param refreshToken The refresh token
 * @param clientId OAuth client ID
 * @param clientSecret OAuth client secret
 * @returns New access token and refresh token
 */
async function refreshOAuthToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}> {
  const response = await fetch('https://auth.atlassian.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('Token refresh failed:', errorData);
    throw new Error(
      'Failed to refresh OAuth token. User needs to re-authenticate.'
    );
  }

  const data = await response.json<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }>();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

/**
 * Execute API call with automatic token refresh
 * @param credentials OAuth credentials
 * @param operation Function that performs the API call
 * @param onTokenRefresh Callback when token is refreshed
 * @param clientId OAuth client ID
 * @param clientSecret OAuth client secret
 * @returns API response
 */
async function executeWithTokenRefresh<T>(
  credentials: JiraOAuthCredentials,
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
          'OAuth token expired. Please reconnect your Jira account.'
        );
      }
    }
    throw error;
  }
}

/**
 * Fetch a Jira ticket by ID
 * @param credentials OAuth credentials
 * @param ticketId Jira ticket ID
 * @param onTokenRefresh Callback when token is refreshed
 * @param clientId OAuth client ID
 * @param clientSecret OAuth client secret
 * @returns Jira ticket details
 */
export async function fetchJiraTicket(
  credentials: JiraOAuthCredentials,
  ticketId: string,
  onTokenRefresh: (
    accessToken: string,
    refreshToken: string,
    expiresAt: number
  ) => Promise<void>,
  clientId: string,
  clientSecret: string
): Promise<TicketMetadata> {
  return executeWithTokenRefresh(
    credentials,
    async (accessToken) => {
      const headers = getOAuthHeaders(accessToken);
      const response = await fetch(
        `https://api.atlassian.com/ex/jira/${credentials.jiraCloudId}/rest/api/3/issue/${ticketId}`,
        {
          method: 'GET',
          headers,
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('401: Unauthorized');
        }
        const errorData = (await response.json()) as {
          errorMessages: string[];
        };
        throw new Error(
          errorData.errorMessages?.[0] ||
            `Failed to fetch Jira ticket: ${response.status}`
        );
      }

      const data = (await response.json()) as {
        id: string;
        key: string;
        fields: {
          summary: string;
          description: {
            content: {
              text: string;
            }[];
          }[];
          status: {
            name: string;
          };
          assignee: {
            displayName: string;
          };
          [key: string]: any;
        };
      };

      const storyPoints = credentials.storyPointsField
        ? data.fields[credentials.storyPointsField]
        : null;

      const ticket: TicketMetadata = {
        id: data.id,
        key: data.key,
        summary: data.fields.summary,
        description: parseJiraDescription(data.fields.description) || '',
        status: data.fields.status?.name || 'Unknown',
        assignee: data.fields.assignee?.displayName || null,
        storyPoints,
        url: `https://${credentials.jiraDomain}/browse/${data.key}`,
      };

      return ticket;
    },
    onTokenRefresh,
    clientId,
    clientSecret
  );
}

/**
 * Fetch all Jira fields available for the connected cloud instance
 */
export async function fetchJiraFields(
  credentials: JiraOAuthCredentials,
  onTokenRefresh: (
    accessToken: string,
    refreshToken: string,
    expiresAt: number
  ) => Promise<void>,
  clientId: string,
  clientSecret: string
): Promise<JiraFieldDefinition[]> {
  if (!credentials.jiraCloudId) {
    throw new Error('Jira cloud ID missing from credentials.');
  }

  return executeWithTokenRefresh(
    credentials,
    async (accessToken) => {
      const headers = getOAuthHeaders(accessToken);
      const response = await fetch(
        `https://api.atlassian.com/ex/jira/${credentials.jiraCloudId}/rest/api/3/field`,
        {
          method: 'GET',
          headers,
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('401: Unauthorized');
        }
        throw new Error(`Failed to fetch Jira fields: ${response.status}`);
      }

      return (await response.json()) as JiraFieldDefinition[];
    },
    onTokenRefresh,
    clientId,
    clientSecret
  );
}

export function findDefaultStoryPointsField(
  fields: JiraFieldDefinition[]
): string | null {
  const normalize = (value: string) => value.trim().toLowerCase();
  const preferredNames = [
    'story points',
    'story point estimate',
    'story points estimate',
  ];

  for (const name of preferredNames) {
    const match = fields.find((field) => normalize(field.name) === name);
    if (match) return match.id;
  }

  const partialMatch = fields.find((field) =>
    normalize(field.name).includes('story point')
  );
  if (partialMatch) return partialMatch.id;

  const numericField = fields.find((field) => field.schema?.type === 'number');
  return numericField?.id ?? null;
}

export function findDefaultSprintField(
  fields: JiraFieldDefinition[]
): string | null {
  const normalize = (value: string) => value.trim().toLowerCase();
  const sprintMatch = fields.find(
    (field) =>
      normalize(field.name) === 'sprint' ||
      normalize(field.name).includes('sprint')
  );
  return sprintMatch?.id ?? null;
}

/**
 * Update story points for a Jira ticket
 * @param credentials OAuth credentials
 * @param ticketId Jira ticket ID
 * @param storyPoints Story points value
 * @param currentTicket Optional current ticket data to avoid refetching
 * @param onTokenRefresh Callback when token is refreshed
 * @param clientId OAuth client ID
 * @param clientSecret OAuth client secret
 * @returns Updated Jira ticket
 */
export async function updateJiraStoryPoints(
  credentials: JiraOAuthCredentials,
  ticketId: string,
  storyPoints: number,
  currentTicket: TicketMetadata | undefined,
  onTokenRefresh: (
    accessToken: string,
    refreshToken: string,
    expiresAt: number
  ) => Promise<void>,
  clientId: string,
  clientSecret: string
): Promise<TicketMetadata> {
  if (!credentials.storyPointsField) {
    throw new Error(
      'Story points field not configured. Please reconnect your Jira account and configure the story points field.'
    );
  }

  return executeWithTokenRefresh(
    credentials,
    async (accessToken) => {
      const headers = getOAuthHeaders(accessToken);

      const response = await fetch(
        `https://api.atlassian.com/ex/jira/${credentials.jiraCloudId}/rest/api/3/issue/${ticketId}`,
        {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            fields: {
              [credentials.storyPointsField!]: storyPoints,
            },
          }),
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('401: Unauthorized');
        }
        const errorData = (await response.json()) as {
          errorMessages: string[];
        };
        throw new Error(
          errorData.errorMessages?.[0] ||
            `Failed to update Jira story points: ${response.status}`
        );
      }

      if (currentTicket) {
        return {
          ...currentTicket,
          storyPoints,
        };
      }

      return await fetchJiraTicket(
        credentials,
        ticketId,
        onTokenRefresh,
        clientId,
        clientSecret
      );
    },
    onTokenRefresh,
    clientId,
    clientSecret
  );
}
