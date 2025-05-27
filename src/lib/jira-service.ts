import type { VoteValue, JiraTicket } from '../types';
import { API_BASE_URL } from '../constants';

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
  
    if (data.ticket) {
      return data.ticket;
    } else if (data.room && data.room.jiraTicket) {
      return data.room.jiraTicket;
    } else if (data.success && data.room && data.room.jiraTicket) {
      return data.room.jiraTicket;
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
    return data.ticket;
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
  
  if (isNaN(numericValue)) {
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
  } catch (error) {
    console.error('Error clearing Jira ticket:', error);
    throw error;
  }
}
