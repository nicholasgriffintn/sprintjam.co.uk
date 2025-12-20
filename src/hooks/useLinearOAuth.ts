import { useOAuthProvider } from "./useOAuthProvider";
import {
  authorizeLinearOAuth,
  getLinearOAuthStatus,
  revokeLinearOAuth,
  type LinearOAuthStatus,
} from "@/lib/linear-service";

export function useLinearOAuth(enabled = true) {
  return useOAuthProvider<LinearOAuthStatus>({
    provider: "linear",
    providerLabel: "Linear",
    enabled,
    initialStatus: { connected: false },
    getStatus: ({ roomKey, name, authToken }) =>
      getLinearOAuthStatus(roomKey, name, authToken),
    authorize: ({ roomKey, name, authToken }) =>
      authorizeLinearOAuth(roomKey, name, authToken),
    revoke: ({ roomKey, name, authToken }) =>
      revokeLinearOAuth(roomKey, name, authToken),
  });
}
