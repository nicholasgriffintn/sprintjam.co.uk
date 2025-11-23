import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import {
  createRoom,
  joinRoom,
  disconnectFromRoom,
  submitVote,
  toggleShowVotes,
  resetVotes,
  updateSettings,
  isConnected,
  nextTicket,
  addTicket,
  updateTicket,
  deleteTicket,
} from '@/lib/api-service';
import {
  applyRoomMessageToCollections,
  removeRoomFromCollection,
  upsertRoom,
} from '@/lib/data/room-store';
import { useRoomData } from '@/lib/data/hooks';
import { safeLocalStorage } from '@/utils/storage';
import { useServerDefaults } from '@/hooks/useServerDefaults';
import { useAutoReconnect } from '@/hooks/useAutoReconnect';
import { useAutoJiraUpdate } from '@/hooks/useAutoJiraUpdate';
import { useRoomConnection } from '@/hooks/useRoomConnection';
import { useRoomDataSync } from '@/hooks/useRoomDataSync';
import type {
  ErrorConnectionIssue,
  ErrorKind,
  RoomData,
  RoomSettings,
  ServerDefaults,
  StructuredVote,
  TicketQueueItem,
  VoteValue,
  WebSocketMessage,
} from '@/types';
import { AUTH_TOKEN_STORAGE_KEY, ROOM_KEY_STORAGE_KEY } from '@/constants';
import { useSession } from './SessionContext';

interface RoomContextValue {
  serverDefaults: ServerDefaults | null;
  isLoadingDefaults: boolean;
  defaultsError: string | null;
  handleRetryDefaults: () => void;
  isLoading: boolean;
  roomData: RoomData | null;
  activeRoomKey: string | null;
  authToken: string | null;
  isModeratorView: boolean;
  userVote: VoteValue | StructuredVote | null;
  isSocketConnected: boolean;
  isSocketStatusKnown: boolean;
  connectionIssue: ErrorConnectionIssue | null;
  roomError: string;
  roomErrorKind: ErrorKind | null;
  clearRoomError: () => void;
  reportRoomError: (message: string, kind?: ErrorKind | null) => void;
  handleCreateRoom: (settings?: Partial<RoomSettings>) => Promise<void>;
  handleJoinRoom: () => Promise<void>;
  handleLeaveRoom: () => void;
  handleVote: (value: VoteValue | StructuredVote) => void;
  handleToggleShowVotes: () => void;
  handleResetVotes: () => void;
  handleUpdateSettings: (settings: RoomSettings) => void;
  handleNextTicket: () => void;
  handleAddTicket: (ticket: Partial<TicketQueueItem>) => Promise<void>;
  handleUpdateTicket: (
    ticketId: number,
    updates: Partial<TicketQueueItem>
  ) => Promise<void>;
  handleDeleteTicket: (ticketId: number) => Promise<void>;
  retryConnection: () => void;
}

const RoomContext = createContext<RoomContextValue | undefined>(undefined);

