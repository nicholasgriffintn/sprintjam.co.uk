import { Loader2, WifiOff } from "lucide-react";

import { ErrorConnectionIssue } from "@/types";

export function ErrorBannerConnection({
  connectionIssue,
  onRetryConnection,
}: {
  connectionIssue?: ErrorConnectionIssue | null;
  onRetryConnection?: () => void;
}) {
  return (
    <div className="bg-amber-50 text-amber-800 dark:bg-amber-900/40 dark:text-amber-100 border-b border-amber-200/70 dark:border-amber-800 px-4 py-2.5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-2">
        {connectionIssue?.reconnecting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <WifiOff className="h-4 w-4" />
        )}
        <p className="text-sm font-semibold">
          {connectionIssue?.message ||
            "Connection lost. Trying to reconnect..."}
        </p>
      </div>
      <div className="flex items-center gap-2 text-xs">
        <span className="rounded-full bg-white/70 px-2 py-1 font-semibold text-amber-700 dark:bg-amber-800/50 dark:text-amber-100">
          Votes paused until connection is restored.
        </span>
        <button
          type="button"
          onClick={onRetryConnection}
          className="rounded-lg bg-amber-600 px-3 py-1.5 font-semibold text-white hover:bg-amber-700"
        >
          Retry
        </button>
      </div>
    </div>
  );
}
