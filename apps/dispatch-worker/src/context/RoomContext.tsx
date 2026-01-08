import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  createRoom,
  joinRoom,
  disconnectFromRoom,
  submitVote,
  toggleShowVotes,
  toggleSpectatorMode,
  resetVotes,
  updateSettings,
  isConnected,
  selectTicket,
  nextTicket,
  addTicket,
  updateTicket,
  deleteTicket,
} from "@/lib/api-service";
import {
  applyRoomMessageToCollections,
  removeRoomFromCollection,
  upsertRoom,
} from "@/lib/data/room-store";
import { useRoomData } from "@/lib/data/hooks";
import { safeLocalStorage } from "@/utils/storage";
import { useServerDefaults } from "@/hooks/useServerDefaults";
import { useAutoReconnect } from "@/hooks/useAutoReconnect";
import { useAutoEstimateUpdate } from "@/hooks/useAutoEstimateUpdate";
import { useRoomConnection } from "@/hooks/useRoomConnection";
import { useRoomDataSync } from "@/hooks/useRoomDataSync";
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
} from "@/types";
import { AUTH_TOKEN_STORAGE_KEY } from "@/constants";
import { getErrorDetails, isAbortError } from "@/lib/errors";
import {
  useSessionActions,
  useSessionErrors,
  useSessionState,
} from "./SessionContext";
import { formatRoomKey } from "@/utils/validators";

interface RoomStateContextValue {
  serverDefaults: ServerDefaults | null;
  roomData: RoomData | null;
  activeRoomKey: string | null;
  authToken: string | null;
  isModeratorView: boolean;
  userVote: VoteValue | StructuredVote | null;
  pendingCreateSettings: Partial<RoomSettings> | null;
}

interface RoomStatusContextValue {
  isLoadingDefaults: boolean;
  defaultsError: string | null;
  isLoading: boolean;
  isSocketConnected: boolean;
  isSocketStatusKnown: boolean;
  connectionIssue: ErrorConnectionIssue | null;
  roomError: string;
  roomErrorKind: ErrorKind | null;
}

interface RoomActionsContextValue {
  handleRetryDefaults: () => void;
  clearRoomError: () => void;
  reportRoomError: (message: string, kind?: ErrorKind | null) => void;
  setPendingCreateSettings: (settings: Partial<RoomSettings> | null) => void;
  handleCreateRoom: (settings?: Partial<RoomSettings>) => Promise<void>;
  handleJoinRoom: () => Promise<void>;
  handleLeaveRoom: () => void;
  handleVote: (value: VoteValue | StructuredVote) => void;
  handleToggleShowVotes: () => void;
  handleToggleSpectatorMode: (isSpectator: boolean) => void;
  handleResetVotes: () => void;
  handleUpdateSettings: (settings: RoomSettings) => void;
  handleSelectTicket: (ticketId: number) => void;
  handleNextTicket: () => void;
  handleAddTicket: (ticket: Partial<TicketQueueItem>) => Promise<void>;
  handleUpdateTicket: (
    ticketId: number,
    updates: Partial<TicketQueueItem>,
  ) => Promise<void>;
  handleDeleteTicket: (ticketId: number) => Promise<void>;
  retryConnection: () => void;
}

const RoomStateContext = createContext<RoomStateContextValue | undefined>(
  undefined,
);
const RoomStatusContext = createContext<RoomStatusContextValue | undefined>(
  undefined,
);
const RoomActionsContext = createContext<RoomActionsContextValue | undefined>(
  undefined,
);

