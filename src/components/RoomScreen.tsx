import { type FC, useMemo, useState, useEffect, useRef } from 'react';

import type { RoomData, VoteValue } from '../types';
import ConnectionStatus from './ConnectionStatus';
import ErrorBanner from './ErrorBanner';
import SettingsModal from './SettingsModal';
import ShareRoomModal from './ShareRoomModal';

interface RoomStats {
  avg: number | string;
  mode: VoteValue | null;
  distribution: Record<VoteValue, number>;
  totalVotes: number;
  votedUsers: number;
  totalUsers: number;
}

interface RoomScreenProps {
  roomData: RoomData;
  name: string;
  isModeratorView: boolean;
  userVote: VoteValue | null;
  votingOptions: VoteValue[];
  onVote: (value: VoteValue) => void;
  onToggleShowVotes: () => void;
  onResetVotes: () => void;
  onUpdateSettings: (settings: RoomData['settings']) => void;
  error: string;
  onClearError: () => void;
  isConnected: boolean;
}

const RoomScreen: FC<RoomScreenProps> = ({
  roomData,
  name,
  isModeratorView,
  userVote,
  onVote,
  onToggleShowVotes,
  onResetVotes,
  onUpdateSettings,
  error,
  onClearError,
  isConnected,
}) => {
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Calculate voting statistics
  const stats: RoomStats = useMemo(() => {
    const votes = Object.values(roomData.votes).filter((v): v is VoteValue => v !== null && v !== '?');
    const numericVotes = votes.filter(v => !Number.isNaN(Number(v))).map(Number);
    
    // Calculate distribution
    const distribution: Record<VoteValue, number> = {} as Record<VoteValue, number>;
    for (const option of roomData.settings.estimateOptions) {
      distribution[option] = 0;
    }
    
    for (const vote of Object.values(roomData.votes)) {
      if (vote !== null) {
        distribution[vote] = (distribution[vote] || 0) + 1;
      }
    }
    
    // Calculate average
    const avg = numericVotes.length > 0
      ? numericVotes.reduce((a, b) => a + b, 0) / numericVotes.length
      : 0;
    
    // Find mode (most common vote)
    let maxCount = 0;
    let mode: VoteValue | null = null;
    
    for (const [vote, count] of Object.entries(distribution)) {
      if (count > maxCount) {
        maxCount = count;
        mode = vote as VoteValue;
      }
    }
    
    // Count users who have voted
    const votedUsers = Object.values(roomData.votes).filter(v => v !== null).length;
    
    return {
      avg: Number.isNaN(avg) ? 'N/A' : avg.toFixed(1),
      mode: maxCount > 0 ? mode : null,
      distribution,
      totalVotes: votes.length,
      votedUsers,
      totalUsers: roomData.users.length,
    };
  }, [roomData.votes, roomData.users.length, roomData.settings.estimateOptions]);

  // Calculate progress percentage
  const votingProgress = useMemo(() => {
    return roomData.users.length > 0
      ? Math.round((stats.votedUsers / roomData.users.length) * 100)
      : 0;
  }, [stats.votedUsers, roomData.users.length]);

  // Add useEffect to log when settings change
  useEffect(() => {
    console.log('Room settings updated:', roomData.settings);
  }, [roomData.settings]);

  // Timer functionality
  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [timerRunning]);

  // Format timer display
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Error banner */}
      {error && <ErrorBanner message={error} onClose={onClearError} />}
      
      {/* Header */}
      <header className="p-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 md:space-x-4">
            {/* Mobile sidebar toggle */}
            <button 
              type="button" 
              className="block md:hidden mr-1" 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <title>{isSidebarOpen ? "Close sidebar" : "Open sidebar"}</title>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-lg md:text-xl font-bold">SprintJam</h1>
            <div className="flex items-stretch h-7">
              <div className="px-2 md:px-3 py-1 text-xs md:text-sm bg-blue-800 rounded-l-md truncate max-w-[80px] md:max-w-none flex items-center">
                {roomData.key}
              </div>
              <button
                type="button"
                onClick={() => setIsShareModalOpen(true)}
                className="px-2 py-1 bg-blue-700 hover:bg-blue-800 rounded-r-md border-l border-blue-600 flex items-center"
                title="Share Room"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <title>Share Room</title>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </button>
            </div>
            {roomData.settings.showTimer && (
              <div className="px-2 py-1 bg-blue-800 rounded-md flex items-center space-x-1 text-xs">
                <span className="font-mono">{formatTime(timerSeconds)}</span>
                <button
                  type="button"
                  onClick={() => setTimerRunning(!timerRunning)}
                  className="p-0.5 rounded hover:bg-blue-700"
                  title={timerRunning ? "Pause Timer" : "Start Timer"}
                >
                  {timerRunning ? "⏸" : "▶️"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTimerRunning(false);
                    setTimerSeconds(0);
                  }}
                  className="p-0.5 rounded hover:bg-blue-700"
                  title="Reset Timer"
                >
                  🔄
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2 md:space-x-4">
            <ConnectionStatus isConnected={isConnected} />
            <div className="hidden sm:block text-xs md:text-sm px-2 md:px-3 py-1 bg-blue-800 rounded-md">
              {isModeratorView ? 'Moderator' : 'Team Member'}
            </div>
            {isModeratorView && (
              <button
                type="button"
                onClick={() => setIsSettingsModalOpen(true)}
                className="p-1 md:p-1.5 rounded-full bg-blue-800 hover:bg-blue-900 transition-colors"
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

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile sidebar overlay */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 z-10 md:hidden"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.1)' }}
            onClick={() => setIsSidebarOpen(false)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setIsSidebarOpen(false);
            }}
            role="button"
            tabIndex={0}
            aria-label="Close sidebar overlay"
          />
        )}
      
        {/* Left sidebar - Users (responsive) */}
        <div 
          className={`
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
            fixed md:relative md:translate-x-0 
            z-20 h-full md:w-64 w-3/4 p-4 bg-gray-100 border-r overflow-y-auto 
            transition-transform duration-300 ease-in-out
          `}
        >
          <h2 className="mb-4 text-lg font-medium">Participants ({roomData.users.length})</h2>
          
          {/* Voting progress */}
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span>Voting Progress</span>
              <span>{stats.votedUsers}/{roomData.users.length}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-500 ease-out" 
                style={{ width: `${votingProgress}%` }}
              />
            </div>
          </div>
          
          <ul className="space-y-2">
            {roomData.users.map((user: string) => (
              <li
                key={user}
                className="flex items-center justify-between p-2 bg-white rounded-md shadow-sm transition-all hover:shadow-md"
              >
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    roomData.votes[user] !== undefined && roomData.votes[user] !== null
                      ? 'bg-green-500'
                      : 'bg-gray-300'
                  }`} />
                  <span className={`${user === name ? 'font-medium' : ''}`}>
                    {user}
                    {user === roomData.moderator && (
                      <span className="ml-1 text-xs text-blue-600">(Mod)</span>
                    )}
                    {user === name && (
                      <span className="ml-1 text-xs text-gray-500">(You)</span>
                    )}
                    {roomData.settings.showUserPresence && (
                      <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${
                        roomData.connectedUsers?.[user]
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-200 text-gray-700'
                      }`}>
                        {roomData.connectedUsers?.[user] ? 'Online' : 'Offline'}
                      </span>
                    )}
                  </span>
                </div>
                {(roomData.votes[user] !== undefined && roomData.votes[user] !== null) && (
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${
                      roomData.showVotes
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-200'
                    }`}
                  >
                    {roomData.showVotes ? roomData.votes[user] : '✓'}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* Right content area */}
        <div className="flex flex-col flex-1 p-4 md:p-6 overflow-y-auto">
          {/* Voting area */}
          <div className="mb-8">
            <h2 className="mb-4 text-xl font-semibold">Your Vote</h2>
            <div className="flex flex-wrap gap-2 md:gap-3">
              {roomData.settings.estimateOptions.map((option: VoteValue) => (
                <button
                  type="button"
                  key={option}
                  onClick={() => onVote(option)}
                  className={`w-12 h-16 md:w-16 md:h-24 flex items-center justify-center text-lg font-medium border-2 rounded-lg transition-all ${
                    userVote === option
                      ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-md transform scale-105'
                      : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          {/* Results area */}
          {roomData.users.length > 0 && (
            <div className="mb-4">
              <div className="flex flex-wrap items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Results</h2>
                <div className="flex flex-wrap mt-2 sm:mt-0 gap-2 sm:space-x-3">
                  {(isModeratorView || roomData.settings.allowOthersToShowEstimates) && (
                    <button
                      type="button"
                      onClick={onToggleShowVotes}
                      className={`px-3 py-1.5 text-sm sm:text-base rounded-md ${
                        !roomData.showVotes
                          ? 'bg-blue-500 text-white hover:bg-blue-600'
                          : 'bg-yellow-500 text-white hover:bg-yellow-600'
                      }`}
                    >
                      {roomData.showVotes ? 'Hide Votes' : 'Show Votes'}
                    </button>
                  )}
                  {(isModeratorView || roomData.settings.allowOthersToDeleteEstimates) && (
                    <button
                      type="button"
                      onClick={onResetVotes}
                      className="px-3 py-1.5 text-sm sm:text-base bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                    >
                      Reset Votes
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {roomData.showVotes ? (
            <div className="p-6 bg-gray-100 rounded-lg shadow-inner">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {roomData.settings.showAverage && (
                  <div className="p-4 bg-white rounded-lg shadow-sm">
                    <h3 className="mb-2 text-sm font-medium text-gray-500">
                      Average
                    </h3>
                    <p className="text-3xl font-bold text-blue-600">
                      {stats.avg}
                    </p>
                  </div>
                )}
                {roomData.settings.showMedian && (
                  <div className="p-4 bg-white rounded-lg shadow-sm">
                    <h3 className="mb-2 text-sm font-medium text-gray-500">
                      Most Common
                    </h3>
                    <p className="text-3xl font-bold text-blue-600">
                      {stats.mode || 'N/A'}
                    </p>
                  </div>
                )}
              </div>
              
              {/* Vote distribution visualization */}
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <h3 className="mb-4 text-sm font-medium text-gray-500">Vote Distribution</h3>
                <div className="space-y-3">
                  {roomData.settings.estimateOptions.map(option => (
                    <div key={option} className="flex items-center">
                      <div className="w-8 text-center font-medium">{option}</div>
                      <div className="flex-1 mx-2">
                        <div className="w-full bg-gray-200 rounded-full h-4">
                          <div 
                            className="bg-blue-600 h-4 rounded-full transition-all duration-500 ease-out"
                            style={{ 
                              width: `${roomData.users.length > 0 
                                ? (stats.distribution[option] / roomData.users.length) * 100 
                                : 0}%` 
                            }}
                          />
                        </div>
                      </div>
                      <div className="w-8 text-center text-sm">{stats.distribution[option] || 0}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center p-12 bg-gray-100 rounded-lg">
              <div className="text-center">
                {Object.values(roomData.votes).some(v => v !== null) ? (
                  <>
                    <div className="mb-2 text-4xl">🔒</div>
                    <p className="text-gray-500">
                      Votes are hidden. Waiting for moderator to reveal.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="mb-2 text-4xl">⏳</div>
                    <p className="text-gray-500">
                      No votes yet. Waiting for team members to vote.
                    </p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={roomData.settings}
        onSaveSettings={onUpdateSettings}
      />

      {/* Share Room Modal */}
      <ShareRoomModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        roomKey={roomData.key}
      />
    </div>
  );
};

export default RoomScreen;