import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  TeamAccessPolicy,
  TeamSession,
  WorkspaceAuthProfile,
  WorkspaceProfile,
  WorkspaceTeam,
} from "@sprintjam/types";

import { SELECTED_TEAM_STORAGE_KEY } from "@/constants";
import { useWorkspaceAuth } from "@/context/WorkspaceAuthContext";
import {
  WORKSPACE_PROFILE_DOCUMENT_KEY,
  workspaceProfileCollection,
} from "@/lib/data/collections";
import {
  createTeam,
  createTeamSession,
  deleteTeam,
  getWorkspaceProfile,
  getWorkspaceStats,
  listTeamSessions,
  updateTeam,
} from "@/lib/workspace-service";
import { isUnauthorizedWorkspaceError } from "@/lib/workspace-errors";
import { safeLocalStorage } from "@/utils/storage";

const WORKSPACE_DETAILS_QUERY_KEY = ["workspace-details"] as const;
const WORKSPACE_STATS_QUERY_KEY = ["workspace-stats"] as const;

interface CreateSessionPayload {
  teamId: number;
  name: string;
  roomKey: string;
}

interface CreateTeamPayload {
  name: string;
  accessPolicy?: TeamAccessPolicy;
}

interface UseWorkspaceDataOptions {
  includeProfile?: boolean;
  includeStats?: boolean;
  includeSessions?: boolean;
}

