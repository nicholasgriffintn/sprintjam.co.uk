import { useState, useEffect, type ChangeEvent } from 'react';

import {
  createRoom,
  joinRoom,
  connectToRoom,
  disconnectFromRoom,
  submitVote,
  toggleShowVotes,
  resetVotes,
  addEventListener,
  removeEventListener,
} from './lib/api-service';

// Type definitions
interface RoomData {
  key: string;
  users: string[];
  votes: Record<string, VoteValue | null>; // Map username to their vote
  showVotes: boolean;
  moderator: string;
}

type VoteValue = '1' | '2' | '3' | '5' | '8' | '13' | '21' | '?';

interface RoomStats {
  avg: number | string; // Can be number or string 'N/A'
  mode: VoteValue | null;
}

// WebSocket event data type (assuming structure based on usage)
interface WebSocketErrorData {
  error?: string;
  message?: string; // Adding message as it's used in catch blocks
}

const App = () => {
  // App state
  const [name, setName] = useState<string>('');
  const [roomKey, setRoomKey] = useState<string>('');
  const [screen, setScreen] = useState<'welcome' | 'create' | 'join' | 'room'>('welcome');
  const [roomData, setRoomData] = useState<RoomData>({
    key: '',
    users: [],
    votes: {},
    showVotes: false,
    moderator: '',
  });
  const [userVote, setUserVote] = useState<VoteValue | null>(null);
  const [isModeratorView, setIsModeratorView] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Fibonacci sequence values for voting
  const votingOptions: VoteValue[] = ['1', '2', '3', '5', '8', '13', '21', '?'];

  // Connect to WebSocket when entering a room
  useEffect(() => {
    if (screen === 'room' && name && roomData.key) {
      // Setup WebSocket connection
      connectToRoom(roomData.key, name, handleRoomUpdate);

      // Add error event listener
      const errorHandler = (data: WebSocketErrorData) => {
        setError(data.error || 'Connection error');
      };

      addEventListener('disconnected', errorHandler);

      // Cleanup on unmount
      return () => {
        disconnectFromRoom();
        removeEventListener('disconnected', errorHandler);
      };
    }
  }, [screen, name, roomData.key]);

  // Handle WebSocket room updates
  const handleRoomUpdate = (updatedRoomData: RoomData) => {
    setRoomData(updatedRoomData);

    // Update vote selection if our vote is reflected
    if (updatedRoomData.votes && updatedRoomData.votes[name] !== undefined) {
      setUserVote(updatedRoomData.votes[name] ?? null);
    }

    // Check if I am the moderator
    setIsModeratorView(updatedRoomData.moderator === name);

    // Clear any existing errors
    setError('');
  };

  // Handle creating a new room
  const handleCreateRoom = async () => {
    if (!name) return;

    setIsLoading(true);
    setError('');

    try {
      // Call the API to create a new room
      const newRoom: RoomData = await createRoom(name);

      setRoomData(newRoom);
      setIsModeratorView(true);
      setScreen('room');
    } catch (err: any) {
      setError(err.message || 'Failed to create room');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle joining an existing room
  const handleJoinRoom = async () => {
    if (!name || !roomKey) return;

    setIsLoading(true);
    setError('');

    try {
      // Call the API to join an existing room
      const joinedRoom: RoomData = await joinRoom(name, roomKey);

      setRoomData(joinedRoom);
      setIsModeratorView(joinedRoom.moderator === name);
      setScreen('room');
    } catch (err: any) {
      setError(err.message || 'Failed to join room');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle vote submission
  const handleVote = (value: VoteValue) => {
    // Update local state immediately for responsiveness
    setUserVote(value);

    try {
      // Send the vote to the server via WebSocket
      submitVote(value);
    } catch (err: any) {
      setError(err.message || 'Failed to submit vote');
    }
  };

  // Moderator functions
  const handleResetVotes = () => {
    if (roomData.moderator !== name) return;

    try {
      // Reset votes via WebSocket
      resetVotes();
      setUserVote(null);
    } catch (err: any) {
      setError(err.message || 'Failed to reset votes');
    }
  };

  const handleToggleShowVotes = () => {
    if (roomData.moderator !== name) return;

    try {
      // Toggle votes via WebSocket
      toggleShowVotes();
    } catch (err: any) {
      setError(err.message || 'Failed to toggle vote visibility');
    }
  };

  // Calculate voting statistics when votes are shown
  const calculateStats = (): RoomStats | null => {
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

    // Include null votes potentially if they exist in roomData.votes before filtering
    Object.values(roomData.votes).forEach((vote) => {
      if (vote !== null) { // Check for null before counting
        voteCounts[vote] = (voteCounts[vote] || 0) + 1;
        if (voteCounts[vote] > maxCount) {
          maxCount = voteCounts[vote];
          mode = vote;
        }
      }
    });

    return { avg: avg.toFixed(1), mode };
  };

  // Render welcome screen
  const renderWelcome = () => (
    <div className="flex flex-col items-center justify-center p-8 space-y-6">
      <h1 className="text-3xl font-bold text-blue-600">Welcome to SprintJam</h1>
      <p className="text-gray-600">
        Collaborative planning poker for agile teams
      </p>

      <div className="flex flex-col space-y-4">
        <button
          onClick={() => setScreen('create')}
          className="px-6 py-2 text-white bg-blue-500 rounded-md hover:bg-blue-600"
        >
          Create Room
        </button>
        <button
          onClick={() => setScreen('join')}
          className="px-6 py-2 text-blue-500 bg-white border border-blue-500 rounded-md hover:bg-blue-50"
        >
          Join Room
        </button>
      </div>
    </div>
  );

  // Render create room screen
  const renderCreateRoom = () => (
    <div className="flex flex-col items-center justify-center p-8 space-y-6">
      <h1 className="text-2xl font-bold text-blue-600">Create New Room</h1>

      <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-md">
        <div className="mb-4">
          <label className="block mb-2 text-sm font-medium text-gray-700">
            Your Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter your name"
          />
        </div>

        <div className="flex space-x-3">
          <button
            onClick={() => setScreen('welcome')}
            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
          >
            Back
          </button>
          <button
            onClick={handleCreateRoom}
            disabled={!name}
            className={`flex-1 px-4 py-2 text-white rounded-md ${
              name
                ? 'bg-blue-500 hover:bg-blue-600'
                : 'bg-blue-300 cursor-not-allowed'
            }`}
          >
            Create Room
          </button>
        </div>
      </div>
    </div>
  );

  // Render join room screen
  const renderJoinRoom = () => (
    <div className="flex flex-col items-center justify-center p-8 space-y-6">
      <h1 className="text-2xl font-bold text-blue-600">Join Existing Room</h1>

      <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-md">
        <div className="mb-4">
          <label className="block mb-2 text-sm font-medium text-gray-700">
            Your Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter your name"
          />
        </div>

        <div className="mb-4">
          <label className="block mb-2 text-sm font-medium text-gray-700">
            Room Key
          </label>
          <input
            type="text"
            value={roomKey}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setRoomKey(e.target.value.toUpperCase())}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter room key"
          />
        </div>

        <div className="flex space-x-3">
          <button
            onClick={() => setScreen('welcome')}
            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
          >
            Back
          </button>
          <button
            onClick={handleJoinRoom}
            disabled={!name || !roomKey}
            className={`flex-1 px-4 py-2 text-white rounded-md ${
              name && roomKey
                ? 'bg-blue-500 hover:bg-blue-600'
                : 'bg-blue-300 cursor-not-allowed'
            }`}
          >
            Join Room
          </button>
        </div>
      </div>
    </div>
  );

  // Render room screen
  const renderRoom = () => {
    const stats: RoomStats | null = calculateStats();

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
              {roomData.users.map((user: string, index: number) => (
                <li
                  key={index}
                  className="flex items-center justify-between p-2 bg-white rounded-md shadow-sm"
                >
                  <span>
                    {user}
                    {user === roomData.moderator ? ' (Mod)' : ''}
                  </span>
                  {roomData.votes[user] && (
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
                    key={option}
                    onClick={() => handleVote(option)}
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
                      onClick={handleToggleShowVotes}
                      className="px-4 py-2 text-white bg-blue-500 rounded-md hover:bg-blue-600"
                    >
                      {roomData.showVotes ? 'Hide Votes' : 'Show Votes'}
                    </button>
                    <button
                      onClick={handleResetVotes}
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
                        {stats?.avg || '0'}
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
                    {Object.keys(roomData.votes).length > 0
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

  // Main render logic
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Loading Indicator */}
      {isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="p-4 text-white bg-blue-600 rounded-lg">Loading...</div>
        </div>
      )}

      {/* Error Display (Global) */}
      {error && screen !== 'room' && ( // Only show global error if not in room screen (room has its own)
        <div className="absolute top-0 left-0 right-0 p-3 m-4 bg-red-100 text-red-700 border border-red-300 rounded-md shadow-lg">
          {error}
          <button onClick={() => setError('')} className="float-right font-bold">X</button>
        </div>
      )}

      {screen === 'welcome' && renderWelcome()}
      {screen === 'create' && renderCreateRoom()}
      {screen === 'join' && renderJoinRoom()}
      {screen === 'room' && renderRoom()}
    </div>
  );
};

export default App;
