import { useCallback, useEffect, useRef, useState } from 'react';

import {
  createRoom,
  joinRoom,
  connectToRoom,
  disconnectFromRoom,
  submitVote,
  toggleShowVotes,
  resetVotes,
  updateSettings,
  addEventListener,
  removeEventListener,
  isConnected,
  fetchDefaultSettings,
  getCachedDefaultSettings,
} from './lib/api-service';
import { updateJiraStoryPoints } from './lib/jira-service';
import {
  serverDefaultsCollection,
  ensureServerDefaultsCollectionReady,
} from './lib/data/collections';
import {
  applyRoomMessageToCollections,
  removeRoomFromCollection,
  setRoomJiraTicket,
  upsertRoom,
} from './lib/data/room-store';
import { useRoomData, useServerDefaults } from './lib/data/hooks';
import type {
  VoteValue,
  WebSocketErrorData,
  RoomSettings,
  JiraTicket,
  StructuredVote,
  ServerDefaults,
  WebSocketMessage,
  WebSocketMessageType,
  AvatarId,
} from './types';
import { cloneServerDefaults } from './utils/settings';
import WelcomeScreen from './routes/WelcomeScreen';
import CreateRoomScreen from './routes/CreateRoomScreen';
import JoinRoomScreen from './routes/JoinRoomScreen';
import RoomScreen from './routes/RoomScreen';
import ErrorBanner from './components/ErrorBanner';
import LoadingOverlay from './components/LoadingOverlay';

type AppScreen = 'welcome' | 'create' | 'join' | 'room';

