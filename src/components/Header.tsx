import ConnectionStatus from './ConnectionStatus';
import DarkModeToggle from './DarkModeToggle';
import type { RoomData } from '../types';

export interface HeaderProps {
  roomData: RoomData;
  isModeratorView: boolean;
  isConnected: boolean;
  onLeaveRoom: () => void;
  setIsShareModalOpen: (open: boolean) => void;
  setIsSettingsModalOpen: (open: boolean) => void;
}

export default function Header({
  roomData,
  isModeratorView,
  isConnected,
  onLeaveRoom,
  setIsShareModalOpen,
  setIsSettingsModalOpen,
}: HeaderProps) {
  return (
    <header className="p-4 bg-gradient-to-r from-blue-600 to-blue-700 dark:from-gray-800 dark:to-gray-900 text-white shadow-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 md:space-x-4">
          <div className="flex items-center space-x-2">
            <img src="/logo-192.png" alt="SprintJam" className="h-8 w-8" />
            <h1 className="text-lg md:text-xl font-bold">SprintJam</h1>
          </div>
          <div className="flex items-stretch h-7">
            <div className="px-2 md:px-3 py-1 text-xs md:text-sm bg-blue-800 dark:bg-gray-700 rounded-l-md truncate max-w-[80px] md:max-w-none flex items-center">
              {roomData.key}
            </div>
            <button
              type="button"
              onClick={() => setIsShareModalOpen(true)}
              className="px-2 py-1 bg-blue-700 hover:bg-blue-800 dark:bg-gray-600 dark:hover:bg-gray-500 rounded-r-md border-l border-blue-600 dark:border-gray-500 flex items-center"
              title="Share Room"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <title>Share Room</title>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </button>
          </div>
          <button
            type="button"
            onClick={onLeaveRoom}
            className="text-xs md:text-sm px-2 md:px-3 py-1 bg-gray-700 hover:bg-gray-800 dark:bg-gray-600 dark:hover:bg-gray-500 rounded-md transition-colors"
            title="Leave Room"
          >
            Leave Room
          </button>
        </div>

        <div className="flex items-center space-x-2 md:space-x-4">
          <ConnectionStatus isConnected={isConnected} />
          <div className="hidden sm:block text-xs md:text-sm px-2 md:px-3 py-1 bg-blue-800 dark:bg-gray-700 rounded-md">
            {isModeratorView ? 'Moderator' : 'Team Member'}
          </div>
          <DarkModeToggle />
          {isModeratorView && (
            <button
              type="button"
              onClick={() => setIsSettingsModalOpen(true)}
              className="p-1 md:p-1.5 rounded-full bg-blue-800 hover:bg-blue-900 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
              title="Room Settings"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 md:h-5 md:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <title>Room Settings</title>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}