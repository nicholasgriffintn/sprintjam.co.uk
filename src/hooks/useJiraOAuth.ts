import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useRoom } from '../context/RoomContext';
import { useSession } from '../context/SessionContext';
import {
  authorizeJiraOAuth,
  getJiraFields,
  getJiraOAuthStatus,
  revokeJiraOAuth,
  saveJiraFieldConfiguration,
  type JiraFieldOption,
  type JiraOAuthStatus,
} from "../lib/jira-service";

export function useJiraOAuth(enabled = true) {
  const { activeRoomKey, authToken } = useRoom();
  const { name } = useSession();
  const queryClient = useQueryClient();
  const [clientError, setClientError] = useState<string | null>(null);

  const hasRequiredContext =
    enabled && Boolean(activeRoomKey && name && authToken);

  const statusQuery = useQuery<JiraOAuthStatus, Error>({
    queryKey: ["jira-oauth-status", activeRoomKey, name, authToken],
    enabled: hasRequiredContext,
    staleTime: 1000 * 30,
    queryFn: () =>
      getJiraOAuthStatus(
        activeRoomKey ?? "",
        name ?? "",
        authToken ?? "",
      ),
  });

  const fieldsQuery = useQuery<{
    fields: JiraFieldOption[];
    storyPointsField?: string | null;
    sprintField?: string | null;
  }, Error>({
    queryKey: ["jira-oauth-fields", activeRoomKey, name, authToken],
    enabled:
      hasRequiredContext &&
      Boolean(statusQuery.data?.connected && !statusQuery.isFetching),
    staleTime: 1000 * 60,
    queryFn: () =>
      getJiraFields(
        activeRoomKey ?? "",
        name ?? "",
        authToken ?? "",
      ),
  });

  const status = useMemo(() => {
    const base =
      statusQuery.data && hasRequiredContext
        ? statusQuery.data
        : { connected: false };

    if (!fieldsQuery.data || !hasRequiredContext) {
      return base;
    }

    return {
      ...base,
      storyPointsField:
        fieldsQuery.data.storyPointsField ?? base.storyPointsField,
      sprintField: fieldsQuery.data.sprintField ?? base.sprintField,
    };
  }, [statusQuery.data, fieldsQuery.data, hasRequiredContext]);

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

  const saveFieldConfiguration = async (options: {
    storyPointsField?: string | null;
    sprintField?: string | null;
  }) => {
    if (!hasRequiredContext) {
      setClientError("Missing room key, user name, or session token");
      return;
    }

    setClientError(null);
    return saveFieldsMutation.mutateAsync(options);
  };

  const connectMutation = useMutation({
    mutationKey: ["jira-oauth-connect", activeRoomKey, name],
    mutationFn: async () => {
      const { authorizationUrl } = await authorizeJiraOAuth(
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
        "Jira OAuth",
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
    mutationKey: ["jira-oauth-disconnect", activeRoomKey, name],
    mutationFn: async () => {
      await revokeJiraOAuth(activeRoomKey ?? "", name ?? "", authToken ?? "");

      queryClient.setQueryData<JiraOAuthStatus | undefined>(
        ["jira-oauth-status", activeRoomKey, name, authToken],
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
      queryClient.removeQueries({
        queryKey: ["jira-oauth-fields", activeRoomKey, name, authToken],
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["jira-oauth-status", activeRoomKey, name, authToken],
      });
    },
  });

  const saveFieldsMutation = useMutation({
    mutationKey: ["jira-oauth-fields-save", activeRoomKey, name],
    mutationFn: async (options: {
      storyPointsField?: string | null;
      sprintField?: string | null;
    }) => {
      await saveJiraFieldConfiguration(
        activeRoomKey ?? "",
        name ?? "",
        options,
        authToken ?? "",
      );

      queryClient.setQueryData<JiraOAuthStatus | undefined>(
        ["jira-oauth-status", activeRoomKey, name, authToken],
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
            : prev,
      );
      await queryClient.invalidateQueries({
        queryKey: ["jira-oauth-fields", activeRoomKey, name, authToken],
      });
    },
  });

  const fields =
    fieldsQuery.data && hasRequiredContext ? fieldsQuery.data.fields || [] : [];

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
    (fieldsQuery.error instanceof Error ? fieldsQuery.error.message : null) ||
    (saveFieldsMutation.error instanceof Error
      ? saveFieldsMutation.error.message
      : null) ||
    null;

  const fieldsLoaded = Boolean(fieldsQuery.data);
  const fieldsLoading = fieldsQuery.isLoading || fieldsQuery.isRefetching;
  const savingFields = saveFieldsMutation.isPending;
  const refreshStatus = () => statusQuery.refetch();
  const refreshFields = () => fieldsQuery.refetch();

  return {
    status,
    loading,
    error,
    connect,
    disconnect,
    refresh: refreshStatus,
    fields,
    fieldsLoading,
    fieldsLoaded,
    fetchFields: refreshFields,
    saveFieldConfiguration,
    savingFields,
  };
}
