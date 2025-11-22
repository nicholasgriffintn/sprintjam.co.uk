import type { VoteValue, TicketMetadata } from "../types";
import { API_BASE_URL } from "../constants";
import { safeLocalStorage } from "../utils/storage";
import { AUTH_TOKEN_STORAGE_KEY } from "../constants";

function resolveSessionToken(provided?: string | null): string {
  if (provided) return provided;
  const stored = safeLocalStorage.get(AUTH_TOKEN_STORAGE_KEY);
  if (!stored) {
    throw new Error("Missing session token. Please rejoin the room.");
  }
  return stored;
}

export async function fetchJiraTicket(
  ticketId: string,
  options?: { roomKey?: string; userName?: string; sessionToken?: string }
): Promise<TicketMetadata> {
  try {
    const sessionToken = resolveSessionToken(options?.sessionToken);
    let url = `${API_BASE_URL}/jira/ticket?ticketId=${encodeURIComponent(
      ticketId
    )}`;

    if (options?.roomKey && options?.userName) {
      url += `&roomKey=${encodeURIComponent(
        options.roomKey
      )}&userName=${encodeURIComponent(options.userName)}`;
      url += `&sessionToken=${encodeURIComponent(sessionToken)}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error || `Failed to fetch Jira ticket: ${response.status}`
      );
    }

    const data = await response.json();
    console.log('Jira ticket API response:', data);

    const ticket: TicketMetadata | undefined = data.ticket;

    if (ticket) {
      return ticket;
    }
    throw new Error('Invalid response format from Jira API');
  } catch (error) {
    console.error('Error fetching Jira ticket:', error);
    throw error;
  }
}

export async function updateJiraStoryPoints(
  ticketId: string,
  storyPoints: number,
  options: { roomKey: string; userName: string; sessionToken?: string },
): Promise<TicketMetadata> {
  try {
    const sessionToken = resolveSessionToken(options.sessionToken);
    const response = await fetch(
      `${API_BASE_URL}/jira/ticket/${encodeURIComponent(ticketId)}/storyPoints`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          storyPoints,
          roomKey: options.roomKey,
          userName: options.userName,
          sessionToken,
        }),
      },
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error ||
          `Failed to update Jira story points: ${response.status}`,
      );
    }

    const data = await response.json();
    const ticket = data.ticket as TicketMetadata;

    return ticket;
  } catch (error) {
    console.error("Error updating Jira story points:", error);
    throw error;
  }
}

export function convertVoteValueToStoryPoints(
  voteValue: VoteValue,
): number | null {
  if (voteValue === null || voteValue === "?" || voteValue === "coffee") {
    return null;
  }

  const numericValue =
    typeof voteValue === "number" ? voteValue : Number(voteValue);

  if (Number.isNaN(numericValue)) {
    return null;
  }

  return numericValue;
}
