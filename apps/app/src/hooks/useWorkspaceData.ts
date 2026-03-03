import { useCallback, useEffect, useRef, useState } from "react";
import type {
  TeamAccessPolicy,
  TeamSession,
  WorkspaceProfile,
  WorkspaceTeam,
} from "@sprintjam/types";

import {
  WORKSPACE_PROFILE_DOCUMENT_KEY,
  WORKSPACE_STATS_DOCUMENT_KEY,
  ensureTeamSessionsCollectionReady,
  ensureWorkspaceProfileCollectionReady,
  ensureWorkspaceStatsCollectionReady,
  teamSessionsCollection,
  workspaceProfileCollection,
  workspaceStatsCollection,
} from "@/lib/data/collections";
import {
  useTeamSessions,
  useWorkspaceProfile,
  useWorkspaceStats,
} from "@/lib/data/hooks";
import {
  createTeam,
  createTeamSession,
  deleteTeam,
  updateTeam,
  listTeamSessions,
  logout as workspaceLogout,
} from "@/lib/workspace-service";

interface CreateSessionPayload {
  teamId: number;
  name: string;
  roomKey: string;
}

interface CreateTeamPayload {
  name: string;
  accessPolicy?: TeamAccessPolicy;
}

const ensureCollectionsReady = async () => {
  await Promise.all([
    ensureWorkspaceProfileCollectionReady(),
    ensureWorkspaceStatsCollectionReady(),
    ensureTeamSessionsCollectionReady(),
  ]);
};

const updateProfileCollection = (
  updater: (current: WorkspaceProfile | null) => WorkspaceProfile | null,
) => {
  const currentProfile =
    workspaceProfileCollection.get(WORKSPACE_PROFILE_DOCUMENT_KEY) ?? null;
  const nextProfile = updater(currentProfile);

  if (!nextProfile) {
    return;
  }

  workspaceProfileCollection.utils.writeUpsert(nextProfile);
};

const removeSessionsForTeam = (teamId: number) => {
  const keysToRemove: string[] = [];
  for (const session of teamSessionsCollection.values()) {
    if (session.teamId === teamId) {
      keysToRemove.push(teamSessionsCollection.getKeyFromItem(session));
    }
  }

  keysToRemove.forEach((key) => teamSessionsCollection.utils.writeDelete(key));
};

