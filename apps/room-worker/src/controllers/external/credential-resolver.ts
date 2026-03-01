import type { Request as CfRequest } from "@cloudflare/workers-types";
import type {
  GithubOAuthCredentials,
  JiraOAuthCredentials,
  LinearOAuthCredentials,
  RoomWorkerEnv,
} from "@sprintjam/types";
import { getRoomStub } from "@sprintjam/utils";
import {
  fetchTeamJiraCredentials,
  fetchTeamLinearCredentials,
  fetchTeamGithubCredentials,
  refreshTeamCredentials,
} from "../../lib/team-credentials";

async function getRoomTeamId(
  roomObject: ReturnType<typeof getRoomStub>,
): Promise<number | null> {
  const response = await roomObject.fetch(
    new Request("https://internal/room/team-id", {
      method: "GET",
    }) as unknown as CfRequest,
  );

  if (!response.ok) return null;

  const data = await response.json<{ teamId?: number | null }>();
  return data.teamId ?? null;
}

export type CredentialSource = "room" | "team";

export type ResolvedJiraCredentials = {
  credentials: JiraOAuthCredentials;
  source: CredentialSource;
  onTokenRefresh: (
    accessToken: string,
    refreshToken: string,
    expiresAt: number,
  ) => Promise<void>;
};

export type ResolvedLinearCredentials = {
  credentials: LinearOAuthCredentials;
  source: CredentialSource;
  onTokenRefresh: (
    accessToken: string,
    refreshToken: string | null,
    expiresAt: number,
  ) => Promise<void>;
};

export type ResolvedGithubCredentials = {
  credentials: GithubOAuthCredentials;
  source: CredentialSource;
};

export async function resolveJiraCredentials(
  env: RoomWorkerEnv,
  roomKey: string,
): Promise<ResolvedJiraCredentials | null> {
  const roomObject = getRoomStub(env, roomKey);

  const credentialsResponse = await roomObject.fetch(
    new Request("https://internal/jira/oauth/credentials", {
      method: "GET",
    }) as unknown as CfRequest,
  );

  if (credentialsResponse.ok) {
    const { credentials } = await credentialsResponse.json<{
      credentials: JiraOAuthCredentials;
    }>();

    return {
      credentials,
      source: "room",
      onTokenRefresh: async (accessToken, refreshToken, expiresAt) => {
        const response = await roomObject.fetch(
          new Request("https://internal/jira/oauth/refresh", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ accessToken, refreshToken, expiresAt }),
          }) as unknown as CfRequest,
        );
        if (!response.ok) {
          throw new Error("Failed to persist Jira token refresh.");
        }
      },
    };
  }

  if (!env.AUTH_WORKER) return null;

  const teamId = await getRoomTeamId(roomObject);
  if (!teamId) return null;

  const teamCredentials = await fetchTeamJiraCredentials(
    env.AUTH_WORKER,
    teamId,
    env.INTERNAL_API_SECRET,
  );
  if (!teamCredentials) return null;

  return {
    credentials: teamCredentials,
    source: "team",
    onTokenRefresh: async (accessToken, refreshToken, expiresAt) => {
      await refreshTeamCredentials(
        env.AUTH_WORKER,
        teamId,
        "jira",
        accessToken,
        refreshToken,
        expiresAt,
        env.INTERNAL_API_SECRET,
      );
    },
  };
}

export async function resolveLinearCredentials(
  env: RoomWorkerEnv,
  roomKey: string,
): Promise<ResolvedLinearCredentials | null> {
  const roomObject = getRoomStub(env, roomKey);

  const credentialsResponse = await roomObject.fetch(
    new Request("https://internal/linear/oauth/credentials", {
      method: "GET",
    }) as unknown as CfRequest,
  );

  if (credentialsResponse.ok) {
    const { credentials } = await credentialsResponse.json<{
      credentials: LinearOAuthCredentials;
    }>();

    return {
      credentials,
      source: "room",
      onTokenRefresh: async (accessToken, refreshToken, expiresAt) => {
        const response = await roomObject.fetch(
          new Request("https://internal/linear/oauth/refresh", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ accessToken, refreshToken, expiresAt }),
          }) as unknown as CfRequest,
        );
        if (!response.ok) {
          throw new Error("Failed to persist Linear token refresh.");
        }
      },
    };
  }

  if (!env.AUTH_WORKER) return null;

  const teamId = await getRoomTeamId(roomObject);
  if (!teamId) return null;

  const teamCredentials = await fetchTeamLinearCredentials(
    env.AUTH_WORKER,
    teamId,
    env.INTERNAL_API_SECRET,
  );
  if (!teamCredentials) return null;

  return {
    credentials: teamCredentials,
    source: "team",
    onTokenRefresh: async (accessToken, refreshToken, expiresAt) => {
      await refreshTeamCredentials(
        env.AUTH_WORKER,
        teamId,
        "linear",
        accessToken,
        refreshToken,
        expiresAt,
        env.INTERNAL_API_SECRET,
      );
    },
  };
}

export async function resolveGithubCredentials(
  env: RoomWorkerEnv,
  roomKey: string,
): Promise<ResolvedGithubCredentials | null> {
  const roomObject = getRoomStub(env, roomKey);

  const credentialsResponse = await roomObject.fetch(
    new Request("https://internal/github/oauth/credentials", {
      method: "GET",
    }) as unknown as CfRequest,
  );

  if (credentialsResponse.ok) {
    const { credentials } = await credentialsResponse.json<{
      credentials: GithubOAuthCredentials;
    }>();

    return { credentials, source: "room" };
  }

  if (!env.AUTH_WORKER) return null;

  const teamId = await getRoomTeamId(roomObject);
  if (!teamId) return null;

  const teamCredentials = await fetchTeamGithubCredentials(
    env.AUTH_WORKER,
    teamId,
    env.INTERNAL_API_SECRET,
  );
  if (!teamCredentials) return null;

  return { credentials: teamCredentials, source: "team" };
}
