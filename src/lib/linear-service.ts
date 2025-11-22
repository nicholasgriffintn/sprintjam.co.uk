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

/**
 * Fetch Linear issue details by issue ID or identifier
 * @param {string} issueId - The Linear issue ID or identifier (e.g., "TEAM-123")
 * @param {object} options - Optional parameters
 * @param {string} options.roomKey - The room key to store the issue in
 * @param {string} options.userName - The user name making the request
 * @returns {Promise<TicketMetadata>} - The Linear issue details
 */
export async function fetchLinearIssue(
  issueId: string,
  options?: { roomKey?: string; userName?: string; sessionToken?: string },
): Promise<TicketMetadata> {
  try {
    const sessionToken = resolveSessionToken(options?.sessionToken);
    let url = `${API_BASE_URL}/linear/issue?issueId=${encodeURIComponent(
      issueId,
    )}`;

    if (options?.roomKey && options?.userName) {
      url += `&roomKey=${encodeURIComponent(
        options.roomKey,
      )}&userName=${encodeURIComponent(options.userName)}`;
      url += `&sessionToken=${encodeURIComponent(sessionToken)}`;
    }

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error || `Failed to fetch Linear issue: ${response.status}`,
      );
    }

    const data = await response.json();
    console.log("Linear issue API response:", data);

    const ticket: TicketMetadata | undefined = data.ticket;

    if (ticket) {
      return ticket;
    }
    throw new Error("Invalid response format from Linear API");
  } catch (error) {
    console.error("Error fetching Linear issue:", error);
    throw error;
  }
}

/**
 * Update estimate for a Linear issue
 * @param {string} issueId - The Linear issue ID or identifier
 * @param {number} estimate - The estimate value to set
 * @param {object} options - Optional parameters
 * @param {string} options.roomKey - The room key to update the issue in
 * @param {string} options.userName - The user name making the request
 * @returns {Promise<TicketMetadata>} - The updated Linear issue details
 */
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

/**
 * Convert a planning poker vote value to a Linear estimate number
 * @param {VoteValue} voteValue - The planning poker vote value
 * @returns {number | null} - The corresponding Linear estimate number
 */
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
