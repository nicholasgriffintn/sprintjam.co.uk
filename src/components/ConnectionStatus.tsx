import type { FC } from "react";

import { Badge } from "@/components/ui/Badge";
import type { ConnectionStatusState } from '@/types';

interface ConnectionStatusProps {
  status: ConnectionStatusState;
}

const STATUS_CONFIG: Record<
  ConnectionStatusState,
  {
    text: string;
    variant: 'success' | 'warning' | 'error';
    dotClass: string;
  }
> = {
  connected: {
    text: 'Connected',
    variant: 'success',
    dotClass: 'bg-emerald-600',
  },
  connecting: {
    text: 'Connecting',
    variant: 'warning',
    dotClass: 'bg-amber-500',
  },
  disconnected: {
    text: 'Disconnected',
    variant: 'error',
    dotClass: 'bg-rose-600',
  },
};

const ConnectionStatus: FC<ConnectionStatusProps> = ({ status }) => {
  const config = STATUS_CONFIG[status];

  return (
    <Badge
      variant={config.variant}
      className="flex items-center"
      data-testid="connection-status"
      aria-label={`Connection status: ${config.text}`}
    >
      <div className={`w-2 h-2 rounded-full ${config.dotClass}`} />
      <span className="ml-1.5 text-xs font-medium hidden md:inline">
        {config.text}
      </span>
    </Badge>
  );
};

export default ConnectionStatus;
