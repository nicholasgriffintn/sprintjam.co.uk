type RefreshableCredentials = {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number | null;
};

type RefreshedToken = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

type ExecuteWithTokenRefreshOptions<T> = {
  credentials: RefreshableCredentials;
  operation: (accessToken: string) => Promise<T>;
  onTokenRefresh: (
    accessToken: string,
    refreshToken: string,
    expiresAt: number,
  ) => Promise<void>;
  refreshToken: (refreshToken: string) => Promise<RefreshedToken>;
  reconnectErrorMessage: string;
  refreshWindowMs?: number;
};

const DEFAULT_REFRESH_WINDOW_MS = 5 * 60 * 1000;

function isExpiringSoon(
  expiresAt: number | null,
  refreshWindowMs: number = DEFAULT_REFRESH_WINDOW_MS,
): boolean {
  if (typeof expiresAt !== "number") {
    return false;
  }
  return expiresAt - Date.now() < refreshWindowMs;
}

export async function executeWithTokenRefresh<T>({
  credentials,
  operation,
  onTokenRefresh,
  refreshToken,
  reconnectErrorMessage,
  refreshWindowMs = DEFAULT_REFRESH_WINDOW_MS,
}: ExecuteWithTokenRefreshOptions<T>): Promise<T> {
  if (isExpiringSoon(credentials.expiresAt, refreshWindowMs) && credentials.refreshToken) {
    try {
      const refreshed = await refreshToken(credentials.refreshToken);
      const newExpiresAt = Date.now() + refreshed.expiresIn * 1000;
      await onTokenRefresh(
        refreshed.accessToken,
        refreshed.refreshToken,
        newExpiresAt,
      );
      return await operation(refreshed.accessToken);
    } catch (error) {
      console.error("Token refresh failed:", error);
    }
  }

  try {
    return await operation(credentials.accessToken);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("401") &&
      credentials.refreshToken
    ) {
      try {
        const refreshed = await refreshToken(credentials.refreshToken);
        const newExpiresAt = Date.now() + refreshed.expiresIn * 1000;
        await onTokenRefresh(
          refreshed.accessToken,
          refreshed.refreshToken,
          newExpiresAt,
        );
        return await operation(refreshed.accessToken);
      } catch (refreshError) {
        console.error("Token refresh retry failed:", refreshError);
        throw new Error(reconnectErrorMessage);
      }
    }
    throw error;
  }
}