function teamSessionsQueryKey(teamId: number) {
  return ["team-sessions", teamId] as const;
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function getStoredSelectedTeamId(teams: WorkspaceTeam[]): number | null {
  const stored = safeLocalStorage.get(SELECTED_TEAM_STORAGE_KEY);
  if (!stored) {
    return null;
  }

  const parsed = Number.parseInt(stored, 10);
  if (Number.isNaN(parsed)) {
    return null;
  }

  return teams.some((team) => team.id === parsed) ? parsed : null;
}

function persistSelectedTeamId(teamId: number | null) {
  if (teamId === null) {
    safeLocalStorage.remove(SELECTED_TEAM_STORAGE_KEY);
    return;
  }

  safeLocalStorage.set(SELECTED_TEAM_STORAGE_KEY, String(teamId));
}

function updateAuthCollection(
  updater: (
    current: WorkspaceAuthProfile | null,
  ) => WorkspaceAuthProfile | null,
) {
  const currentProfile =
    workspaceProfileCollection.get(WORKSPACE_PROFILE_DOCUMENT_KEY) ?? null;
  const nextProfile = updater(currentProfile);

  if (!nextProfile) {
    return;
  }

  workspaceProfileCollection.utils.writeUpsert(nextProfile);
}

async function queryWorkspaceProfile(): Promise<WorkspaceProfile | null> {
  try {
    return await getWorkspaceProfile();
  } catch (error) {
    if (isUnauthorizedWorkspaceError(error)) {
      return null;
    }
    throw error;
  }
}

async function queryWorkspaceStats() {
  try {
    return await getWorkspaceStats();
  } catch (error) {
    if (isUnauthorizedWorkspaceError(error)) {
      return null;
    }
    throw error;
  }
}

async function queryTeamSessions(teamId: number) {
  try {
    return await listTeamSessions(teamId);
  } catch (error) {
    if (isUnauthorizedWorkspaceError(error)) {
      return [];
    }
    throw error;
  }
}

export const useWorkspaceData = (options: UseWorkspaceDataOptions = {}) => {
  const {
    includeProfile = false,
    includeStats = false,
    includeSessions = false,
  } = options;
  const queryClient = useQueryClient();
  const {
    user,
    teams,
    isLoading: isAuthLoading,
    isAuthenticated,
    refreshAuth,
    logout: logoutAuth,
  } = useWorkspaceAuth();

  const [selectedTeamIdState, setSelectedTeamIdState] = useState<number | null>(
    null,
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const setSelectedTeamId = useCallback((teamId: number | null) => {
    setSelectedTeamIdState(teamId);
    persistSelectedTeamId(teamId);
  }, []);

  useEffect(() => {
    if (teams.length === 0) {
      if (selectedTeamIdState !== null) {
        setSelectedTeamId(null);
      }
      return;
    }

    if (
      selectedTeamIdState &&
      teams.some((team) => team.id === selectedTeamIdState)
    ) {
      return;
    }

    const storedTeamId = getStoredSelectedTeamId(teams);
    const firstAccessibleTeam =
      teams.find((team) => team.canAccess) ?? teams[0] ?? null;
    const nextTeamId = storedTeamId ?? firstAccessibleTeam?.id ?? null;

    if (nextTeamId !== selectedTeamIdState) {
      setSelectedTeamId(nextTeamId);
    }
  }, [selectedTeamIdState, setSelectedTeamId, teams]);

  const selectedTeam = useMemo(
    () => teams.find((team) => team.id === selectedTeamIdState) ?? null,
    [selectedTeamIdState, teams],
  );

  const profileQuery = useQuery({
    queryKey: WORKSPACE_DETAILS_QUERY_KEY,
    enabled: includeProfile && isAuthenticated,
    queryFn: queryWorkspaceProfile,
    staleTime: 1000 * 60 * 5,
  });

  const statsQuery = useQuery({
    queryKey: WORKSPACE_STATS_QUERY_KEY,
    enabled: includeStats && isAuthenticated,
    queryFn: queryWorkspaceStats,
    staleTime: 1000 * 60 * 2,
  });

  const sessionsQuery = useQuery({
    queryKey:
      selectedTeamIdState === null
        ? ["team-sessions", "none"]
        : teamSessionsQueryKey(selectedTeamIdState),
    enabled:
      includeSessions &&
      isAuthenticated &&
      selectedTeamIdState !== null &&
      Boolean(selectedTeam?.canAccess),
    queryFn: () => queryTeamSessions(selectedTeamIdState!),
    staleTime: 1000 * 60,
  });

  const refreshWorkspace = useCallback(
    async (forceRefresh = false) => {
      setIsRefreshing(true);
      try {
        await refreshAuth();

        if (includeProfile && isAuthenticated) {
          if (forceRefresh) {
            await profileQuery.refetch();
          } else {
            await queryClient.invalidateQueries({
              queryKey: WORKSPACE_DETAILS_QUERY_KEY,
            });
          }
        }

        if (includeStats && isAuthenticated) {
          if (forceRefresh) {
            await statsQuery.refetch();
          } else {
            await queryClient.invalidateQueries({
              queryKey: WORKSPACE_STATS_QUERY_KEY,
            });
          }
        }

        if (
          includeSessions &&
          selectedTeamIdState !== null &&
          selectedTeam?.canAccess
        ) {
          if (forceRefresh) {
            await sessionsQuery.refetch();
          } else {
            await queryClient.invalidateQueries({
              queryKey: teamSessionsQueryKey(selectedTeamIdState),
            });
          }
        }

        setError(null);
      } catch (refreshError) {
        setError(
          getErrorMessage(
            refreshError,
            "Unable to load workspace data right now",
          ),
        );
      } finally {
        setIsRefreshing(false);
      }
    },
    [
      includeProfile,
      includeSessions,
      includeStats,
      isAuthenticated,
      profileQuery,
      queryClient,
      refreshAuth,
      selectedTeam?.canAccess,
      selectedTeamIdState,
      sessionsQuery,
      statsQuery,
    ],
  );

  const refreshSessions = useCallback(
    async (teamId: number | null = selectedTeamIdState) => {
      if (!teamId) {
        return;
      }

      const team = teams.find((candidate) => candidate.id === teamId);
      if (!team?.canAccess) {
        setActionError(null);
        return;
      }

      try {
        if (includeSessions && teamId === selectedTeamIdState) {
          await sessionsQuery.refetch();
        } else {
          await queryClient.invalidateQueries({
            queryKey: teamSessionsQueryKey(teamId),
          });
        }
        setActionError(null);
      } catch (refreshError) {
        setActionError(
          getErrorMessage(
            refreshError,
            "Unable to load sessions for this team",
          ),
        );
      }
    },
    [includeSessions, queryClient, selectedTeamIdState, sessionsQuery, teams],
  );

  const handleCreateTeam = useCallback(
    async ({
      name,
      accessPolicy = "open",
    }: CreateTeamPayload): Promise<WorkspaceTeam | null> => {
      if (!isAuthenticated) {
        setActionError("Load workspace before creating teams");
        return null;
      }

      setIsMutating(true);
      setActionError(null);
      try {
        const team = await createTeam(name, accessPolicy);

        updateAuthCollection((currentProfile) => {
          if (!currentProfile) {
            return null;
          }

          return {
            ...currentProfile,
            teams: [...currentProfile.teams, team],
          };
        });

        setSelectedTeamId(team.id);
        await queryClient.invalidateQueries({
          queryKey: WORKSPACE_STATS_QUERY_KEY,
        });
        return team;
      } catch (mutationError) {
        setActionError(getErrorMessage(mutationError, "Unable to create team"));
        return null;
      } finally {
        setIsMutating(false);
      }
    },
    [isAuthenticated, queryClient, setSelectedTeamId],
  );

  const handleUpdateTeam = useCallback(
    async (
      teamId: number,
      payload: { name?: string; accessPolicy?: TeamAccessPolicy },
    ): Promise<WorkspaceTeam | null> => {
      if (!isAuthenticated) {
        setActionError("Load workspace before updating teams");
        return null;
      }

      setIsMutating(true);
      setActionError(null);
      try {
        const updated = await updateTeam(teamId, payload);

        updateAuthCollection((currentProfile) => {
          if (!currentProfile) {
            return null;
          }

          return {
            ...currentProfile,
            teams: currentProfile.teams.map((team) =>
              team.id === teamId ? updated : team,
            ),
          };
        });

        return updated;
      } catch (mutationError) {
        setActionError(getErrorMessage(mutationError, "Unable to update team"));
        return null;
      } finally {
        setIsMutating(false);
      }
    },
    [isAuthenticated],
  );

  const handleDeleteTeam = useCallback(
    async (teamId: number): Promise<boolean> => {
      if (!isAuthenticated) {
        setActionError("Load workspace before deleting teams");
        return false;
      }

      setIsMutating(true);
      setActionError(null);
      try {
        await deleteTeam(teamId);

        updateAuthCollection((currentProfile) => {
          if (!currentProfile) {
            return null;
          }

          return {
            ...currentProfile,
            teams: currentProfile.teams.filter((team) => team.id !== teamId),
          };
        });

        await queryClient.removeQueries({
          queryKey: teamSessionsQueryKey(teamId),
        });
        await queryClient.invalidateQueries({
          queryKey: WORKSPACE_STATS_QUERY_KEY,
        });

        if (selectedTeamIdState === teamId) {
          setSelectedTeamId(null);
        }

        return true;
      } catch (mutationError) {
        setActionError(getErrorMessage(mutationError, "Unable to delete team"));
        return false;
      } finally {
        setIsMutating(false);
      }
    },
    [isAuthenticated, queryClient, selectedTeamIdState, setSelectedTeamId],
  );

  const handleCreateSession = useCallback(
    async ({
      teamId,
      name,
      roomKey,
    }: CreateSessionPayload): Promise<TeamSession | null> => {
      if (!isAuthenticated) {
        setActionError(
          "You need to load the workspace before creating sessions",
        );
        return null;
      }

      setIsMutating(true);
      setActionError(null);
      try {
        const session = await createTeamSession(teamId, name, roomKey);

        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: teamSessionsQueryKey(teamId),
          }),
          queryClient.invalidateQueries({
            queryKey: WORKSPACE_STATS_QUERY_KEY,
          }),
        ]);

        return session;
      } catch (mutationError) {
        setActionError(
          getErrorMessage(mutationError, "Unable to create session"),
        );
        return null;
      } finally {
        setIsMutating(false);
      }
    },
    [isAuthenticated, queryClient],
  );

  const handleLogout = useCallback(async () => {
    setIsMutating(true);
    try {
      await logoutAuth();
      await Promise.all([
        queryClient.removeQueries({ queryKey: WORKSPACE_DETAILS_QUERY_KEY }),
        queryClient.removeQueries({ queryKey: WORKSPACE_STATS_QUERY_KEY }),
        queryClient.removeQueries({ queryKey: ["team-sessions"] }),
      ]);
      setSelectedTeamId(null);
      setError(null);
      setActionError(null);
    } finally {
      setIsMutating(false);
    }
  }, [logoutAuth, queryClient, setSelectedTeamId]);

  const queryError = useMemo(() => {
    if (profileQuery.error) {
      return getErrorMessage(profileQuery.error, "Unable to load workspace");
    }

    if (statsQuery.error) {
      return getErrorMessage(
        statsQuery.error,
        "Unable to load workspace stats",
      );
    }

    return null;
  }, [profileQuery.error, statsQuery.error]);

  const queryActionError = useMemo(() => {
    if (actionError) {
      return actionError;
    }

    if (sessionsQuery.error) {
      return getErrorMessage(
        sessionsQuery.error,
        "Unable to load sessions for this team",
      );
    }

    return null;
  }, [actionError, sessionsQuery.error]);

  return {
    profile: profileQuery.data ?? null,
    user,
    teams,
    stats: statsQuery.data ?? null,
    sessions:
      includeSessions && selectedTeam?.canAccess
        ? (sessionsQuery.data ?? [])
        : [],
    selectedTeamId: selectedTeamIdState,
    setSelectedTeamId,
    isAuthenticated,
    isLoading:
      isAuthLoading ||
      isRefreshing ||
      Boolean(includeProfile && profileQuery.isLoading) ||
      Boolean(includeStats && statsQuery.isLoading),
    isLoadingSessions:
      includeSessions && selectedTeam?.canAccess
        ? sessionsQuery.isLoading || sessionsQuery.isFetching
        : false,
    isMutating,
    error: error ?? queryError,
    actionError: queryActionError,
    refreshWorkspace,
    refreshSessions,
    createTeam: handleCreateTeam,
    updateTeam: handleUpdateTeam,
    deleteTeam: handleDeleteTeam,
    createSession: handleCreateSession,
    logout: handleLogout,
  };
};
