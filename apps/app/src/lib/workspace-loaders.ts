import { createWorkerRequest, type WorkerLoaderArgs } from "@/lib/worker-utils";
import type { RoomSettings } from "@/types";
import type {
  TeamInsights,
  TeamMember,
  TeamSession,
  TeamSessionsPage,
  WorkspaceTeamSessionFilter,
  WorkspaceAuthProfile,
  WorkspaceInsights,
  WorkspaceProfile,
  WorkspaceStats,
} from "@sprintjam/types";

export const WORKSPACE_SESSIONS_PAGE_SIZE = 20;

async function loadFromWorker<T>(
  args: WorkerLoaderArgs,
  worker: Fetcher | undefined,
  path: string,
): Promise<T | null> {
  if (!worker) {
    return null;
  }

  const response = await worker.fetch(createWorkerRequest(args.request, path));

  if (response.status === 401 || response.status === 403) {
    return null;
  }

  if (response.status !== 200) {
    const errorText = await response.text();
    throw new Response(errorText || "Unable to load workspace data", {
      status: response.status,
      statusText: response.statusText,
    });
  }

  return (await response.json()) as T;
}

async function loadFromAuthWorker<T>(
  args: WorkerLoaderArgs,
  path: string,
): Promise<T | null> {
  return loadFromWorker<T>(
    args,
    args.context.cloudflare?.env.AUTH_WORKER,
    path,
  );
}

async function loadFromStatsWorker<T>(
  args: WorkerLoaderArgs,
  path: string,
): Promise<T | null> {
  return loadFromWorker<T>(
    args,
    args.context.cloudflare?.env.STATS_WORKER,
    path,
  );
}

export async function loadWorkspaceAuthProfile(
  args: WorkerLoaderArgs,
): Promise<WorkspaceAuthProfile | null> {
  return loadFromAuthWorker<WorkspaceAuthProfile>(args, "/api/auth/me");
}

export async function loadWorkspaceProfile(
  args: WorkerLoaderArgs,
): Promise<WorkspaceProfile | null> {
  return loadFromAuthWorker<WorkspaceProfile>(args, "/api/workspace/profile");
}

export async function loadWorkspaceStats(
  args: WorkerLoaderArgs,
): Promise<WorkspaceStats | null> {
  return loadFromAuthWorker<WorkspaceStats>(args, "/api/workspace/stats");
}

export async function loadWorkspaceInsights(
  args: WorkerLoaderArgs,
): Promise<WorkspaceInsights | null> {
  return loadFromStatsWorker<WorkspaceInsights>(
    args,
    "/api/stats/workspace/insights?sessionsLimit=20&contributorsLimit=10",
  );
}

export async function loadTeamSessions(
  args: WorkerLoaderArgs,
  teamId: number,
): Promise<TeamSession[]> {
  const data = await loadTeamSessionsPage(args, teamId);
  return data?.sessions ?? [];
}

export async function loadTeamSessionsPage(
  args: WorkerLoaderArgs,
  teamId: number,
  options: {
    limit?: number;
    offset?: number;
    type?: WorkspaceTeamSessionFilter;
  } = {},
): Promise<TeamSessionsPage | null> {
  const params = new URLSearchParams({
    limit: String(options.limit ?? WORKSPACE_SESSIONS_PAGE_SIZE),
    offset: String(options.offset ?? 0),
    type: options.type ?? "all",
  });
  const data = await loadFromAuthWorker<TeamSessionsPage>(
    args,
    `/api/teams/${teamId}/sessions?${params.toString()}`,
  );
  return data;
}

export async function loadAccessibleTeamSessions(
  args: WorkerLoaderArgs,
  teams: WorkspaceAuthProfile["teams"],
): Promise<Record<number, TeamSessionsPage>> {
  const entries = await Promise.all(
    teams
      .filter((team) => team.canAccess)
      .map(async (team) => [
        team.id,
        await loadTeamSessionsPage(args, team.id),
      ]),
  );

  return Object.fromEntries(
    entries.filter((entry): entry is [number, TeamSessionsPage] =>
      Boolean(entry[1]),
    ),
  );
}

export async function loadTeamInsights(
  args: WorkerLoaderArgs,
  teamId: number,
): Promise<TeamInsights | null> {
  return loadFromStatsWorker<TeamInsights>(
    args,
    `/api/stats/team/${teamId}/insights?limit=6`,
  );
}

export async function loadAccessibleTeamInsights(
  args: WorkerLoaderArgs,
  teams: WorkspaceAuthProfile["teams"],
): Promise<Record<number, TeamInsights | null>> {
  const entries = await Promise.all(
    teams
      .filter((team) => team.canAccess)
      .map(async (team) => [team.id, await loadTeamInsights(args, team.id)]),
  );

  return Object.fromEntries(entries);
}

export async function loadTeamMembers(
  args: WorkerLoaderArgs,
  teamId: number,
): Promise<TeamMember[]> {
  const data = await loadFromAuthWorker<{ members: TeamMember[] }>(
    args,
    `/api/teams/${teamId}/members`,
  );
  return data?.members ?? [];
}

export async function loadTeamSettings(
  args: WorkerLoaderArgs,
  teamId: number,
): Promise<RoomSettings | null> {
  return loadFromAuthWorker<RoomSettings>(
    args,
    `/api/teams/${teamId}/settings`,
  );
}
