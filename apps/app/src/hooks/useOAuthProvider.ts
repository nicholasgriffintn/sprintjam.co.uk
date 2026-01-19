import { useMemo, useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";

import { useRoomState } from "@/context/RoomContext";
import { useSessionState } from "@/context/SessionContext";

interface OAuthContext {
  roomKey: string;
  name: string;
}

interface UseOAuthProviderOptions<Status> {
  provider: 'jira' | 'linear' | 'github';
  providerLabel?: string;
  enabled?: boolean;
  staleTime?: number;
  initialStatus: Status;
  getStatus: (context: OAuthContext) => Promise<Status>;
  authorize: (context: OAuthContext) => Promise<{ authorizationUrl: string }>;
  revoke: (context: OAuthContext) => Promise<void>;
  onDisconnectSuccess?: (context: {
    queryClient: ReturnType<typeof useQueryClient>;
    queryKey: QueryKey;
  }) => void;
}

export interface OAuthProviderResult<Status> {
  status: Status;
  loading: boolean;
  error: string | null;
  hasRequiredContext: boolean;
  connect: () => Promise<void> | undefined;
  disconnect: () => Promise<void> | undefined;
  refresh: () => Promise<Status | undefined>;
}

const baseWindowFeatures = 'width=600,height=700';

const openAuthWindow = (url: string, label: string) => {
  const width = 600;
  const height = 700;
  const left = window.screen.width / 2 - width / 2;
  const top = window.screen.height / 2 - height / 2;

  return window.open(
    url,
    `${label} OAuth`,
    `${baseWindowFeatures},left=${left},top=${top}`
  );
};

export function useOAuthProvider<Status>({
  provider,
  providerLabel,
  enabled = true,
  staleTime = 1000 * 30,
  initialStatus,
  getStatus,
  authorize,
  revoke,
  onDisconnectSuccess,
}: UseOAuthProviderOptions<Status>): OAuthProviderResult<Status> {
  const { activeRoomKey } = useRoomState();
  const { name } = useSessionState();
  const queryClient = useQueryClient();
  const [clientError, setClientError] = useState<string | null>(null);

  const hasRequiredContext = enabled && Boolean(activeRoomKey && name);

  const context: OAuthContext = useMemo(
    () => ({
      roomKey: activeRoomKey ?? '',
      name: name ?? '',
    }),
    [activeRoomKey, name],
  );

  const statusQueryKey: QueryKey = [
    provider,
    'oauth-status',
    context.roomKey,
    context.name,
  ];

  const statusQuery = useQuery<Status>({
    queryKey: statusQueryKey,
    enabled: hasRequiredContext,
    staleTime,
    queryFn: () => getStatus(context),
  });

  const connectMutation = useMutation({
    mutationKey: [provider, 'oauth-connect', context.roomKey, context.name],
    mutationFn: async () => {
      const { authorizationUrl } = await authorize(context);
      const authWindow = openAuthWindow(
        authorizationUrl,
        providerLabel ?? provider
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
    mutationKey: [provider, 'oauth-disconnect', context.roomKey, context.name],
    mutationFn: async () => {
      await revoke(context);
      onDisconnectSuccess?.({
        queryClient,
        queryKey: statusQueryKey,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: statusQueryKey });
    },
  });

  const connect = async () => {
    if (!hasRequiredContext) {
      setClientError('Missing room key, user name, or session token');
      return;
    }

    setClientError(null);
    return connectMutation.mutateAsync();
  };

  const disconnect = async () => {
    if (!hasRequiredContext) {
      setClientError('Missing room key, user name, or session token');
      return;
    }

    setClientError(null);
    return disconnectMutation.mutateAsync();
  };

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

  const loading =
    (hasRequiredContext && statusQuery.isLoading) ||
    connectMutation.isPending ||
    disconnectMutation.isPending;

  const status = (hasRequiredContext && statusQuery.data) || initialStatus;

  return {
    status,
    loading,
    error,
    hasRequiredContext,
    connect,
    disconnect,
    refresh: async () => {
      const result = await statusQuery.refetch();
      return result.data;
    },
  };
}
