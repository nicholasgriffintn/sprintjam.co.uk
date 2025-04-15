import { useState, useEffect, useCallback, useRef } from 'react';

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
  isConnected,
  type WebSocketMessageType
} from './lib/api-service';
import type { RoomData, VoteValue, WebSocketErrorData } from './types';

import WelcomeScreen from './components/WelcomeScreen';
import CreateRoomScreen from './components/CreateRoomScreen';
import JoinRoomScreen from './components/JoinRoomScreen';
import RoomScreen from './components/RoomScreen';
import ErrorBanner from './components/ErrorBanner';
import LoadingOverlay from './components/LoadingOverlay';

type AppScreen = 'welcome' | 'create' | 'join' | 'room';

// Fibonacci sequence values for voting
const VOTING_OPTIONS: VoteValue[] = ['1', '2', '3', '5', '8', '13', '21', '?'];

const App = () => {
  // App state
  const [name, setName] = useState<string>('');
  const [roomKey, setRoomKey] = useState<string>('');
  const [screen, setScreen] = useState<AppScreen>('welcome');
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

  const didLoadName = useRef(false);

  // Memoize the room update handler to prevent unnecessary re-renders
  const handleRoomUpdate = useCallback((updatedRoomData: RoomData) => {
    setRoomData(updatedRoomData);

    // Update vote selection if our vote is reflected
    if (updatedRoomData.votes && updatedRoomData.votes[name] !== undefined) {
      setUserVote(updatedRoomData.votes[name]);
    }

    // Check if I am the moderator
    setIsModeratorView(updatedRoomData.moderator === name);

    // Clear any existing errors
    setError('');
  }, [name]);

  // Connect to WebSocket when entering a room
  useEffect(() => {
    if (screen === 'room' && name && roomData.key) {
      // Setup WebSocket connection
      connectToRoom(roomData.key, name, handleRoomUpdate);

      // Add error event listener
      const errorHandler = (data: WebSocketErrorData) => {
        setError(data.error || 'Connection error');
      };

      const eventTypes: WebSocketMessageType[] = ['disconnected', 'error'];
      
      // Add event listeners
      for (const type of eventTypes) {
        addEventListener(type, errorHandler);
      }

      // Cleanup on unmount
      return () => {
        disconnectFromRoom();
        for (const type of eventTypes) {
          removeEventListener(type, errorHandler);
        }
      };
    }
  }, [screen, name, roomData.key, handleRoomUpdate]);

  // Persist user name in localStorage (Combined Load & Save)
  useEffect(() => {
    // Load ONLY on initial mount
    if (!didLoadName.current) {
      const savedName = localStorage.getItem('sprintjam_username');
      if (savedName) {
        setName(savedName);
      }
      didLoadName.current = true; // Mark as loaded
      // No need to proceed to saving logic on initial load
      return;
    }

    // Save name when it changes (debounced), skip initial empty state save
    if (name === '' && !localStorage.getItem('sprintjam_username')) {
      // Avoid saving empty string initially if nothing was loaded
      return;
    }

    const saveTimeout = setTimeout(() => {
      localStorage.setItem('sprintjam_username', name);
    }, 500);

    return () => clearTimeout(saveTimeout);
  }, [name]); // Depend only on name

  // Handle creating a new room
  const handleCreateRoom = async () => {
    if (!name) return;

    setIsLoading(true);
    setError('');

    try {
      // Call the API to create a new room
      const newRoom = await createRoom(name);

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
      const joinedRoom = await joinRoom(name, roomKey);

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

  // Handle navigation
  const navigateTo = (targetScreen: AppScreen) => {
    setScreen(targetScreen);
    setError('');
  };

  // Clear error message
  const clearError = () => setError('');

  // Main render logic
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Loading Indicator */}
      {isLoading && <LoadingOverlay />}

      {/* Error Display (Global) */}
      {error && screen !== 'room' && (
        <ErrorBanner message={error} onClose={clearError} />
      )}

      {/* Conditionally render screen components */}
      {screen === 'welcome' && (
        <WelcomeScreen
          onCreateRoomClick={() => navigateTo('create')}
          onJoinRoomClick={() => navigateTo('join')}
        />
      )}
      {screen === 'create' && (
        <CreateRoomScreen
          name={name}
          onNameChange={(newName: string) => {
            setName(newName);
          }}
          onCreateRoom={handleCreateRoom}
          onBack={() => navigateTo('welcome')}
        />
      )}
      {screen === 'join' && (
        <JoinRoomScreen
          name={name}
          roomKey={roomKey}
          onNameChange={setName}
          onRoomKeyChange={(key) => setRoomKey(key.toUpperCase())}
          onJoinRoom={handleJoinRoom}
          onBack={() => navigateTo('welcome')}
        />
      )}
      {screen === 'room' && (
        <RoomScreen
          roomData={roomData}
          name={name}
          isModeratorView={isModeratorView}
          userVote={userVote}
          votingOptions={VOTING_OPTIONS}
          onVote={handleVote}
          onToggleShowVotes={handleToggleShowVotes}
          onResetVotes={handleResetVotes}
          error={error}
          onClearError={clearError}
          isConnected={isConnected()}
        />
      )}
    </div>
  );
};

export default App;