import { type FC, useMemo } from 'react';

import type { RoomData, VoteValue } from '../types';
import ConnectionStatus from './ConnectionStatus';
import ErrorBanner from './ErrorBanner';

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
  error: string;
  onClearError: () => void;
  isConnected: boolean;
}

const RoomScreen: FC<RoomScreenProps> = ({
  roomData,
  name,
  isModeratorView,
  userVote,
  votingOptions,
  onVote,
  onToggleShowVotes,
  onResetVotes,
  error,
  onClearError,
  isConnected,
}) => {
  // Calculate voting statistics
  const stats: RoomStats = useMemo(() => {
    const votes = Object.values(roomData.votes).filter((v): v is VoteValue => v !== null && v !== '?');
    const numericVotes = votes.filter(v => v !== '?').map(Number);
    
    // Calculate distribution
    const distribution: Record<VoteValue, number> = {} as Record<VoteValue, number>;
    for (const option of votingOptions) {
      distribution[option] = 0;
    }
    
    for (const vote of Object.values(roomData.votes)) {
      if (vote !== null) {
        distribution[vote]++;
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
  }, [roomData.votes, roomData.users.length, votingOptions]);

  // Calculate progress percentage
  const votingProgress = useMemo(() => {
    return roomData.users.length > 0
      ? Math.round((stats.votedUsers / roomData.users.length) * 100)
      : 0;
  }, [stats.votedUsers, roomData.users.length]);

  return (
    <div className="flex flex-col h-screen">
      {/* Error banner */}
      {error && <ErrorBanner message={error} onClose={onClearError} />}
      
      {/* Header */}
      <header className="p-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold">SprintJam</h1>
            <div className="px-3 py-1 text-sm bg-blue-800 rounded-md">
              Room: {roomData.key}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <ConnectionStatus isConnected={isConnected} />
            <div className="text-sm px-3 py-1 bg-blue-800 rounded-md">
              {isModeratorView ? 'Moderator' : 'Team Member'}
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar - Users */}
        <div className="w-64 p-4 bg-gray-100 border-r overflow-y-auto">
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

        {/* Main area */}
        <div className="flex flex-col flex-1 p-6 overflow-y-auto">
          {/* Voting area */}
          <div className="mb-8">
            <h2 className="mb-4 text-xl font-semibold">Your Vote</h2>
            <div className="flex flex-wrap gap-3">
              {votingOptions.map((option: VoteValue) => (
                <button
                  type="button"
                  key={option}
                  onClick={() => onVote(option)}
                  className={`w-16 h-24 flex items-center justify-center text-lg font-medium border-2 rounded-lg transition-all ${
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
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Results</h2>
              {isModeratorView && (
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={onToggleShowVotes}
                    className="px-4 py-2 text-white bg-blue-500 rounded-md hover:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-300"
                  >
                    {roomData.showVotes ? 'Hide Votes' : 'Show Votes'}
                  </button>
                  <button
                    type="button"
                    onClick={onResetVotes}
                    className="px-4 py-2 text-red-600 bg-white border border-red-500 rounded-md hover:bg-red-50 transition-colors focus:outline-none focus:ring-2 focus:ring-red-300"
                  >
                    Reset Votes
                  </button>
                </div>
              )}
            </div>

            {roomData.showVotes ? (
              <div className="p-6 bg-gray-100 rounded-lg shadow-inner">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="p-4 bg-white rounded-lg shadow-sm">
                    <h3 className="mb-2 text-sm font-medium text-gray-500">
                      Average
                    </h3>
                    <p className="text-3xl font-bold text-blue-600">
                      {stats.avg}
                    </p>
                  </div>
                  <div className="p-4 bg-white rounded-lg shadow-sm">
                    <h3 className="mb-2 text-sm font-medium text-gray-500">
                      Most Common
                    </h3>
                    <p className="text-3xl font-bold text-blue-600">
                      {stats.mode || 'N/A'}
                    </p>
                  </div>
                </div>
                
                {/* Vote distribution visualization */}
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <h3 className="mb-4 text-sm font-medium text-gray-500">Vote Distribution</h3>
                  <div className="space-y-3">
                    {votingOptions.map(option => (
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
                        <div className="w-8 text-center text-sm">{stats.distribution[option]}</div>
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
      </div>
    </div>
  );
};

export default RoomScreen;