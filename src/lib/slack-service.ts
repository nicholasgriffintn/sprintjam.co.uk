import type { RoomData } from "@/types";
import { API_BASE_URL } from "@/constants";
import { safeLocalStorage } from "@/utils/storage";
import { AUTH_TOKEN_STORAGE_KEY } from "@/constants";

function resolveSessionToken(provided?: string | null): string {
  if (provided) return provided;
  const stored = safeLocalStorage.get(AUTH_TOKEN_STORAGE_KEY);
  if (!stored) {
    throw new Error("Missing session token. Please rejoin the room.");
  }
  return stored;
}

export interface SlackOAuthStatus {
  connected: boolean;
  slackTeamId?: string;
  slackTeamName?: string;
  slackUserName?: string;
  slackChannelId?: string;
  slackChannelName?: string;
  expiresAt?: number;
}

export async function getSlackOAuthStatus(
  roomKey: string,
  userName: string,
  sessionToken?: string | null,
): Promise<SlackOAuthStatus> {
  const token = resolveSessionToken(sessionToken);
  const response = await fetch(
    `${API_BASE_URL}/slack/oauth/status?roomKey=${encodeURIComponent(
      roomKey,
    )}&userName=${encodeURIComponent(userName)}&sessionToken=${encodeURIComponent(
      token,
    )}`,
  );

  if (!response.ok) {
    throw new Error("Failed to fetch OAuth status");
  }

  return (await response.json()) as SlackOAuthStatus;
}

export async function authorizeSlackOAuth(
  roomKey: string,
  userName: string,
  sessionToken?: string | null,
): Promise<{ authorizationUrl: string }> {
  const token = resolveSessionToken(sessionToken);
  const response = await fetch(`${API_BASE_URL}/slack/oauth/authorize`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      roomKey,
      userName,
      sessionToken: token,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to initiate OAuth");
  }

  return (await response.json()) as { authorizationUrl: string };
}

export async function revokeSlackOAuth(
  roomKey: string,
  userName: string,
  sessionToken?: string | null,
): Promise<void> {
  const token = resolveSessionToken(sessionToken);
  const response = await fetch(`${API_BASE_URL}/slack/oauth/revoke`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      roomKey,
      userName,
      sessionToken: token,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to disconnect Slack");
  }
}

export async function postSessionResults(
  roomKey: string,
  userName: string,
  roomData: RoomData,
  sessionToken?: string | null,
): Promise<{ success: boolean; messageTs: string; channel: string }> {
  const token = resolveSessionToken(sessionToken);
  const response = await fetch(`${API_BASE_URL}/slack/post/results`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      roomKey,
      userName,
      sessionToken: token,
      roomData,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to post results to Slack");
  }

  return (await response.json()) as {
    success: boolean;
    messageTs: string;
    channel: string;
  };
}

export async function postSessionStart(
  roomKey: string,
  userName: string,
  roomData: RoomData,
  sessionToken?: string | null,
): Promise<{ success: boolean; messageTs: string; channel: string }> {
  const token = resolveSessionToken(sessionToken);
  const response = await fetch(`${API_BASE_URL}/slack/post/start`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      roomKey,
      userName,
      sessionToken: token,
      roomData,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to post session start to Slack");
  }

  return (await response.json()) as {
    success: boolean;
    messageTs: string;
    channel: string;
  };
}

export async function postCustomMessage(
  roomKey: string,
  userName: string,
  text: string,
  sessionToken?: string | null,
): Promise<{ success: boolean; messageTs: string; channel: string }> {
  const token = resolveSessionToken(sessionToken);
  const response = await fetch(`${API_BASE_URL}/slack/post/message`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      roomKey,
      userName,
      sessionToken: token,
      text,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to post message to Slack");
  }

  return (await response.json()) as {
    success: boolean;
    messageTs: string;
    channel: string;
  };
}
