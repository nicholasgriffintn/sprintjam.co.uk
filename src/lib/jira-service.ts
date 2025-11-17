import type { VoteValue, JiraTicket } from '../types';
import { API_BASE_URL } from '../constants';
import {
  jiraTicketsCollection,
  type JiraTicketRecord,
  ensureJiraTicketsCollectionReady,
} from './data/collections';

/**
 * Fetch Jira ticket details by ticket ID or key
 * @param {string} ticketId - The Jira ticket ID or key (e.g., "PROJECT-123")
 * @param {object} options - Optional parameters
 * @param {string} options.roomKey - The room key to store the ticket in
 * @param {string} options.userName - The user name making the request
 * @returns {Promise<JiraTicket>} - The Jira ticket details
 */
export async function fetchJiraTicket(
  ticketId: string,
  options?: { roomKey?: string; userName?: string }
): Promise<JiraTicket> {
  try {
    let url = `${API_BASE_URL}/jira/ticket?ticketId=${encodeURIComponent(ticketId)}`;
    
    if (options?.roomKey && options?.userName) {
      url += `&roomKey=${encodeURIComponent(options.roomKey)}&userName=${encodeURIComponent(options.userName)}`;
    }
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to fetch Jira ticket: ${response.status}`);
    }

    const data = await response.json();
    console.log('Jira ticket API response:', data);
  
    const ticket: JiraTicket | undefined = data.ticket ?? data.room?.jiraTicket;

    if (ticket) {
      if (options?.roomKey) {
        await ensureJiraTicketsCollectionReady();
        const record: JiraTicketRecord = { ...ticket, roomKey: options.roomKey };
        jiraTicketsCollection.utils.writeUpsert(record);
      }
      return ticket;
    }
    throw new Error('Invalid response format from Jira API');
  } catch (error) {
    console.error('Error fetching Jira ticket:', error);
    throw error;
  }
}

/**
 * Update story points for a Jira ticket
 * @param {string} ticketId - The Jira ticket ID or key
 * @param {number} storyPoints - The story points value to set
 * @param {object} options - Optional parameters
 * @param {string} options.roomKey - The room key to update the ticket in
 * @param {string} options.userName - The user name making the request
 * @returns {Promise<JiraTicket>} - The updated Jira ticket details
 */
export async function updateJiraStoryPoints(
  ticketId: string,
  storyPoints: number,
  options: { roomKey: string; userName: string }
): Promise<JiraTicket> {
  try {
    const response = await fetch(`${API_BASE_URL}/jira/ticket/${encodeURIComponent(ticketId)}/storyPoints`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        storyPoints,
        roomKey: options.roomKey,
        userName: options.userName
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to update Jira story points: ${response.status}`);
    }

    const data = await response.json();
    const ticket = data.ticket as JiraTicket;

    if (ticket && options.roomKey) {
      await ensureJiraTicketsCollectionReady();
      const record: JiraTicketRecord = { ...ticket, roomKey: options.roomKey };
      jiraTicketsCollection.utils.writeUpsert(record);
    }

    return ticket;
  } catch (error) {
    console.error('Error updating Jira story points:', error);
    throw error;
  }
}

/**
 * Convert a planning poker vote value to a Jira story points number
 * @param {VoteValue} voteValue - The planning poker vote value
 * @returns {number | null} - The corresponding Jira story points number
 */
export function convertVoteValueToStoryPoints(voteValue: VoteValue): number | null {
  if (voteValue === null || voteValue === '?' || voteValue === 'coffee') {
    return null;
  }
  
  const numericValue = typeof voteValue === 'number' ? voteValue : Number(voteValue);
  
  if (Number.isNaN(numericValue)) {
    return null;
  }
  
  return numericValue;
}

/**
 * Clear the current Jira ticket from the room state
 * @param {string} roomKey - The room key
 * @param {string} userName - The user name making the request
 * @returns {Promise<void>}
 */
export interface JiraIntegrationSummary {
  cloudId: string;
  siteUrl: string;
  scopes: string[];
  connectedBy: string;
  connectedAt: number;
}

export async function clearJiraTicket(roomKey: string, userName: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/jira/ticket/clear`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ roomKey, userName }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to clear Jira ticket: ${response.status}`);
    }

    await ensureJiraTicketsCollectionReady();

    const keysToDelete: Array<string | number> = [];
    for (const [key, value] of jiraTicketsCollection.state) {
      if (value.roomKey === roomKey) {
        keysToDelete.push(key);
      }
    }

    if (keysToDelete.length > 0) {
      jiraTicketsCollection.utils.writeDelete(keysToDelete);
    }
  } catch (error) {
    console.error('Error clearing Jira ticket:', error);
    throw error;
  }
}

export async function getJiraIntegrationStatus(
  roomKey: string
): Promise<JiraIntegrationSummary | undefined> {
  const response = await fetch(
    `${API_BASE_URL}/jira/oauth/status?roomKey=${encodeURIComponent(roomKey)}`
  );
  const data = (await response.json().catch(() => undefined)) as
    | { integration?: JiraIntegrationSummary; error?: string }
    | undefined;

  if (!response.ok) {
    throw new Error(
      data?.error || `Failed to fetch Jira integration: ${response.status}`
    );
  }

  return data?.integration;
}

export async function startJiraOAuth(
  roomKey: string,
  userName: string
): Promise<string> {
  const response = await fetch(
    `${API_BASE_URL}/jira/oauth/start?roomKey=${encodeURIComponent(
      roomKey
    )}&userName=${encodeURIComponent(userName)}`
  );

  const data = (await response.json().catch(() => undefined)) as
    | { url?: string; error?: string }
    | undefined;

  if (!response.ok) {
    throw new Error(
      data?.error || `Failed to start Jira OAuth: ${response.status}`
    );
  }

  if (!data.url) {
    throw new Error('Jira OAuth did not return an authorization URL');
  }

  return data.url;
}

export async function disconnectJiraIntegration(
  roomKey: string,
  userName: string
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/jira/oauth/disconnect`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ roomKey, userName }),
  });

  const payload = (await response.json().catch(() => undefined)) as
    | { error?: string }
    | undefined;

  if (!response.ok) {
    throw new Error(
      payload?.error || `Failed to disconnect Jira: ${response.status}`
    );
  }
}
