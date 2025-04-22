import type { FC } from 'react';

interface ConnectionStatusProps {
  isConnected: boolean;
}

const ConnectionStatus: FC<ConnectionStatusProps> = ({ isConnected }) => {
  return (
    <div
      className={`flex items-center px-2 py-1 rounded-md ${isConnected ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}
      title={isConnected ? 'Connected' : 'Disconnected'}
    >
      <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-600' : 'bg-red-600'}`} />
      <span className="ml-1.5 text-xs font-medium hidden sm:inline">
        {isConnected ? 'Connected' : 'Disconnected'}
      </span>
    </div>
  );
};

export default ConnectionStatus;