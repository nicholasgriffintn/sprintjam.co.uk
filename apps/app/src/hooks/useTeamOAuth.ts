import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { OAuthProvider, TeamIntegrationStatus } from "@sprintjam/types";

import {
  getTeamIntegrationStatus,
  initiateTeamOAuth,
  revokeTeamIntegration,
} from "@/lib/workspace-service";

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
  const queryKey = ["team-oauth", teamId, provider] as const;

  const statusQuery = useQuery<TeamIntegrationStatus>({
    queryKey,
    enabled: teamId !== null,
    staleTime: 30_000,
    queryFn: () => getTeamIntegrationStatus(teamId!, provider),
  });

  const connectMutation = useMutation({
    mutationKey: ["team-oauth-connect", teamId, provider],
    mutationFn: async () => {
      const authUrl = await initiateTeamOAuth(teamId!, provider);
      const authWindow = openAuthWindow(authUrl, provider);
      const pollTimer = setInterval(() => {
        if (authWindow?.closed) {
          clearInterval(pollTimer);
          setTimeout(() => void statusQuery.refetch(), 1000);
        }
      }, 500);
    },
  });

  const disconnectMutation = useMutation({
    mutationKey: ["team-oauth-disconnect", teamId, provider],
    mutationFn: () => revokeTeamIntegration(teamId!, provider),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey }),
  });

  const status: TeamIntegrationStatus = statusQuery.data ?? {
    provider,
    connected: false,
  };

  const loading =
    (teamId !== null && statusQuery.isLoading) ||
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