export const RoomProvider = ({ children }: { children: ReactNode }) => {
  const {
    screen,
    name,
    roomKey,
    passcode,
    selectedAvatar,
    setRoomKey,
    setScreen,
    setPasscode,
    setError,
    clearError,
  } = useSession();

  const [activeRoomKey, setActiveRoomKey] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(() =>
    safeLocalStorage.get(AUTH_TOKEN_STORAGE_KEY)
  );
  const [userVote, setUserVote] = useState<VoteValue | StructuredVote | null>(
    null
  );
  const [isSocketConnected, setIsSocketConnected] = useState<boolean>(() =>
    isConnected()
  );
  const [isSocketStatusKnown, setIsSocketStatusKnown] = useState<boolean>(() =>
    isConnected()
  );
  const [isModeratorView, setIsModeratorView] = useState<boolean>(false);
  const [roomError, setRoomError] = useState<string>('');
  const [roomErrorKind, setRoomErrorKind] = useState<ErrorKind | null>(null);
  const [connectionIssue, setConnectionIssue] =
    useState<ErrorConnectionIssue | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [reconnectSignal, setReconnectSignal] = useState<number>(0);

  const {
    serverDefaults,
    isLoadingDefaults,
    defaultsError,
    applyServerDefaults,
    handleRetryDefaults,
  } = useServerDefaults();

  const roomData = useRoomData(activeRoomKey);
  const activeRoomKeyRef = useRef<string | null>(null);

  useEffect(() => {
    activeRoomKeyRef.current = activeRoomKey;
  }, [activeRoomKey]);

  useAutoReconnect({
    name,
    screen,
    isLoadingDefaults,
    selectedAvatar,
    onReconnectSuccess: useCallback(
      (roomKeyValue: string, isModerator: boolean) => {
        setActiveRoomKey(roomKeyValue);
        setIsModeratorView(isModerator);
        setScreen('room');
      },
      [setScreen]
    ),
    onReconnectError: useCallback(
      (message: string) => {
        setError(message);
        setConnectionIssue({ type: 'disconnected', message });
      },
      [setError]
    ),
    onLoadingChange: setIsLoading,
    applyServerDefaults,
    onAuthTokenRefresh: setAuthToken,
  });

  const handleRoomMessage = useCallback(
    (message: WebSocketMessage) => {
      if (message.type === 'error') {
        setRoomError(message.error || 'Connection error');
        return;
      }
      void applyRoomMessageToCollections(message, activeRoomKeyRef.current)
        .then((updatedRoom) => {
          if (!activeRoomKeyRef.current && updatedRoom?.key) {
            setActiveRoomKey(updatedRoom.key);
          }
          setRoomError('');
          setRoomErrorKind(null);
        })
        .catch((err) => {
          console.error('Failed to process room message', err);
          setRoomError('Connection update failed');
        });
    },
    [applyRoomMessageToCollections]
  );

  const handleConnectionChange = useCallback((connected: boolean) => {
    setIsSocketConnected(connected);
    setIsSocketStatusKnown(true);
    if (connected) {
      setConnectionIssue(null);
      setRoomErrorKind(null);
    }
  }, []);

  const handleConnectionError = useCallback(
    (
      message: string,
      meta?: { reason?: 'auth' | 'disconnect'; code?: number }
    ) => {
      setRoomError(message);
      if (meta?.reason === 'auth') {
        setConnectionIssue({ type: 'auth', message });
        setRoomErrorKind('permission');
      } else if (meta?.reason === 'disconnect') {
        setConnectionIssue({ type: 'disconnected', message });
      }
    },
    []
  );

  useRoomConnection({
    screen,
    name,
    activeRoomKey,
    authToken,
    onMessage: handleRoomMessage,
    onConnectionChange: handleConnectionChange,
    onError: handleConnectionError,
    reconnectSignal,
  });

  useRoomDataSync({
    roomData,
    name,
    userVote,
    isModeratorView,
    onVoteChange: setUserVote,
    onModeratorViewChange: setIsModeratorView,
  });

  useAutoJiraUpdate({
    roomData,
    userName: name,
    onTicketUpdate: (ticketId, updates) => {
      try {
        updateTicket(ticketId, updates);
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to update Jira metadata';
        setRoomError(errorMessage);
      }
    },
    onError: setRoomError,
  });

  const derivedServerDefaults = useMemo(() => {
    if (serverDefaults) {
      return serverDefaults;
    }

    return null;
  }, [serverDefaults]);

  const clearRoomError = useCallback(() => {
    setRoomError('');
    setRoomErrorKind(null);
    setConnectionIssue(null);
  }, []);

  const reportRoomError = useCallback(
    (message: string, kind: ErrorKind | null = null) => {
      setRoomError(message);
      setRoomErrorKind(kind);
    },
    []
  );

  const handleCreateRoom = useCallback(
    async (settings?: Partial<RoomSettings>) => {
      if (!name || !selectedAvatar) return;

      setIsLoading(true);
      clearError();

      try {
        const {
          room: newRoom,
          defaults,
          authToken: newAuthToken,
        } = await createRoom(
          name,
          passcode || undefined,
          settings,
          selectedAvatar
        );
        await applyServerDefaults(defaults);
        await upsertRoom(newRoom);
        setActiveRoomKey(newRoom.key);
        safeLocalStorage.set(ROOM_KEY_STORAGE_KEY, newRoom.key);
        if (newAuthToken) {
          setAuthToken(newAuthToken);
          safeLocalStorage.set(AUTH_TOKEN_STORAGE_KEY, newAuthToken);
        } else {
          setAuthToken(null);
          safeLocalStorage.remove(AUTH_TOKEN_STORAGE_KEY);
        }
        setIsModeratorView(true);
        setScreen('room');
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to create room';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [
      name,
      selectedAvatar,
      passcode,
      applyServerDefaults,
      clearError,
      setError,
      setScreen,
    ]
  );

  const handleJoinRoom = useCallback(async () => {
    if (!name || !roomKey || !selectedAvatar) return;

    setIsLoading(true);
    clearError();

    try {
      const {
        room: joinedRoom,
        defaults,
        authToken: newAuthToken,
      } = await joinRoom(name, roomKey, passcode || undefined, selectedAvatar);
      await applyServerDefaults(defaults);
      await upsertRoom(joinedRoom);
      setActiveRoomKey(joinedRoom.key);
      safeLocalStorage.set(ROOM_KEY_STORAGE_KEY, joinedRoom.key);
      if (newAuthToken) {
        setAuthToken(newAuthToken);
        safeLocalStorage.set(AUTH_TOKEN_STORAGE_KEY, newAuthToken);
      } else {
        setAuthToken(null);
        safeLocalStorage.remove(AUTH_TOKEN_STORAGE_KEY);
      }
      setIsModeratorView(joinedRoom.moderator === name);
      setScreen('room');
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to join room';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [
    name,
    roomKey,
    passcode,
    selectedAvatar,
    applyServerDefaults,
    clearError,
    setError,
    setScreen,
  ]);

  const handleVote = useCallback(
    (value: VoteValue | StructuredVote) => {
      const previousVote = userVote;
      setUserVote(value);

      try {
        submitVote(value, true);
      } catch (err: unknown) {
        setUserVote(previousVote);
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to submit vote';
        setRoomError(errorMessage);
      }
    },
    [userVote]
  );

  const handleResetVotes = useCallback(() => {
    if (!roomData) {
      return;
    }

    if (
      roomData.moderator !== name &&
      !roomData.settings.allowOthersToDeleteEstimates
    ) {
      setRoomError("You don't have permission to reset votes.");
      setRoomErrorKind('permission');
      return;
    }

    try {
      resetVotes();
      setUserVote(null);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to reset votes';
      setRoomError(errorMessage);
    }
  }, [roomData, name]);

  const handleToggleShowVotes = useCallback(() => {
    if (!roomData) {
      return;
    }

    if (
      roomData.moderator !== name &&
      !roomData.settings.allowOthersToShowEstimates
    ) {
      setRoomError("You don't have permission to show votes.");
      setRoomErrorKind('permission');
      return;
    }

    try {
      toggleShowVotes();
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to toggle vote visibility';
      setRoomError(errorMessage);
    }
  }, [roomData, name]);

  const handleUpdateSettings = useCallback(
    (settings: RoomSettings) => {
      if (!isModeratorView) {
        setRoomError('Only moderators can update settings.');
        setRoomErrorKind('permission');
        return;
      }

      try {
        updateSettings(settings);
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to update settings';
        setRoomError(errorMessage);
      }
    },
    [isModeratorView]
  );

  const handleLeaveRoom = useCallback(() => {
    disconnectFromRoom();
    safeLocalStorage.remove(ROOM_KEY_STORAGE_KEY);
    safeLocalStorage.remove(AUTH_TOKEN_STORAGE_KEY);

    const key = activeRoomKeyRef.current;
    if (key) {
      void removeRoomFromCollection(key).catch((err) => {
        console.error('Failed to remove room from collection', err);
      });
    }
    setActiveRoomKey(null);
    setAuthToken(null);
    setUserVote(null);
    setIsSocketConnected(false);
    setIsSocketStatusKnown(false);
    setIsModeratorView(false);
    setConnectionIssue(null);
    setPasscode('');
    setRoomKey('');
    setScreen('welcome');
  }, [setPasscode, setRoomKey, setScreen]);

  const handleNextTicket = useCallback(() => {
    try {
      nextTicket();
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to move to next ticket';
      setRoomError(errorMessage);
    }
  }, []);

  const handleAddTicket = useCallback(
    async (ticket: Partial<TicketQueueItem>) => {
      try {
        await addTicket(ticket);
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to add ticket';
        setRoomError(errorMessage);
      }
    },
    []
  );

  const handleUpdateTicket = useCallback(
    async (ticketId: number, updates: Partial<TicketQueueItem>) => {
      try {
        await updateTicket(ticketId, updates);
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to update ticket';
        setRoomError(errorMessage);
      }
    },
    []
  );

  const handleDeleteTicket = useCallback(async (ticketId: number) => {
    try {
      await deleteTicket(ticketId);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to delete ticket';
      setRoomError(errorMessage);
    }
  }, []);

  const retryConnection = useCallback(() => {
    setConnectionIssue((current) =>
      current ? { ...current, reconnecting: true } : null
    );
    setReconnectSignal((value) => value + 1);
  }, []);

  const value = useMemo(
    () => ({
      serverDefaults: derivedServerDefaults,
      isLoadingDefaults,
      defaultsError,
      handleRetryDefaults,
      isLoading,
      roomData,
      activeRoomKey,
      authToken,
      isModeratorView,
      userVote,
      isSocketConnected,
      isSocketStatusKnown,
      connectionIssue,
      roomError,
      roomErrorKind,
      clearRoomError,
      reportRoomError,
      handleCreateRoom,
      handleJoinRoom,
      handleLeaveRoom,
      handleVote,
      handleToggleShowVotes,
      handleResetVotes,
      handleUpdateSettings,
      handleNextTicket,
      handleAddTicket,
      handleUpdateTicket,
      handleDeleteTicket,
      retryConnection,
    }),
    [
      derivedServerDefaults,
      isLoadingDefaults,
      defaultsError,
      handleRetryDefaults,
      isLoading,
      roomData,
      activeRoomKey,
      authToken,
      isModeratorView,
      userVote,
      isSocketConnected,
      isSocketStatusKnown,
      connectionIssue,
      roomError,
      roomErrorKind,
      clearRoomError,
      reportRoomError,
      handleCreateRoom,
      handleJoinRoom,
      handleLeaveRoom,
      handleVote,
      handleToggleShowVotes,
      handleResetVotes,
      handleUpdateSettings,
      handleNextTicket,
      handleAddTicket,
      handleUpdateTicket,
      handleDeleteTicket,
      retryConnection,
    ]
  );

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
};

export const useRoom = (): RoomContextValue => {
  const ctx = useContext(RoomContext);
  if (!ctx) {
    throw new Error('useRoom must be used within RoomProvider');
  }
  return ctx;
};
