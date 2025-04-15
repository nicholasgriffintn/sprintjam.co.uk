import type { FC } from 'react';

interface ConnectionStatusProps {
  isConnected: boolean;
}

const ConnectionStatus: FC<ConnectionStatusProps> = ({ isConnected }) => {
  return (
    <div className={`flex items-center ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
      <div className={`w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-green-600' : 'bg-red-600'}`} />
      <span className="text-xs font-medium">
        {isConnected ? 'Connected' : 'Disconnected'}
      </span>
    </div>
  );
};

export default ConnectionStatus;