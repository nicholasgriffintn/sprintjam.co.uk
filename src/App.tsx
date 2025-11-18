import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { MotionConfig } from 'framer-motion';

import {
  createRoom,
  joinRoom,
  disconnectFromRoom,
  submitVote,
  toggleShowVotes,
  resetVotes,
  updateSettings,
  isConnected,
} from './lib/api-service';
import {
  applyRoomMessageToCollections,
  removeRoomFromCollection,
  setRoomJiraTicket,
  upsertRoom,
} from './lib/data/room-store';
import { useRoomData } from './lib/data/hooks';
import type {
  VoteValue,
  RoomSettings,
  JiraTicket,
  StructuredVote,
  WebSocketMessage,
  AvatarId,
} from './types';
import { safeLocalStorage } from './utils/storage';
import { useServerDefaults } from './hooks/useServerDefaults';
import { useUrlParams } from './hooks/useUrlParams';
import { useAutoReconnect } from './hooks/useAutoReconnect';
import { useUserPersistence } from './hooks/useUserPersistence';
import { useAutoJiraUpdate } from './hooks/useAutoJiraUpdate';
import { useRoomConnection } from './hooks/useRoomConnection';
import { useRoomDataSync } from './hooks/useRoomDataSync';
import ErrorBanner from './components/ui/ErrorBanner';
import LoadingOverlay from './components/LoadingOverlay';
import { ScreenLoader } from './components/layout/ScreenLoader';
import { ErrorBoundary } from './components/ErrorBoundary';
import WelcomeScreen from './routes/WelcomeScreen';
import CreateRoomScreen from './routes/CreateRoomScreen';
import JoinRoomScreen from './routes/JoinRoomScreen';
import NotFoundScreen from './routes/NotFoundScreen';

const RoomScreen = lazy(() => import('./routes/RoomScreen'));

type AppScreen = 'welcome' | 'create' | 'join' | 'room';

