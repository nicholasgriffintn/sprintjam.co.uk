import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useOAuthProvider } from '@/hooks/useOAuthProvider';
import { useRoomState } from "@/context/RoomContext";
import { useSessionState } from "@/context/SessionContext";
import {
  authorizeJiraOAuth,
  getJiraFields,
  getJiraOAuthStatus,
  revokeJiraOAuth,
  saveJiraFieldConfiguration,
  type JiraFieldOption,
  type JiraOAuthStatus,
} from '@/lib/jira-service';

export function useJiraOAuth(enabled = true) {
  const queryClient = useQueryClient();
  const { activeRoomKey } = useRoomState();
  const { name } = useSessionState();
  const [clientError, setClientError] = useState<string | null>(null);

  const fieldsQueryKey = ['jira-oauth-fields', activeRoomKey, name] as const;
  const statusQueryKey = ['jira', 'oauth-status', activeRoomKey, name] as const;

  const oauth = useOAuthProvider<JiraOAuthStatus>({
    provider: 'jira',
    providerLabel: 'Jira',
    enabled,
    initialStatus: { connected: false },
    getStatus: ({ roomKey, name }) => getJiraOAuthStatus(roomKey, name),
    authorize: ({ roomKey, name }) => authorizeJiraOAuth(roomKey, name),
    revoke: ({ roomKey, name }) => revokeJiraOAuth(roomKey, name),
    onDisconnectSuccess: () => {
      queryClient.setQueryData<JiraOAuthStatus | undefined>(
        statusQueryKey,
        (prev) =>
          prev
            ? {
                ...prev,
                connected: false,
                storyPointsField: undefined,
                sprintField: undefined,
              }
            : prev,
      );
      queryClient.removeQueries({ queryKey: fieldsQueryKey });
    },
  });

  const fieldsQuery = useQuery<
    {
      fields: JiraFieldOption[];
      storyPointsField?: string | null;
      sprintField?: string | null;
    },
    Error
  >({
    queryKey: fieldsQueryKey,
    enabled:
      enabled &&
      oauth.hasRequiredContext &&
      Boolean(oauth.status.connected && !oauth.loading),
    staleTime: 1000 * 60,
    queryFn: () => getJiraFields(activeRoomKey ?? '', name ?? ''),
  });

  const saveFieldsMutation = useMutation({
    mutationKey: ['jira-oauth-fields-save', activeRoomKey, name],
    mutationFn: async (options: {
      storyPointsField?: string | null;
      sprintField?: string | null;
    }) => {
      await saveJiraFieldConfiguration(
        activeRoomKey ?? '',
        name ?? '',
        options,
      );

      queryClient.setQueryData<JiraOAuthStatus | undefined>(
        statusQueryKey,
        (prev) =>
          prev
            ? {
                ...prev,
                storyPointsField:
                  options.storyPointsField !== undefined
                    ? options.storyPointsField
                    : prev.storyPointsField,
                sprintField:
                  options.sprintField !== undefined
                    ? options.sprintField
                    : prev.sprintField,
              }
            : prev
      );
      await queryClient.invalidateQueries({ queryKey: fieldsQueryKey });
    },
  });

  const saveFieldConfiguration = async (options: {
    storyPointsField?: string | null;
    sprintField?: string | null;
  }) => {
    if (!oauth.hasRequiredContext) {
      setClientError('Missing room key, user name, or session token');
      return;
    }

    setClientError(null);
    return saveFieldsMutation.mutateAsync(options);
  };

  const fields =
    fieldsQuery.data && oauth.hasRequiredContext
      ? fieldsQuery.data.fields || []
      : [];

  const mergedStatus = useMemo(() => {
    const base = oauth.status;
    if (!fieldsQuery.data || !oauth.hasRequiredContext) {
      return base;
    }

    return {
      ...base,
      storyPointsField:
        fieldsQuery.data.storyPointsField ?? base.storyPointsField,
      sprintField: fieldsQuery.data.sprintField ?? base.sprintField,
    };
  }, [oauth.status, fieldsQuery.data, oauth.hasRequiredContext]);

  const error =
    clientError ||
    oauth.error ||
    (fieldsQuery.error instanceof Error ? fieldsQuery.error.message : null) ||
    (saveFieldsMutation.error instanceof Error
      ? saveFieldsMutation.error.message
      : null) ||
    null;

  const fieldsLoaded = Boolean(fieldsQuery.data);
  const fieldsLoading = fieldsQuery.isLoading || fieldsQuery.isRefetching;

  return {
    status: mergedStatus,
    loading: oauth.loading || saveFieldsMutation.isPending,
    error,
    connect: oauth.connect,
    disconnect: oauth.disconnect,
    refresh: oauth.refresh,
    fields,
    fieldsLoaded,
    fieldsLoading,
    fetchFields: () => fieldsQuery.refetch(),
    saveFieldConfiguration,
    savingFields: saveFieldsMutation.isPending,
  };
}