const App = () => {
  const cachedDefaults = getCachedDefaultSettings();

  const [serverDefaults, setServerDefaults] = useState<ServerDefaults | null>(
    () => (cachedDefaults ? cloneServerDefaults(cachedDefaults) : null)
  );
  const [name, setName] = useState<string>('');
  const [roomKey, setRoomKey] = useState<string>('');
  const [passcode, setPasscode] = useState<string>('');
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarId | null>(null);
  const [screen, setScreen] = useState<AppScreen>('welcome');
  const [activeRoomKey, setActiveRoomKey] = useState<string | null>(null);
  const [userVote, setUserVote] = useState<VoteValue | StructuredVote | null>(
    null
  );
  const [isModeratorView, setIsModeratorView] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoadingDefaults, setIsLoadingDefaults] = useState<boolean>(
    !cachedDefaults
  );
  const [defaultsError, setDefaultsError] = useState<string | null>(null);
  const serverDefaultsFromCollection = useServerDefaults();
  const roomData = useRoomData(activeRoomKey);
  const activeRoomKeyRef = useRef<string | null>(null);

  const applyServerDefaults = useCallback(async (defaults?: ServerDefaults) => {
    if (!defaults) {
      return;
    }

    await ensureServerDefaultsCollectionReady();
    serverDefaultsCollection.utils.writeUpsert(defaults);
    setDefaultsError(null);
  }, []);

  const loadDefaults = useCallback(async (forceRefresh = false) => {
    setIsLoadingDefaults(true);
    try {
      await fetchDefaultSettings(forceRefresh);
      setDefaultsError(null);
    } catch (err) {
      console.error('Failed to load default settings', err);
      const message =
        err instanceof Error
          ? err.message
          : 'Unable to load default settings from server';
      setDefaultsError(message);
    } finally {
      setIsLoadingDefaults(false);
    }
  }, []);

  const handleRetryDefaults = useCallback(() => {
    loadDefaults(true);
  }, [loadDefaults]);

  useEffect(() => {
    if (!cachedDefaults) {
      loadDefaults();
    }
  }, [cachedDefaults, loadDefaults]);

  useEffect(() => {
    if (serverDefaultsFromCollection) {
      setServerDefaults(cloneServerDefaults(serverDefaultsFromCollection));
    } else {
      setServerDefaults(null);
    }
  }, [serverDefaultsFromCollection]);

  useEffect(() => {
    activeRoomKeyRef.current = activeRoomKey;
  }, [activeRoomKey]);

  const didLoadName = useRef(false);
  const didCheckUrlParams = useRef(false);
  const didAttemptRestore = useRef(false);

  // Join room from URL parameters
  useEffect(() => {
    if (didCheckUrlParams.current) return;

    didCheckUrlParams.current = true;

    try {
      const url = new URL(window.location.href);
      const joinParam = url.searchParams.get('join');

      if (joinParam && joinParam.length > 0) {
        setRoomKey(joinParam.toUpperCase());
        setScreen('join');

        window.history.replaceState({}, document.title, '/');
      }
    } catch (err) {
      console.error('Failed to parse URL parameters', err);
    }
  }, []);

  // Auto-reconnect to last room on refresh
  useEffect(() => {
    if (didAttemptRestore.current) return;
    if (screen !== 'welcome') return;
    if (!name) return;
    if (isLoadingDefaults) return;
    didAttemptRestore.current = true;
    const savedRoomKey = localStorage.getItem('sprintjam_roomKey');
    if (savedRoomKey) {
      setIsLoading(true);
      const avatarToUse = selectedAvatar || 'user';
      joinRoom(name, savedRoomKey, undefined, avatarToUse)
        .then(async ({ room: joinedRoom, defaults }) => {
          await applyServerDefaults(defaults);
          await upsertRoom(joinedRoom);
          setActiveRoomKey(joinedRoom.key);
          localStorage.setItem('sprintjam_roomKey', joinedRoom.key);
          setIsModeratorView(joinedRoom.moderator === name);
          setScreen('room');
        })
        .catch((err) => {
          const errorMessage =
            err instanceof Error ? err.message : 'Failed to reconnect to room';
          setError(errorMessage);
          localStorage.removeItem('sprintjam_roomKey');
        })
        .finally(() => setIsLoading(false));
    }
  }, [name, screen, isLoadingDefaults, selectedAvatar, applyServerDefaults]);

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

  // Connect to WebSocket when entering a room
  useEffect(() => {
    if (screen === 'room' && name && activeRoomKey) {
      connectToRoom(activeRoomKey, name, handleRoomMessage);

      const errorHandler = (data: WebSocketErrorData) => {
        setError(data.error || 'Connection error');
      };

      const eventTypes: WebSocketMessageType[] = ['disconnected', 'error'];

      for (const type of eventTypes) {
        addEventListener(type, errorHandler);
      }

      return () => {
        disconnectFromRoom();
        for (const type of eventTypes) {
          removeEventListener(type, errorHandler);
        }
      };
    }
  }, [screen, name, activeRoomKey, handleRoomMessage]);

  useEffect(() => {
    if (!roomData) {
      if (userVote !== null) {
        setUserVote(null);
      }
      if (isModeratorView !== false) {
        setIsModeratorView(false);
      }
      return;
    }

    const nextVote = roomData.votes[name] ?? null;
    if (nextVote !== userVote) {
      setUserVote(nextVote);
    }

    const nextModeratorView = roomData.moderator === name;
    if (nextModeratorView !== isModeratorView) {
      setIsModeratorView(nextModeratorView);
    }
  }, [roomData, name, userVote, isModeratorView]);
  // Persist user name in localStorage
  useEffect(() => {
    if (!didLoadName.current) {
      const savedName = localStorage.getItem('sprintjam_username');
      if (savedName) {
        setName(savedName);
      }
      didLoadName.current = true;
      return;
    }

    if (name === '' && !localStorage.getItem('sprintjam_username')) {
      return;
    }

    const saveTimeout = setTimeout(() => {
      localStorage.setItem('sprintjam_username', name);
    }, 500);

    return () => clearTimeout(saveTimeout);
  }, [name]);

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
      localStorage.setItem('sprintjam_roomKey', newRoom.key);
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
      localStorage.setItem('sprintjam_roomKey', joinedRoom.key);
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
    setUserVote(value);

    try {
      submitVote(value);
    } catch (err: unknown) {
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

  // Auto-update Jira story points if setting is enabled
  // biome-ignore lint/correctness/useExhaustiveDependencies: handleJiraTicketUpdated is stable and doesn't need to be in deps
  useEffect(() => {
    if (!roomData) return;
    if (
      roomData.settings.enableJiraIntegration &&
      roomData.settings.autoUpdateJiraStoryPoints &&
      roomData.jiraTicket &&
      roomData.judgeScore !== null &&
      roomData.showVotes
    ) {
      const storyPoint =
        typeof roomData.judgeScore === 'number'
          ? roomData.judgeScore
          : Number(roomData.judgeScore);

      if (!Number.isNaN(storyPoint)) {
        updateJiraStoryPoints(roomData.jiraTicket.key, storyPoint, {
          roomKey: roomData.key,
          userName: name,
        })
          .then((updatedTicket) => {
            handleJiraTicketUpdated(updatedTicket);
          })
          .catch((err) => {
            const errorMessage =
              err instanceof Error
                ? err.message
                : 'Failed to auto-update Jira story points';
            setError(errorMessage);
          });
      }
    }
  }, [roomData, name]);

  const handleLeaveRoom = () => {
    disconnectFromRoom();
    localStorage.removeItem('sprintjam_roomKey');

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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
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

      {screen === 'welcome' ? (
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
      ) : screen === 'create' ? (
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
      ) : screen === 'join' ? (
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
      ) : screen === 'room' && roomData && serverDefaults ? (
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
          isConnected={isConnected()}
        />
      ) : screen === 'room' ? (
        <div className="p-6 text-center text-gray-600 dark:text-gray-400">
          Loading room data&hellip;
        </div>
      ) : (
        <div>
          <h1>404</h1>
          <p>Page not found</p>
        </div>
      )}
    </div>
  );
};

export default App;