const App = () => {
  const [name, setName] = useState<string>('');
  const [roomKey, setRoomKey] = useState<string>('');
  const [passcode, setPasscode] = useState<string>('');
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarId | null>(null);
  const [screen, setScreen] = useState<AppScreen>('welcome');
  const [activeRoomKey, setActiveRoomKey] = useState<string | null>(null);
  const [userVote, setUserVote] = useState<VoteValue | StructuredVote | null>(
    null
  );
  const [isSocketConnected, setIsSocketConnected] = useState<boolean>(() =>
    isConnected()
  );
  const [isModeratorView, setIsModeratorView] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const roomData = useRoomData(activeRoomKey);
  const activeRoomKeyRef = useRef<string | null>(null);

  const {
    serverDefaults,
    isLoadingDefaults,
    defaultsError,
    applyServerDefaults,
    handleRetryDefaults,
  } = useServerDefaults();

  useEffect(() => {
    activeRoomKeyRef.current = activeRoomKey;
  }, [activeRoomKey]);

  useUrlParams({
    onJoinRoom: (joinRoomKey) => {
      setRoomKey(joinRoomKey);
      setScreen('join');
    },
  });

  useAutoReconnect({
    name,
    screen,
    isLoadingDefaults,
    selectedAvatar,
    onReconnectSuccess: (roomKey, isModerator) => {
      setActiveRoomKey(roomKey);
      setIsModeratorView(isModerator);
      setScreen('room');
    },
    onReconnectError: setError,
    onLoadingChange: setIsLoading,
    applyServerDefaults,
  });

  const handleRoomMessage = useCallback((message: WebSocketMessage) => {
    if (message.type === 'error') {
      setError(message.error || 'Connection error');
      return;
    }
    void applyRoomMessageToCollections(message, activeRoomKeyRef.current)
      .then((updatedRoom) => {
        if (!activeRoomKeyRef.current && updatedRoom?.key) {
          setActiveRoomKey(updatedRoom.key);
        }
        setError('');
      })
      .catch((err) => {
        console.error('Failed to process room message', err);
        setError('Connection update failed');
      });
  }, []);

  useRoomConnection({
    screen,
    name,
    activeRoomKey,
    onMessage: handleRoomMessage,
    onConnectionChange: setIsSocketConnected,
    onError: setError,
  });

  useRoomDataSync({
    roomData,
    name,
    userVote,
    isModeratorView,
    onVoteChange: setUserVote,
    onModeratorViewChange: setIsModeratorView,
  });

  useUserPersistence({
    name,
    onNameLoaded: setName,
  });

  const handleCreateRoom = async (settings?: Partial<RoomSettings>) => {
    if (!name || !selectedAvatar) return;

    setIsLoading(true);
    setError('');

    try {
      const { room: newRoom, defaults } = await createRoom(
        name,
        passcode || undefined,
        settings,
        selectedAvatar
      );
      await applyServerDefaults(defaults);
      await upsertRoom(newRoom);
      setActiveRoomKey(newRoom.key);
      safeLocalStorage.set('sprintjam_roomKey', newRoom.key);
      setIsModeratorView(true);
      setScreen('room');
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to create room';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!name || !roomKey || !selectedAvatar) return;

    setIsLoading(true);
    setError('');

    try {
      const { room: joinedRoom, defaults } = await joinRoom(
        name,
        roomKey,
        passcode || undefined,
        selectedAvatar
      );
      await applyServerDefaults(defaults);
      await upsertRoom(joinedRoom);
      setActiveRoomKey(joinedRoom.key);
      safeLocalStorage.set('sprintjam_roomKey', joinedRoom.key);
      setIsModeratorView(joinedRoom.moderator === name);
      setScreen('room');
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to join room';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVote = (value: VoteValue | StructuredVote) => {
    const previousVote = userVote;
    setUserVote(value);

    try {
      submitVote(value, true);
    } catch (err: unknown) {
      setUserVote(previousVote);
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to submit vote';
      setError(errorMessage);
    }
  };

  const handleResetVotes = () => {
    if (!roomData) {
      return;
    }

    if (
      roomData.moderator !== name &&
      !roomData.settings.allowOthersToDeleteEstimates
    ) {
      return;
    }

    try {
      resetVotes();
      setUserVote(null);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to reset votes';
      setError(errorMessage);
    }
  };

  const handleToggleShowVotes = () => {
    if (!roomData) {
      return;
    }

    if (
      roomData.moderator !== name &&
      !roomData.settings.allowOthersToShowEstimates
    ) {
      return;
    }

    try {
      toggleShowVotes();
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to toggle vote visibility';
      setError(errorMessage);
    }
  };

  const handleUpdateSettings = (settings: RoomSettings) => {
    if (!isModeratorView) {
      return;
    }

    try {
      updateSettings(settings);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to update settings';
      setError(errorMessage);
    }
  };

  const handleJiraTicketFetched = (ticket: JiraTicket | undefined) => {
    const key = activeRoomKeyRef.current;
    if (!key) {
      return;
    }
    void setRoomJiraTicket(key, ticket).catch((error) => {
      console.error('Failed to update Jira ticket from fetch', error);
    });
  };

  const handleJiraTicketUpdated = (ticket: JiraTicket) => {
    const key = activeRoomKeyRef.current;
    if (!key) {
      return;
    }
    void setRoomJiraTicket(key, ticket).catch((error) => {
      console.error('Failed to apply Jira ticket update', error);
    });
  };

  useAutoJiraUpdate({
    roomData,
    name,
    onJiraTicketUpdated: handleJiraTicketUpdated,
    onError: setError,
  });

  const handleLeaveRoom = () => {
    disconnectFromRoom();
    safeLocalStorage.remove('sprintjam_roomKey');

    const key = activeRoomKeyRef.current;
    if (key) {
      void removeRoomFromCollection(key).catch((error) => {
        console.error('Failed to remove room from collection', error);
      });
    }
    setActiveRoomKey(null);
    setUserVote(null);
    setIsModeratorView(false);
    setScreen('welcome');
  };

  const clearError = () => setError('');

  const renderScreen = () => {
    switch (screen) {
      case 'welcome':
        return (
          <WelcomeScreen
            onCreateRoom={() => {
              setPasscode('');
              setScreen('create');
            }}
            onJoinRoom={() => {
              setPasscode('');
              setScreen('join');
            }}
          />
        );
      case 'create':
        return (
          <CreateRoomScreen
            name={name}
            passcode={passcode}
            selectedAvatar={selectedAvatar}
            onNameChange={setName}
            onPasscodeChange={setPasscode}
            onAvatarChange={setSelectedAvatar}
            onCreateRoom={handleCreateRoom}
            onBack={() => {
              setPasscode('');
              setScreen('welcome');
            }}
            error={error}
            onClearError={clearError}
            defaultSettings={serverDefaults?.roomSettings}
          />
        );
      case 'join':
        return (
          <JoinRoomScreen
            name={name}
            roomKey={roomKey}
            passcode={passcode}
            selectedAvatar={selectedAvatar}
            onNameChange={setName}
            onRoomKeyChange={setRoomKey}
            onPasscodeChange={setPasscode}
            onAvatarChange={setSelectedAvatar}
            onJoinRoom={handleJoinRoom}
            onBack={() => {
              setPasscode('');
              setScreen('welcome');
            }}
            error={error}
            onClearError={clearError}
          />
        );
      case 'room':
        if (roomData && serverDefaults) {
          return (
            <RoomScreen
              roomData={roomData}
              name={name}
              isModeratorView={isModeratorView}
              userVote={userVote}
              votingOptions={roomData.settings.estimateOptions as VoteValue[]}
              serverDefaults={serverDefaults}
              onVote={handleVote}
              onToggleShowVotes={handleToggleShowVotes}
              onResetVotes={handleResetVotes}
              onUpdateSettings={handleUpdateSettings}
              onJiraTicketFetched={handleJiraTicketFetched}
              onJiraTicketUpdated={handleJiraTicketUpdated}
              onLeaveRoom={handleLeaveRoom}
              error={error}
              onClearError={clearError}
              isConnected={isSocketConnected}
            />
          );
        }

        return (
          <ScreenLoader title="Loading room" subtitle="Please wait a moment." />
        );
      default:
        return <NotFoundScreen />;
    }
  };

  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error('App Error Boundary:', error, errorInfo);
      }}
    >
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        {(isLoading || isLoadingDefaults) && <LoadingOverlay />}

        {defaultsError && (
          <div className="max-w-2xl mx-auto mt-4 px-4">
            <div className="bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 border border-yellow-200 dark:border-yellow-700 rounded-md p-3 flex items-start justify-between gap-4">
              <span>Unable to load server defaults. {defaultsError}</span>
              <button
                type="button"
                onClick={handleRetryDefaults}
                className="text-sm font-medium underline"
                disabled={isLoadingDefaults}
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {error && screen !== 'room' && (
          <ErrorBanner message={error} onClose={clearError} />
        )}

        <MotionConfig reducedMotion="user">
          <Suspense fallback={<ScreenLoader />}>{renderScreen()}</Suspense>
        </MotionConfig>
      </div>
    </ErrorBoundary>
  );
};

export default App;