export const useWorkspaceData = () => {
  const profile = useWorkspaceProfile();
  const stats = useWorkspaceStats();
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const sessions = useTeamSessions(selectedTeamId);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const isLoadingSessionsRef = useRef(false);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [hasAttemptedBootstrap, setHasAttemptedBootstrap] = useState(false);
  const lastSessionsTeamRef = useRef<number | null>(null);
  const lastTeamIdsRef = useRef<string | null>(null);

  const isAuthenticated = Boolean(profile?.user);

  useEffect(() => {
    if (!profile) {
      return;
    }

    const teamIds = profile.teams.map((team) => team.id).join(",");
    if (teamIds === lastTeamIdsRef.current) {
      return;
    }
    lastTeamIdsRef.current = teamIds;

    const hasSelection = Boolean(selectedTeamId);
    const teamsAvailable = profile.teams.length > 0;
    const firstAccessibleTeam =
      profile.teams.find((team) => team.canAccess) ?? profile.teams[0] ?? null;

    if (!hasSelection && teamsAvailable) {
      const nextId = firstAccessibleTeam?.id ?? null;
      if (nextId !== selectedTeamId) {
        setSelectedTeamId(nextId);
      }
      return;
    }

    if (
      selectedTeamId &&
      !profile.teams.some((team) => team.id === selectedTeamId)
    ) {
      const nextId = firstAccessibleTeam?.id ?? null;
      if (nextId !== selectedTeamId) {
        setSelectedTeamId(nextId);
      }
    }
  }, [profile, selectedTeamId]);

  const refreshWorkspace = useCallback(async (forceRefresh = false) => {
    setIsLoading(true);
    try {
      await ensureWorkspaceProfileCollectionReady();

      if (forceRefresh) {
        await workspaceProfileCollection.utils.refetch({ throwOnError: true });
      }

      const currentProfile = workspaceProfileCollection.get(
        WORKSPACE_PROFILE_DOCUMENT_KEY,
      );
      const hasStats =
        workspaceStatsCollection.get(WORKSPACE_STATS_DOCUMENT_KEY) !==
        undefined;

      if (currentProfile?.user) {
        const shouldRefetchStats = forceRefresh || !hasStats;

        if (shouldRefetchStats) {
          await workspaceStatsCollection.utils.refetch({ throwOnError: true });
        } else {
          await ensureWorkspaceStatsCollectionReady();
        }
      }

      setError(null);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Unable to load workspace data right now";

      if (message === "Unauthorized") {
        setError(null);
      } else {
        setError(message);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (hasAttemptedBootstrap) {
      return;
    }

    setHasAttemptedBootstrap(true);
    void refreshWorkspace();
  }, [hasAttemptedBootstrap, refreshWorkspace]);

  useEffect(() => {
    if (profile && isLoading) {
      setIsLoading(false);
    }
  }, [isLoading, profile]);

  const refreshSessions = useCallback(async (teamId: number | null) => {
    if (!teamId) {
      return;
    }

    const team = profile?.teams.find((currentTeam) => currentTeam.id === teamId);
    if (team && !team.canAccess) {
      setActionError(null);
      return;
    }

    if (
      !isLoadingSessionsRef.current &&
      lastSessionsTeamRef.current === teamId
    ) {
      return;
    }

    lastSessionsTeamRef.current = teamId;
    isLoadingSessionsRef.current = true;
    setIsLoadingSessions(true);
    try {
      await ensureTeamSessionsCollectionReady();
      const sessionsFromApi = await listTeamSessions(teamId);

      removeSessionsForTeam(teamId);
      sessionsFromApi.forEach((session) =>
        teamSessionsCollection.utils.writeUpsert(session),
      );
      setActionError(null);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Unable to load sessions for this team";
      setActionError(message);
    } finally {
      setIsLoadingSessions(false);
      isLoadingSessionsRef.current = false;
    }
  }, [profile?.teams]);

  useEffect(() => {
    if (selectedTeamId) {
      void refreshSessions(selectedTeamId);
    } else if (lastSessionsTeamRef.current !== null) {
      setActionError(null);
      lastSessionsTeamRef.current = null;
    }
  }, [refreshSessions, selectedTeamId]);

  const handleCreateTeam = useCallback(
    async ({
      name,
      accessPolicy = "open",
    }: CreateTeamPayload): Promise<WorkspaceTeam | null> => {
      if (!profile) {
        setActionError("Load workspace before creating teams");
        return null;
      }

      setIsMutating(true);
      setActionError(null);
      try {
        await ensureWorkspaceProfileCollectionReady();
        const team = await createTeam(name, accessPolicy);

        updateProfileCollection((currentProfile) => {
          if (!currentProfile) return null;
          return {
            ...currentProfile,
            teams: [...currentProfile.teams, team],
          };
        });

        setSelectedTeamId(team.id);
        void workspaceStatsCollection.utils
          .refetch({ throwOnError: false })
          .catch(() => undefined);
        return team;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unable to create team";
        setActionError(message);
        return null;
      } finally {
        setIsMutating(false);
      }
    },
    [profile],
  );

  const handleUpdateTeam = useCallback(
    async (
      teamId: number,
      payload: { name?: string; accessPolicy?: TeamAccessPolicy },
    ): Promise<WorkspaceTeam | null> => {
      if (!profile) {
        setActionError("Load workspace before updating teams");
        return null;
      }

      setIsMutating(true);
      setActionError(null);
      try {
        await ensureWorkspaceProfileCollectionReady();
        const updated = await updateTeam(teamId, payload);

        updateProfileCollection((currentProfile) => {
          if (!currentProfile) return null;
          return {
            ...currentProfile,
            teams: currentProfile.teams.map((team) =>
              team.id === teamId ? updated : team,
            ),
          };
        });

        return updated;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unable to update team";
        setActionError(message);
        return null;
      } finally {
        setIsMutating(false);
      }
    },
    [profile],
  );

  const handleDeleteTeam = useCallback(
    async (teamId: number): Promise<boolean> => {
      if (!profile) {
        setActionError("Load workspace before deleting teams");
        return false;
      }

      setIsMutating(true);
      setActionError(null);
      try {
        await deleteTeam(teamId);
        await ensureCollectionsReady();

        updateProfileCollection((currentProfile) => {
          if (!currentProfile) return null;
          const remainingTeams = currentProfile.teams.filter(
            (team) => team.id !== teamId,
          );
          return {
            ...currentProfile,
            teams: remainingTeams,
          };
        });

        removeSessionsForTeam(teamId);

        void workspaceStatsCollection.utils
          .refetch({ throwOnError: false })
          .catch(() => undefined);

        if (selectedTeamId === teamId) {
          const nextTeams =
            workspaceProfileCollection.get(WORKSPACE_PROFILE_DOCUMENT_KEY)
              ?.teams ?? [];
          setSelectedTeamId(nextTeams[0]?.id ?? null);
        }

        return true;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unable to delete team";
        setActionError(message);
        return false;
      } finally {
        setIsMutating(false);
      }
    },
    [profile, selectedTeamId],
  );

  const handleCreateSession = useCallback(
    async ({
      teamId,
      name,
      roomKey,
    }: CreateSessionPayload): Promise<TeamSession | null> => {
      if (!profile) {
        setActionError(
          "You need to load the workspace before creating sessions",
        );
        return null;
      }

      setIsMutating(true);
      setActionError(null);
      try {
        await ensureTeamSessionsCollectionReady();
        const session = await createTeamSession(teamId, name, roomKey);
        teamSessionsCollection.utils.writeUpsert(session);
        void workspaceStatsCollection.utils
          .refetch({ throwOnError: false })
          .catch(() => undefined);
        return session;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unable to create session";
        setActionError(message);
        return null;
      } finally {
        setIsMutating(false);
      }
    },
    [profile],
  );

  const handleLogout = useCallback(async () => {
    setIsMutating(true);
    try {
      await workspaceLogout();
    } finally {
      await ensureCollectionsReady();
      workspaceProfileCollection.utils.writeDelete(
        WORKSPACE_PROFILE_DOCUMENT_KEY,
      );
      workspaceStatsCollection.utils.writeDelete(WORKSPACE_STATS_DOCUMENT_KEY);
      for (const key of teamSessionsCollection.keys()) {
        teamSessionsCollection.utils.writeDelete(key);
      }
      setSelectedTeamId(null);
      setHasAttemptedBootstrap(false);
      setIsMutating(false);
    }
  }, []);

  return {
    profile,
    user: profile?.user ?? null,
    teams: profile?.teams ?? [],
    stats,
    sessions,
    selectedTeamId,
    setSelectedTeamId,
    isAuthenticated,
    isLoading,
    isLoadingSessions,
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
