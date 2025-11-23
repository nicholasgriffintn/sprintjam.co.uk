import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useRoom } from '@/context/RoomContext';
import { useSession } from '@/context/SessionContext';
import {
  authorizeSlackOAuth,
  getSlackOAuthStatus,
  revokeSlackOAuth,
  type SlackOAuthStatus,
} from "@/lib/slack-service";

export function useSlackOAuth(enabled = true) {
  const { activeRoomKey, authToken } = useRoom();
  const { name } = useSession();
  const queryClient = useQueryClient();
  const [clientError, setClientError] = useState<string | null>(null);

  const hasRequiredContext =
    enabled && Boolean(activeRoomKey && name && authToken);

  const statusQuery = useQuery<SlackOAuthStatus>({
    queryKey: ["slack-oauth-status", activeRoomKey, name, authToken],
    enabled: hasRequiredContext,
    queryFn: () =>
      getSlackOAuthStatus(
        activeRoomKey ?? "",
        name ?? "",
        authToken ?? "",
      ),
    staleTime: 1000 * 30,
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

  const connectMutation = useMutation({
    mutationKey: ["slack-oauth-connect", activeRoomKey, name],
    mutationFn: async () => {
      const { authorizationUrl } = await authorizeSlackOAuth(
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
        "Slack OAuth",
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
    mutationKey: ["slack-oauth-disconnect", activeRoomKey, name],
    mutationFn: async () => {
      await revokeSlackOAuth(activeRoomKey ?? "", name ?? "", authToken ?? "");

      queryClient.setQueryData<SlackOAuthStatus>(
        ["slack-oauth-status", activeRoomKey, name, authToken],
        { connected: false },
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["slack-oauth-status", activeRoomKey, name, authToken],
      });
    },
  });

  const status =
    statusQuery.data && hasRequiredContext
      ? statusQuery.data
      : { connected: false };

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
      : null) ||
    null;

  return {
    status,
    loading,
    error,
    connect,
    disconnect,
    refresh: () => statusQuery.refetch(),
  };
}
