import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useRoom } from '@/context/RoomContext';
import { useSession } from '@/context/SessionContext';
import {
  authorizeGithubOAuth,
  getGithubOAuthStatus,
  revokeGithubOAuth,
  type GithubOAuthStatus,
} from '@/lib/github-service';

export function useGithubOAuth(enabled = true) {
  const { activeRoomKey, authToken } = useRoom();
  const { name } = useSession();
  const queryClient = useQueryClient();
  const [clientError, setClientError] = useState<string | null>(null);

  const hasRequiredContext =
    enabled && Boolean(activeRoomKey && name && authToken);

  const statusQuery = useQuery<GithubOAuthStatus>({
    queryKey: ["github-oauth-status", activeRoomKey, name, authToken],
    enabled: hasRequiredContext,
    staleTime: 1000 * 30,
    queryFn: () =>
      getGithubOAuthStatus(activeRoomKey ?? "", name ?? "", authToken ?? ""),
  });

  const connectMutation = useMutation({
    mutationKey: ["github-oauth-connect", activeRoomKey, name],
    mutationFn: async () => {
      const { authorizationUrl } = await authorizeGithubOAuth(
        activeRoomKey ?? "",
        name ?? "",
        authToken ?? "",
      );

      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      const authWindow = window.open(
        authorizationUrl,
        "GitHub OAuth",
        `width=${width},height=${height},left=${left},top=${top}`,
      );

      const pollTimer = setInterval(() => {
        if (authWindow?.closed) {
          clearInterval(pollTimer);
          setTimeout(() => {
            void statusQuery.refetch();
          }, 1000);
        }
      }, 500);
    },
  });

  const disconnectMutation = useMutation({
    mutationKey: ["github-oauth-disconnect", activeRoomKey, name],
    mutationFn: async () => {
      await revokeGithubOAuth(activeRoomKey ?? "", name ?? "", authToken ?? "");
      queryClient.setQueryData<GithubOAuthStatus | undefined>(
        ["github-oauth-status", activeRoomKey, name, authToken],
        (prev) =>
          prev
            ? {
              ...prev,
              connected: false,
              githubLogin: undefined,
              githubUserEmail: undefined,
            }
            : prev,
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["github-oauth-status", activeRoomKey, name, authToken],
      });
    },
  });

  const connect = async () => {
    if (!hasRequiredContext) {
      setClientError("Missing room key, user name, or session token");
      return;
    }
    setClientError(null);
    return connectMutation.mutateAsync();
  };

  const disconnect = async () => {
    if (!hasRequiredContext) {
      setClientError("Missing room key, user name, or session token");
      return;
    }
    setClientError(null);
    return disconnectMutation.mutateAsync();
  };

  const loading =
    (hasRequiredContext && statusQuery.isLoading) ||
    connectMutation.isPending ||
    disconnectMutation.isPending;

  const error =
    clientError ||
    (statusQuery.error instanceof Error ? statusQuery.error.message : null) ||
    (connectMutation.error instanceof Error
      ? connectMutation.error.message
      : null) ||
    (disconnectMutation.error instanceof Error
      ? disconnectMutation.error.message
      : null);

  const status =
    statusQuery.data && hasRequiredContext
      ? statusQuery.data
      : { connected: false };

  return {
    status,
    loading,
    error,
    connect,
    disconnect,
  };
}
