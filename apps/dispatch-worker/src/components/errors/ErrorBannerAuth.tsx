import { ShieldX } from "lucide-react";

import { Button } from "@/components/ui/Button";

export function ErrorBannerAuth({
  onRetryConnection,
  onLeaveRoom,
}: {
  onRetryConnection?: () => void;
  onLeaveRoom?: () => void;
}) {
  return (
    <div className="bg-red-100/70 text-red-800 dark:bg-red-900/40 dark:text-red-100 border-b border-red-200/70 dark:border-red-800 px-4 py-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <div className="flex items-start gap-2">
        <ShieldX className="h-4 w-4 mt-0.5" />
        <div>
          <p className="text-sm font-semibold">
            Session expired — please rejoin the room.
          </p>
          <p className="text-xs opacity-80">
            Votes will not send until you reconnect with a new link.
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="unstyled"
          onClick={onRetryConnection}
          className="rounded-lg bg-red-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-800"
        >
          Try again
        </Button>
        <Button
          type="button"
          variant="unstyled"
          onClick={onLeaveRoom}
          className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-800 hover:bg-red-200 dark:border-red-700 dark:text-red-100 dark:hover:bg-red-800/40"
        >
          Leave room
        </Button>
      </div>
    </div>
  );
}
