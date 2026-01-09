import { useQueryClient } from "@tanstack/react-query";

import { useOAuthProvider } from "./useOAuthProvider";
import {
  authorizeGithubOAuth,
  getGithubOAuthStatus,
  revokeGithubOAuth,
  type GithubOAuthStatus,
} from '@/lib/github-service';

export function useGithubOAuth(enabled = true) {
  const queryClient = useQueryClient();

  return useOAuthProvider<GithubOAuthStatus>({
    provider: 'github',
    providerLabel: 'GitHub',
    enabled,
    initialStatus: { connected: false },
    getStatus: ({ roomKey, name, authToken }) =>
      getGithubOAuthStatus(roomKey, name, authToken),
    authorize: ({ roomKey, name, authToken }) =>
      authorizeGithubOAuth(roomKey, name, authToken),
    revoke: ({ roomKey, name, authToken }) =>
      revokeGithubOAuth(roomKey, name, authToken),
    onDisconnectSuccess: ({ queryKey }) => {
      queryClient.setQueryData<GithubOAuthStatus | undefined>(
        queryKey,
        (prev) =>
          prev
            ? {
                ...prev,
                connected: false,
                githubLogin: undefined,
                githubUserEmail: undefined,
              }
            : prev
      );
    },
  });
}
