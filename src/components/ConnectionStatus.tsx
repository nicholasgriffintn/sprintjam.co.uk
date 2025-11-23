import type { FC } from "react";

import { Badge } from "@/components/ui/Badge";

interface ConnectionStatusProps {
  isConnected: boolean;
}

const ConnectionStatus: FC<ConnectionStatusProps> = ({ isConnected }) => {
  const statusText = isConnected ? "Connected" : "Disconnected";

  return (
    <Badge
      variant={isConnected ? "success" : "error"}
      className="flex items-center"
      data-testid="connection-status"
      aria-label={`Connection status: ${statusText}`}
    >
      <div
        className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-600" : "bg-red-600"
          }`}
        aria-hidden="true"
      />
      <span className="ml-1.5 text-xs font-medium hidden md:inline">
        {statusText}
      </span>
    </Badge>
  );
};

export default ConnectionStatus;
