import { useState, useEffect } from 'react';

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
import type { RoomData, VoteValue, WebSocketErrorData } from './types';

import WelcomeScreen from './components/WelcomeScreen';
import CreateRoomScreen from './components/CreateRoomScreen';
import JoinRoomScreen from './components/JoinRoomScreen';
import RoomScreen from './components/RoomScreen';

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
    } catch (err: unknown) {
      // Type guard to safely access error properties
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to create room';
      setError(errorMessage);
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
    } catch (err: unknown) {
      // Type guard to safely access error properties
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to join room';
      setError(errorMessage);
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
    } catch (err: unknown) {
      // Type guard to safely access error properties
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to submit vote';
      setError(errorMessage);
    }
  };

  // Moderator functions
  const handleResetVotes = () => {
    if (roomData.moderator !== name) return;

    try {
      // Reset votes via WebSocket
      resetVotes();
      setUserVote(null);
    } catch (err: unknown) {
      // Type guard to safely access error properties
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to reset votes';
      setError(errorMessage);
    }
  };

  const handleToggleShowVotes = () => {
    if (roomData.moderator !== name) return;

    try {
      // Toggle votes via WebSocket
      toggleShowVotes();
    } catch (err: unknown) {
      // Type guard to safely access error properties
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to toggle vote visibility';
      setError(errorMessage);
    }
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
          <button type="button" onClick={() => setError('')} className="float-right font-bold">X</button>
        </div>
      )}

      {/* Conditionally render screen components */}
      {screen === 'welcome' && (
        <WelcomeScreen
          onCreateRoomClick={() => setScreen('create')}
          onJoinRoomClick={() => setScreen('join')}
        />
      )}
      {screen === 'create' && (
        <CreateRoomScreen
          name={name}
          onNameChange={setName}
          onCreateRoom={handleCreateRoom}
          onBack={() => setScreen('welcome')}
        />
      )}
      {screen === 'join' && (
        <JoinRoomScreen
          name={name}
          roomKey={roomKey}
          onNameChange={setName}
          onRoomKeyChange={setRoomKey}
          onJoinRoom={handleJoinRoom}
          onBack={() => setScreen('welcome')}
        />
      )}
      {screen === 'room' && (
        <RoomScreen
          roomData={roomData}
          name={name}
          isModeratorView={isModeratorView}
          userVote={userVote}
          votingOptions={votingOptions}
          onVote={handleVote}
          onToggleShowVotes={handleToggleShowVotes}
          onResetVotes={handleResetVotes}
        />
      )}
    </div>
  );
};

export default App;
