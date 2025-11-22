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

export async function fetchLinearIssue(
  issueId: string,
  options?: { roomKey?: string; userName?: string; sessionToken?: string }
): Promise<TicketMetadata> {
  try {
    const sessionToken = resolveSessionToken(options?.sessionToken);
    let url = `${API_BASE_URL}/linear/issue?issueId=${encodeURIComponent(
      issueId
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
        errorData.error || `Failed to fetch Linear issue: ${response.status}`
      );
    }

    const data = await response.json();
    console.log('Linear issue API response:', data);

    const ticket: TicketMetadata | undefined = data.ticket;

    if (ticket) {
      return ticket;
    }
    throw new Error('Invalid response format from Linear API');
  } catch (error) {
    console.error('Error fetching Linear issue:', error);
    throw error;
  }
}

export async function updateLinearEstimate(
  issueId: string,
  estimate: number,
  options: { roomKey: string; userName: string; sessionToken?: string },
): Promise<TicketMetadata> {
  try {
    const sessionToken = resolveSessionToken(options.sessionToken);
    const response = await fetch(
      `${API_BASE_URL}/linear/issue/${encodeURIComponent(issueId)}/estimate`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          estimate,
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
          `Failed to update Linear estimate: ${response.status}`,
      );
    }

    const data = await response.json();
    const ticket = data.ticket as TicketMetadata;

    return ticket;
  } catch (error) {
    console.error("Error updating Linear estimate:", error);
    throw error;
  }
}

export function convertVoteValueToEstimate(
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
