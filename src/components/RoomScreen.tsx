import { type FC, useMemo } from 'react';
import type { RoomData, VoteValue } from '../types';

interface RoomStats {
  avg: number | string;
  mode: VoteValue | null;
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
}) => {

  // Calculate voting statistics (moved from App.tsx, memoized here)
  const stats: RoomStats | null = useMemo(() => {
    if (!roomData.showVotes) return null;

    const votes = Object.values(roomData.votes).filter((v): v is VoteValue => v !== null && v !== '?');
    if (votes.length === 0) return { avg: 0, mode: null };

    // Calculate average (excluding ? votes)
    const numericVotes: number[] = votes.map(Number);
    const avg = numericVotes.reduce((a, b) => a + b, 0) / numericVotes.length;

    // Find mode (most common vote)
    const voteCounts: Record<VoteValue, number> = {} as Record<VoteValue, number>;
    let maxCount = 0;
    let mode: VoteValue | null = null;

    for (const vote of Object.values(roomData.votes)) {
      if (vote !== null) {
        voteCounts[vote] = (voteCounts[vote] || 0) + 1;
        if (voteCounts[vote] > maxCount) {
          maxCount = voteCounts[vote];
          mode = vote;
        }
      }
    }

    return { avg: Number.isNaN(avg) ? 'N/A' : avg.toFixed(1), mode };
  }, [roomData.showVotes, roomData.votes]);

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="p-4 bg-blue-600 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold">SprintJam</h1>
            <div className="px-3 py-1 text-sm bg-blue-700 rounded-md">
              Room: {roomData.key}
            </div>
          </div>

          <div className="text-sm">
            {isModeratorView ? 'Moderator View' : 'Team Member View'}
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1">
        {/* Left sidebar - Users */}
        <div className="w-64 p-4 bg-gray-100 border-r">
          <h2 className="mb-4 text-lg font-medium">Participants</h2>
          <ul className="space-y-2">
            {roomData.users.map((user: string) => (
              <li
                key={user} // Use user as key
                className="flex items-center justify-between p-2 bg-white rounded-md shadow-sm"
              >
                <span>
                  {user}
                  {user === roomData.moderator ? ' (Mod)' : ''}
                  {user === name ? ' (You)' : ''} {/* Indicate current user */}
                </span>
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
        <div className="flex flex-col flex-1 p-6">
          {/* Voting area */}
          <div className="mb-8">
            <h2 className="mb-4 text-xl font-semibold">Your Vote</h2>
            <div className="flex flex-wrap gap-3">
              {votingOptions.map((option: VoteValue) => (
                <button
                  type="button"
                  key={option}
                  onClick={() => onVote(option)}
                  className={`w-16 h-24 flex items-center justify-center text-lg font-medium border-2 rounded-lg ${
                    userVote === option
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
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
                    className="px-4 py-2 text-white bg-blue-500 rounded-md hover:bg-blue-600"
                  >
                    {roomData.showVotes ? 'Hide Votes' : 'Show Votes'}
                  </button>
                  <button
                    type="button"
                    onClick={onResetVotes}
                    className="px-4 py-2 text-red-600 bg-white border border-red-500 rounded-md hover:bg-red-50"
                  >
                    Reset Votes
                  </button>
                </div>
              )}
            </div>

            {roomData.showVotes ? (
              <div className="p-6 bg-gray-100 rounded-lg">
                <div className="grid grid-cols-2 gap-6">
                  <div className="p-4 bg-white rounded-lg shadow-sm">
                    <h3 className="mb-2 text-sm font-medium text-gray-500">
                      Average
                    </h3>
                    <p className="text-3xl font-bold text-blue-600">
                      {stats?.avg ?? 'N/A'} {/* Use nullish coalescing */}
                    </p>
                  </div>
                  <div className="p-4 bg-white rounded-lg shadow-sm">
                    <h3 className="mb-2 text-sm font-medium text-gray-500">
                      Most Common
                    </h3>
                    <p className="text-3xl font-bold text-blue-600">
                      {stats?.mode || 'N/A'}
                    </p>
                  </div>
                  {/* Vote distribution visualization could go here */}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center p-12 bg-gray-100 rounded-lg">
                <p className="text-gray-500">
                  {Object.values(roomData.votes).some(v => v !== null) // Check if any non-null votes exist
                    ? 'Votes are hidden. Waiting for moderator to reveal.'
                    : 'No votes yet. Waiting for team members to vote.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomScreen; 