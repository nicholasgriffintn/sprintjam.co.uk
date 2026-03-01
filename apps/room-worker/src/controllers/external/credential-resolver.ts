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

export type CredentialSource = "team";

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
