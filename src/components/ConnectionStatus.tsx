import type { FC } from "react";

import { Badge } from "./ui/Badge";

interface ConnectionStatusProps {
  isConnected: boolean;
}

const ConnectionStatus: FC<ConnectionStatusProps> = ({ isConnected }) => {
  return (
    <Badge
      variant={isConnected ? "success" : "error"}
      className="flex items-center"
      data-testid="connection-status"
    >
      <div
        className={`w-2 h-2 rounded-full ${
          isConnected ? "bg-green-600" : "bg-red-600"
        }`}
      />
      <span className="ml-1.5 text-xs font-medium hidden md:inline">
        {isConnected ? "Connected" : "Disconnected"}
      </span>
    </Badge>
  );
};

export default ConnectionStatus;
