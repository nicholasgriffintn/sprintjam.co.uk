import type { JiraOAuthIntegration, JiraTicket } from '../types';

const ATLASSIAN_EX_API_BASE = 'https://api.atlassian.com/ex/jira';

type BasicAuthConfig = {
  type: 'basic';
  domain: string;
  email: string;
  apiToken: string;
};

type OAuthAuthConfig =
  | ({ type: 'oauth' } & Pick<
      JiraOAuthIntegration,
      'cloudId' | 'siteUrl' | 'accessToken'
    >);

export type JiraAuthConfig = BasicAuthConfig | OAuthAuthConfig;

function parseJiraDescription(description: unknown): string {
  if (!description) return '';

  try {
    if (typeof description === 'string') return description;
    if (
      typeof description === 'object' &&
      description !== null &&
      'content' in description &&
      Array.isArray((description as any).content)
    ) {
      return ((description as any).content as any[])
        .map((block) => {
          if (block && Array.isArray(block.content)) {
            return block.content
              .map((node: any) => node?.text || '')
              .join('');
          }
          return block?.text || '';
        })
        .join('\n');
    }
  } catch (error) {
    console.error('Error parsing Jira description:', error);
  }

  return '';
}

function getApiBase(auth: JiraAuthConfig): string {
  if (auth.type === 'oauth') {
    return `${ATLASSIAN_EX_API_BASE}/${auth.cloudId}/rest/api/3`;
  }

  return `https://${auth.domain}/rest/api/3`;
}

function createTicketLink(auth: JiraAuthConfig, key: string): string {
  if (auth.type === 'oauth') {
    return `${auth.siteUrl}/browse/${key}`;
  }

  return `https://${auth.domain}/browse/${key}`;
}

function getAuthHeaders(auth: JiraAuthConfig): Headers {
  if (auth.type === 'oauth') {
    return new Headers({
      Authorization: `Bearer ${auth.accessToken}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    });
  }

  const basic = btoa(`${auth.email}:${auth.apiToken}`);
  return new Headers({
    Authorization: `Basic ${basic}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  });
}

export async function fetchJiraTicket(
  auth: JiraAuthConfig,
  storyPointsField: string,
  ticketId: string
): Promise<JiraTicket> {
  try {
    const headers = getAuthHeaders(auth);
    const response = await fetch(`${getApiBase(auth)}/issue/${ticketId}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => undefined)) as
        | { errorMessages?: string[] }
        | undefined;
      throw new Error(
        errorData?.errorMessages?.[0] ||
          `Failed to fetch Jira ticket: ${response.status}`
      );
    }

    const data = (await response.json()) as {
      id: string;
      key: string;
      fields: Record<string, any>;
    };

    const ticket: JiraTicket = {
      id: data.id,
      key: data.key,
      summary: data.fields.summary,
      description: parseJiraDescription(data.fields.description) || '',
      status: data.fields.status?.name || 'Unknown',
      assignee: data.fields.assignee?.displayName || null,
      storyPoints: storyPointsField ? data.fields[storyPointsField] : null,
      url: createTicketLink(auth, data.key),
    };

    return ticket;
  } catch (error) {
    console.error('Error fetching Jira ticket:', error);
    throw error;
  }
}

export async function updateJiraStoryPoints(
  auth: JiraAuthConfig,
  storyPointsField: string,
  ticketId: string,
  storyPoints: number,
  currentTicket?: JiraTicket
): Promise<JiraTicket> {
  try {
    const headers = getAuthHeaders(auth);

    const response = await fetch(`${getApiBase(auth)}/issue/${ticketId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        fields: {
          [storyPointsField]: storyPoints,
        },
      }),
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => undefined)) as
        | { errorMessages?: string[] }
        | undefined;
      throw new Error(
        errorData?.errorMessages?.[0] ||
          `Failed to update Jira story points: ${response.status}`
      );
    }

    if (currentTicket) {
      return {
        ...currentTicket,
        storyPoints,
      };
    }

    return await fetchJiraTicket(auth, storyPointsField, ticketId);
  } catch (error) {
    console.error('Error updating Jira story points:', error);
    throw error;
  }
}
