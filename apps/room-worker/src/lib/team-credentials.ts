import type { Fetcher } from "@cloudflare/workers-types";
import type {
  GithubOAuthCredentials,
  JiraOAuthCredentials,
  LinearOAuthCredentials,
  OAuthProvider,
} from "@sprintjam/types";

async function callAuthWorker<T>(
  authWorker: Fetcher,
  path: string,
  body: unknown,
): Promise<T | null> {
  const response = await authWorker.fetch(
    new Request(`https://auth-worker/api/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );

  if (response.status === 404) return null;

  if (!response.ok) {
    throw new Error(
      `Auth worker request to ${path} failed: ${response.status}`,
    );
  }

  return response.json<T>();
}

export async function fetchTeamJiraCredentials(
  authWorker: Fetcher,
  teamId: number,
): Promise<JiraOAuthCredentials | null> {
  const result = await callAuthWorker<{ credentials: JiraOAuthCredentials }>(
    authWorker,
    "internal/team-credentials",
    { teamId, provider: "jira" },
  );
  return result?.credentials ?? null;
}

export async function fetchTeamLinearCredentials(
  authWorker: Fetcher,
  teamId: number,
): Promise<LinearOAuthCredentials | null> {
  const result = await callAuthWorker<{ credentials: LinearOAuthCredentials }>(
    authWorker,
    "internal/team-credentials",
    { teamId, provider: "linear" },
  );
  return result?.credentials ?? null;
}

export async function fetchTeamGithubCredentials(
  authWorker: Fetcher,
  teamId: number,
): Promise<GithubOAuthCredentials | null> {
  const result = await callAuthWorker<{ credentials: GithubOAuthCredentials }>(
    authWorker,
    "internal/team-credentials",
    { teamId, provider: "github" },
  );
  return result?.credentials ?? null;
}

export async function refreshTeamCredentials(
  authWorker: Fetcher,
  teamId: number,
  provider: OAuthProvider,
  accessToken: string,
  refreshToken: string | null,
  expiresAt: number,
): Promise<void> {
  await callAuthWorker(authWorker, "internal/team-credentials/refresh", {
    teamId,
    provider,
    accessToken,
    refreshToken,
    expiresAt,
  });
}
