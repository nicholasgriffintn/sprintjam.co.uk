import { useQueryClient } from "@tanstack/react-query";

import { useOAuthProvider } from '@/hooks/useOAuthProvider';
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
    getStatus: ({ roomKey, name }) => getGithubOAuthStatus(roomKey, name),
    authorize: ({ roomKey, name }) => authorizeGithubOAuth(roomKey, name),
    revoke: ({ roomKey, name }) => revokeGithubOAuth(roomKey, name),
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
            : prev,
      );
    },
  });
}
