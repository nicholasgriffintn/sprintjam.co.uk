import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { OAuthProvider, TeamIntegrationStatus } from "@sprintjam/types";

import {
  getTeamIntegrationStatus,
  initiateTeamOAuth,
  revokeTeamIntegration,
} from "@/lib/workspace-service";
import { useWorkspaceData } from "@/hooks/useWorkspaceData";

const openAuthWindow = (url: string, label: string) => {
  const width = 600;
  const height = 700;
  const left = window.screen.width / 2 - width / 2;
  const top = window.screen.height / 2 - height / 2;
  return window.open(
    url,
    `${label} OAuth`,
    `width=${width},height=${height},left=${left},top=${top}`,
  );
};

export interface TeamOAuthResult {
  status: TeamIntegrationStatus;
  loading: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

export function useTeamOAuth(
  teamId: number | null,
  provider: OAuthProvider,
): TeamOAuthResult {
  const queryClient = useQueryClient();
  const { teams } = useWorkspaceData();
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const queryKey = ["team-oauth", teamId, provider] as const;
  const teamSlug = teams.find((team) => team.id === teamId)?.slug ?? null;

  const statusQuery = useQuery<TeamIntegrationStatus>({
    queryKey,
    enabled: teamSlug !== null,
    queryFn: () => getTeamIntegrationStatus(teamSlug!, provider),
    staleTime: 0,
  });

  const connectMutation = useMutation({
    mutationKey: ["team-oauth-connect", teamId, provider],
    mutationFn: async () => {
      if (teamSlug === null) return;
      const authUrl = await initiateTeamOAuth(teamSlug, provider);
      const authWindow = openAuthWindow(authUrl, provider);
      if (!authWindow) {
        throw new Error("Popup blocked. Please allow popups and try again.");
      }

      const MAX_POLL_MS = 5 * 60 * 1000;
      const start = Date.now();
      pollTimerRef.current = setInterval(() => {
        if (authWindow.closed || Date.now() - start > MAX_POLL_MS) {
          clearInterval(pollTimerRef.current!);
          pollTimerRef.current = null;
          setTimeout(() => void statusQuery.refetch(), 1000);
        }
      }, 500);
    },
  });

  const disconnectMutation = useMutation({
    mutationKey: ["team-oauth-disconnect", teamId, provider],
    mutationFn: () => {
      if (teamSlug === null) {
        return Promise.reject(new Error("No team selected"));
      }
      return revokeTeamIntegration(teamSlug, provider);
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey }),
  });

  useEffect(() => {
    return () => {
      if (pollTimerRef.current !== null) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, []);

  const status: TeamIntegrationStatus = statusQuery.data ?? {
    provider,
    connected: false,
  };
  const loading =
    (teamSlug !== null && statusQuery.isLoading) ||
    connectMutation.isPending ||
    disconnectMutation.isPending;
  const error =
    (statusQuery.error instanceof Error ? statusQuery.error.message : null) ||
    (connectMutation.error instanceof Error
      ? connectMutation.error.message
      : null) ||
    (disconnectMutation.error instanceof Error
      ? disconnectMutation.error.message
      : null) ||
    null;

  return {
    status,
    loading,
    error,
    connect: () => connectMutation.mutateAsync(),
    disconnect: () => disconnectMutation.mutateAsync(),
  };
}