export const RoomProvider = ({ children }: { children: ReactNode }) => {
  const { screen, name, roomKey, passcode, selectedAvatar } = useSessionState();
  const { setRoomKey, setPasscode, goHome, goToRoom } = useSessionActions();
  const { setError, clearError } = useSessionErrors();

  const [activeRoomKey, setActiveRoomKey] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [autoReconnectDone, setAutoReconnectDone] = useState(false);
  const [userVote, setUserVote] = useState<VoteValue | StructuredVote | null>(
    null,
  );
  const [isSocketConnected, setIsSocketConnected] = useState<boolean>(() =>
    isConnected(),
  );
  const [isSocketStatusKnown, setIsSocketStatusKnown] = useState<boolean>(() =>
    isConnected(),
  );
  const [isModeratorView, setIsModeratorView] = useState<boolean>(false);
  const [roomError, setRoomError] = useState<string>("");
  const [roomErrorKind, setRoomErrorKind] = useState<ErrorKind | null>(null);
  const [connectionIssue, setConnectionIssue] =
    useState<ErrorConnectionIssue | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [reconnectSignal, setReconnectSignal] = useState<number>(0);
  const [pendingCreateSettings, setPendingCreateSettings] =
    useState<Partial<RoomSettings> | null>(null);

  const {
    serverDefaults,
    isLoadingDefaults,
    defaultsError,
    applyServerDefaults,
    handleRetryDefaults,
  } = useServerDefaults();

  const roomData = useRoomData(activeRoomKey);
  const activeRoomKeyRef = useRef<string | null>(null);
  const latestRoomRequestRef = useRef<AbortController | null>(null);

  useEffect(() => {
    activeRoomKeyRef.current = activeRoomKey;
  }, [activeRoomKey]);

  useEffect(() => {
    return () => {
      latestRoomRequestRef.current?.abort();
    };
  }, []);

  const assignRoomError = useCallback(
    (
      error: unknown,
      fallbackMessage: string,
      defaultKind: ErrorKind | null = null,
    ) => {
      const { message, kind } = getErrorDetails(
        error,
        fallbackMessage,
        defaultKind,
      );
      setRoomError(message);
      setRoomErrorKind(kind ?? defaultKind);
    },
    [],
  );

  const reportRoomError = useCallback(
    (message: string, kind: ErrorKind | null = null) => {
      setRoomError(message);
      setRoomErrorKind(kind);
    },
    [],
  );

  const clearRoomError = useCallback(() => {
    setRoomError("");
    setRoomErrorKind(null);
    setConnectionIssue(null);
  }, []);

  const needsAutoReconnect =
    screen === "room" && !!roomKey && !autoReconnectDone;

  useAutoReconnect({
    name,
    screen,
    roomKey,
    isLoadingDefaults,
    selectedAvatar,
    onReconnectSuccess: useCallback(
      (roomKeyValue: string, isModerator: boolean) => {
        setActiveRoomKey(roomKeyValue);
        setIsModeratorView(isModerator);
      },
      [],
    ),
    onReconnectError: useCallback(
      (message: string) => {
        setError(message);
        setConnectionIssue({ type: "disconnected", message });
      },
      [setError],
    ),
    onLoadingChange: setIsLoading,
    applyServerDefaults,
    onAuthTokenRefresh: setAuthToken,
    onReconnectComplete: useCallback(() => setAutoReconnectDone(true), []),
  });

  const handleRoomMessage = useCallback(
    (message: WebSocketMessage) => {
      if (message.type === "error") {
        setRoomError(message.error || "Connection error");
        if (message.reason === "auth") {
          setRoomErrorKind("auth");
        } else if (message.reason === "permission") {
          setRoomErrorKind("permission");
        } else {
          setRoomErrorKind(null);
        }
        return;
      }
      void applyRoomMessageToCollections(message, activeRoomKeyRef.current)
        .then((updatedRoom) => {
          if (!activeRoomKeyRef.current && updatedRoom?.key) {
            setActiveRoomKey(updatedRoom.key);
          }
          setRoomError("");
          setRoomErrorKind(null);
        })
        .catch((err) => {
          console.error("Failed to process room message", err);
          assignRoomError(err, "Connection update failed");
        });
    },
    [applyRoomMessageToCollections, assignRoomError],
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
      meta?: { reason?: "auth" | "disconnect"; code?: number },
    ) => {
      setRoomError(message);
      if (meta?.reason === "auth") {
        setConnectionIssue({ type: "auth", message });
        setRoomErrorKind("auth");
      } else if (meta?.reason === "disconnect") {
        setConnectionIssue({ type: "disconnected", message });
      }
    },
    [],
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
    skip: needsAutoReconnect,
  });

  useRoomDataSync({
    roomData,
    name,
    userVote,
    isModeratorView,
    onVoteChange: setUserVote,
    onModeratorViewChange: setIsModeratorView,
  });

  const derivedServerDefaults = useMemo(() => {
    if (serverDefaults) {
      return serverDefaults;
    }

    return null;
  }, [serverDefaults]);

  const startRoomRequest = useCallback(() => {
    if (latestRoomRequestRef.current) {
      latestRoomRequestRef.current.abort();
    }
    const controller = new AbortController();
    latestRoomRequestRef.current = controller;
    return controller;
  }, []);

  useAutoEstimateUpdate({
    roomData,
    userName: name,
    onTicketUpdate: (ticketId: number, updates: Partial<TicketQueueItem>) => {
      try {
        updateTicket(ticketId, updates);
      } catch (err: unknown) {
        assignRoomError(err, "Failed to update Jira metadata");
      }
    },
    onError: reportRoomError,
  });

  const handleCreateRoom = useCallback(
    async (settings?: Partial<RoomSettings>) => {
      if (!name || !selectedAvatar) return;

      const resolvedSettings = settings ?? pendingCreateSettings ?? undefined;

      setIsLoading(true);
      clearError();
      const controller = startRoomRequest();

      try {
        const {
          room: newRoom,
          defaults,
          authToken: newAuthToken,
        } = await createRoom(
          name,
          passcode || undefined,
          resolvedSettings,
          selectedAvatar,
          { signal: controller.signal },
        );
        applyServerDefaults(defaults);
        await upsertRoom(newRoom);
        setActiveRoomKey(newRoom.key);
        if (newAuthToken) {
          setAuthToken(newAuthToken);
          safeLocalStorage.set(AUTH_TOKEN_STORAGE_KEY, newAuthToken);
        } else {
          setAuthToken(null);
          safeLocalStorage.remove(AUTH_TOKEN_STORAGE_KEY);
        }
        setIsModeratorView(true);
        goToRoom(newRoom.key);
        setPendingCreateSettings(null);
      } catch (err: unknown) {
        if (isAbortError(err)) {
          return;
        }
        const { message, kind } = getErrorDetails(err, "Failed to create room");
        setError(message, kind ?? null);
      } finally {
        setIsLoading(false);
      }
    },
    [
      name,
      selectedAvatar,
      passcode,
      applyServerDefaults,
      pendingCreateSettings,
      clearError,
      startRoomRequest,
      setError,
      goToRoom,
    ],
  );

  const handleJoinRoom = useCallback(async () => {
    const trimmedName = name.trim();
    const normalizedRoomKey = formatRoomKey(roomKey);
    if (!trimmedName || !normalizedRoomKey || !selectedAvatar) return;

    setIsLoading(true);
    clearError();
    const controller = startRoomRequest();

    try {
      const {
        room: joinedRoom,
        defaults,
        authToken: newAuthToken,
      } = await joinRoom(
        trimmedName,
        normalizedRoomKey,
        passcode?.trim() || undefined,
        selectedAvatar,
        undefined,
        { signal: controller.signal },
      );
      applyServerDefaults(defaults);
      await upsertRoom(joinedRoom);
      setActiveRoomKey(joinedRoom.key);
      if (newAuthToken) {
        setAuthToken(newAuthToken);
        safeLocalStorage.set(AUTH_TOKEN_STORAGE_KEY, newAuthToken);
      } else {
        setAuthToken(null);
        safeLocalStorage.remove(AUTH_TOKEN_STORAGE_KEY);
      }
      setIsModeratorView(joinedRoom.moderator === name);
      goToRoom(joinedRoom.key);
    } catch (err: unknown) {
      if (isAbortError(err)) {
        return;
      }
      const { message, kind } = getErrorDetails(err, "Failed to join room");
      const normalizedKind =
        /passcode/i.test(message) || kind === "passcode"
          ? "passcode"
          : (kind ?? null);
      setError(message, normalizedKind);
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
    startRoomRequest,
    setError,
    goToRoom,
  ]);

  const handleVote = useCallback(
    (value: VoteValue | StructuredVote) => {
      const previousVote = userVote;
      setUserVote(value);

      try {
        submitVote(value, true);
      } catch (err: unknown) {
        setUserVote(previousVote);
        assignRoomError(err, "Failed to submit vote");
      }
    },
    [assignRoomError, userVote],
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
      setRoomErrorKind("permission");
      return;
    }

    try {
      resetVotes();
      setUserVote(null);
    } catch (err: unknown) {
      assignRoomError(err, "Failed to reset votes");
    }
  }, [assignRoomError, roomData, name]);

  const handleToggleSpectatorMode = useCallback((isSpectator: boolean) => {
    try {
      toggleSpectatorMode(isSpectator);
    } catch (err) {
      console.error("Failed to toggle spectator mode:", err);
      setRoomError("Failed to toggle spectator mode.");
      setRoomErrorKind("network");
    }
  }, []);

  const handleToggleShowVotes = useCallback(() => {
    if (!roomData) {
      return;
    }

    if (
      roomData.moderator !== name &&
      !roomData.settings.allowOthersToShowEstimates
    ) {
      setRoomError("You don't have permission to show votes.");
      setRoomErrorKind("permission");
      return;
    }

    try {
      toggleShowVotes();
    } catch (err: unknown) {
      assignRoomError(err, "Failed to toggle vote visibility");
    }
  }, [assignRoomError, roomData, name]);

  const handleUpdateSettings = useCallback(
    (settings: RoomSettings) => {
      if (!isModeratorView) {
        setRoomError("Only moderators can update settings.");
        setRoomErrorKind("permission");
        return;
      }

      try {
        updateSettings(settings);
      } catch (err: unknown) {
        assignRoomError(err, "Failed to update settings");
      }
    },
    [assignRoomError, isModeratorView],
  );

  const handleLeaveRoom = useCallback(() => {
    latestRoomRequestRef.current?.abort();
    disconnectFromRoom();
    safeLocalStorage.remove(AUTH_TOKEN_STORAGE_KEY);
    setRoomError("");
    setRoomErrorKind(null);
    setConnectionIssue(null);

    const key = activeRoomKeyRef.current;
    if (key) {
      void removeRoomFromCollection(key).catch((err) => {
        console.error("Failed to remove room from collection", err);
      });
    }
    setActiveRoomKey(null);
    setAuthToken(null);
    setUserVote(null);
    setIsSocketConnected(false);
    setIsSocketStatusKnown(false);
    setIsModeratorView(false);
    setPasscode("");
    setRoomKey("");
    goHome();
  }, [setPasscode, setRoomKey, goHome]);

  const handleSelectTicket = useCallback(
    (ticketId: number) => {
      try {
        selectTicket(ticketId);
      } catch (err: unknown) {
        assignRoomError(err, "Failed to select ticket");
      }
    },
    [assignRoomError],
  );

  const handleNextTicket = useCallback(() => {
    try {
      nextTicket();
    } catch (err: unknown) {
      assignRoomError(err, "Failed to move to next ticket");
    }
  }, [assignRoomError]);

  const handleAddTicket = useCallback(
    async (ticket: Partial<TicketQueueItem>) => {
      try {
        await addTicket(ticket);
      } catch (err: unknown) {
        assignRoomError(err, "Failed to add ticket");
      }
    },
    [assignRoomError],
  );

  const handleUpdateTicket = useCallback(
    async (ticketId: number, updates: Partial<TicketQueueItem>) => {
      try {
        await updateTicket(ticketId, updates);
      } catch (err: unknown) {
        assignRoomError(err, "Failed to update ticket");
      }
    },
    [assignRoomError],
  );

  const handleDeleteTicket = useCallback(
    async (ticketId: number) => {
      try {
        await deleteTicket(ticketId);
      } catch (err: unknown) {
        assignRoomError(err, "Failed to delete ticket");
      }
    },
    [assignRoomError],
  );

  const retryConnection = useCallback(() => {
    setConnectionIssue((current) =>
      current ? { ...current, reconnecting: true } : null,
    );
    setReconnectSignal((value) => value + 1);
  }, []);

  const stateValue = useMemo<RoomStateContextValue>(
    () => ({
      serverDefaults: derivedServerDefaults,
      roomData,
      activeRoomKey,
      authToken,
      isModeratorView,
      userVote,
      pendingCreateSettings,
    }),
    [
      activeRoomKey,
      authToken,
      derivedServerDefaults,
      isModeratorView,
      pendingCreateSettings,
      roomData,
      userVote,
    ],
  );

  const statusValue = useMemo<RoomStatusContextValue>(
    () => ({
      isLoadingDefaults,
      defaultsError,
      isLoading,
      isSocketConnected,
      isSocketStatusKnown,
      connectionIssue,
      roomError,
      roomErrorKind,
    }),
    [
      connectionIssue,
      defaultsError,
      isLoading,
      isLoadingDefaults,
      isSocketConnected,
      isSocketStatusKnown,
      roomError,
      roomErrorKind,
    ],
  );

  const actionsValue = useMemo<RoomActionsContextValue>(
    () => ({
      handleRetryDefaults,
      clearRoomError,
      reportRoomError,
      setPendingCreateSettings,
      handleCreateRoom,
      handleJoinRoom,
      handleLeaveRoom,
      handleVote,
      handleToggleShowVotes,
      handleToggleSpectatorMode,
      handleResetVotes,
      handleUpdateSettings,
      handleSelectTicket,
      handleNextTicket,
      handleAddTicket,
      handleUpdateTicket,
      handleDeleteTicket,
      retryConnection,
    }),
    [
      clearRoomError,
      handleAddTicket,
      handleCreateRoom,
      handleDeleteTicket,
      handleJoinRoom,
      handleLeaveRoom,
      handleNextTicket,
      handleResetVotes,
      handleRetryDefaults,
      handleSelectTicket,
      handleToggleShowVotes,
      handleToggleSpectatorMode,
      handleUpdateSettings,
      handleUpdateTicket,
      handleVote,
      reportRoomError,
      retryConnection,
      setPendingCreateSettings,
    ],
  );

  return (
    <RoomStateContext.Provider value={stateValue}>
      <RoomStatusContext.Provider value={statusValue}>
        <RoomActionsContext.Provider value={actionsValue}>
          {children}
        </RoomActionsContext.Provider>
      </RoomStatusContext.Provider>
    </RoomStateContext.Provider>
  );
};

export const useRoomState = (): RoomStateContextValue => {
  const ctx = useContext(RoomStateContext);
  if (!ctx) {
    throw new Error("useRoomState must be used within RoomProvider");
  }
  return ctx;
};

export const useRoomStatus = (): RoomStatusContextValue => {
  const ctx = useContext(RoomStatusContext);
  if (!ctx) {
    throw new Error("useRoomStatus must be used within RoomProvider");
  }
  return ctx;
};

export const useRoomActions = (): RoomActionsContextValue => {
  const ctx = useContext(RoomActionsContext);
  if (!ctx) {
    throw new Error("useRoomActions must be used within RoomProvider");
  }
  return ctx;
};
