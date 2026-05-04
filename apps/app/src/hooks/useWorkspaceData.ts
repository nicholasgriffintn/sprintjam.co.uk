import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  TeamAccessPolicy,
  TeamSession,
  WorkspaceProfile,
  WorkspaceStats,
  WorkspaceTeam,
} from "@sprintjam/types";

import { SELECTED_TEAM_STORAGE_KEY } from "@/constants";
import { useWorkspaceAuth } from "@/context/WorkspaceAuthContext";
import {
  createTeam,
  createTeamSession,
  deleteTeam,
  updateTeam,
} from "@/lib/workspace-service";
import { safeLocalStorage } from "@/utils/storage";

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
  profile?: WorkspaceProfile | null;
  stats?: WorkspaceStats | null;
  sessionsByTeamId?: Record<number, TeamSession[]>;
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

export const useWorkspaceData = (options: UseWorkspaceDataOptions = {}) => {
  const { profile = null, stats = null, sessionsByTeamId = {} } = options;
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

  const refreshWorkspace = useCallback(
    async (_forceRefresh = false) => {
      setIsRefreshing(true);
      try {
        await refreshAuth();
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
    [refreshAuth],
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
        await refreshWorkspace(true);
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
    [refreshWorkspace, selectedTeamIdState, teams],
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
        setSelectedTeamId(team.id);
        await refreshWorkspace(true);
        return team;
      } catch (mutationError) {
        setActionError(getErrorMessage(mutationError, "Unable to create team"));
        return null;
      } finally {
        setIsMutating(false);
      }
    },
    [isAuthenticated, refreshWorkspace, setSelectedTeamId],
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
        await refreshWorkspace(true);
        return updated;
      } catch (mutationError) {
        setActionError(getErrorMessage(mutationError, "Unable to update team"));
        return null;
      } finally {
        setIsMutating(false);
      }
    },
    [isAuthenticated, refreshWorkspace],
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
        await refreshWorkspace(true);

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
    [isAuthenticated, refreshWorkspace, selectedTeamIdState, setSelectedTeamId],
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
        await refreshWorkspace(true);
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
    [isAuthenticated, refreshWorkspace],
  );

  const handleLogout = useCallback(async () => {
    setIsMutating(true);
    try {
      await logoutAuth();
      setSelectedTeamId(null);
      setError(null);
      setActionError(null);
    } finally {
      setIsMutating(false);
    }
  }, [logoutAuth, setSelectedTeamId]);

  const sessions =
    selectedTeamIdState !== null && selectedTeam?.canAccess
      ? (sessionsByTeamId[selectedTeamIdState] ?? [])
      : [];

  return {
    profile,
    user,
    teams,
    stats,
    sessions,
    selectedTeamId: selectedTeamIdState,
    setSelectedTeamId,
    isAuthenticated,
    isLoading:
      isAuthLoading ||
      isRefreshing,
    isLoadingSessions: false,
    isMutating,
    error,
    actionError,
    refreshWorkspace,
    refreshSessions,
    createTeam: handleCreateTeam,
    updateTeam: handleUpdateTeam,
    deleteTeam: handleDeleteTeam,
    createSession: handleCreateSession,
    logout: handleLogout,
  };
};
