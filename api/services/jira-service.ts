import type { TicketMetadata } from '../../src/types';

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
 * Connect to Jira API with authentication
 * @param email Jira user email
 * @param apiToken Jira API token
 * @returns Headers with authentication
 */
function getAuthHeaders(email: string, apiToken: string): Headers {
  const auth = btoa(`${email}:${apiToken}`);
  return new Headers({
    Authorization: `Basic ${auth}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  });
}

/**
 * Fetch a Jira ticket by ID
 * @param domain Jira domain
 * @param email Jira user email
 * @param apiToken Jira API token
 * @param ticketId Jira ticket ID
 * @returns Jira ticket details
 */
export async function fetchJiraTicket(
  domain: string,
  email: string,
  apiToken: string,
  storyPointsField: string,
  ticketId: string
): Promise<TicketMetadata> {
  try {
    const headers = getAuthHeaders(email, apiToken);
    const response = await fetch(
      `https://${domain}/rest/api/3/issue/${ticketId}`,
      {
        method: 'GET',
        headers,
      }
    );

    if (!response.ok) {
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

    const ticket: TicketMetadata = {
      id: data.id,
      key: data.key,
      summary: data.fields.summary,
      description: parseJiraDescription(data.fields.description) || '',
      status: data.fields.status?.name || 'Unknown',
      assignee: data.fields.assignee?.displayName || null,
      storyPoints: storyPointsField ? data.fields[storyPointsField] : null,
      url: `https://${domain}/browse/${data.key}`,
    };

    return ticket;
  } catch (error) {
    console.error('Error fetching Jira ticket:', error);
    throw error;
  }
}

/**
 * Update story points for a Jira ticket
 * @param domain Jira domain
 * @param email Jira user email
 * @param apiToken Jira API token
 * @param ticketId Jira ticket ID
 * @param storyPoints Story points value
 * @param currentTicket Optional current ticket data to avoid refetching
 * @returns Updated Jira ticket
 */
export async function updateJiraStoryPoints(
  domain: string,
  email: string,
  apiToken: string,
  storyPointsField: string,
  ticketId: string,
  storyPoints: number,
  currentTicket?: TicketMetadata
): Promise<TicketMetadata> {
  try {
    const headers = getAuthHeaders(email, apiToken);

    const response = await fetch(
      `https://${domain}/rest/api/3/issue/${ticketId}`,
      {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          fields: {
            [storyPointsField]: storyPoints,
          },
        }),
      }
    );

    if (!response.ok) {
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
      domain,
      email,
      apiToken,
      storyPointsField,
      ticketId
    );
  } catch (error) {
    console.error('Error updating Jira story points:', error);
    throw error;
  }
}
