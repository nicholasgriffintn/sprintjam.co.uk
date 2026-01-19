import { useOAuthProvider } from '@/hooks/useOAuthProvider';
import {
  authorizeLinearOAuth,
  getLinearOAuthStatus,
  revokeLinearOAuth,
  type LinearOAuthStatus,
} from '@/lib/linear-service';

export function useLinearOAuth(enabled = true) {
  return useOAuthProvider<LinearOAuthStatus>({
    provider: 'linear',
    providerLabel: 'Linear',
    enabled,
    initialStatus: { connected: false },
    getStatus: ({ roomKey, name }) => getLinearOAuthStatus(roomKey, name),
    authorize: ({ roomKey, name }) => authorizeLinearOAuth(roomKey, name),
    revoke: ({ roomKey, name }) => revokeLinearOAuth(roomKey, name),
  });
}
