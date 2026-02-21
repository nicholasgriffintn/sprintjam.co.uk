import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  disconnectFromRoom,
  updateTicket,
  isConnected,
} from "@/lib/api-service";
import {
  applyRoomMessageToCollections,
  removeRoomFromCollection,
} from "@/lib/data/room-store";
import { useRoomData } from "@/lib/data/hooks";
import { useServerDefaults } from "@/hooks/useServerDefaults";
import { useAutoReconnect } from "@/hooks/useAutoReconnect";
import { useAutoEstimateUpdate } from "@/hooks/useAutoEstimateUpdate";
import { useRoomConnection } from "@/hooks/useRoomConnection";
import { useRoomDataSync } from "@/hooks/useRoomDataSync";
import type {
  ErrorConnectionIssue,
  ErrorKind,
  RoomSettings,
  StructuredVote,
  TicketQueueItem,
  VoteValue,
  WebSocketMessage,
} from "@/types";
import { getErrorDetails } from "@/lib/errors";
import {
  useSessionActions,
  useSessionErrors,
  useSessionState,
} from "@/context/SessionContext";
import type {
  RoomActionsContextValue,
  RoomStateContextValue,
  RoomStatusContextValue,
} from "./room-context.types";
import {
  RoomActionsContext,
  RoomStateContext,
  RoomStatusContext,
  useRoomActions,
  useRoomState,
  useRoomStatus,
} from "./room-context-store";
import { useRoomEntryActions } from "./useRoomEntryActions";
import { useRoomQueueAndGameActions } from "./useRoomQueueAndGameActions";
import { useRoomVotingActions } from "./useRoomVotingActions";

export const RoomProvider = ({ children }: { children: ReactNode }) => {
  const { screen, name, roomKey, passcode, selectedAvatar } = useSessionState();
  const { setScreen, setRoomKey, setPasscode, goHome, goToRoom } =
    useSessionActions();
  const { setError, clearError } = useSessionErrors();

  const [activeRoomKey, setActiveRoomKey] = useState<string | null>(null);
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

  useEffect(() => {
    activeRoomKeyRef.current = activeRoomKey;
  }, [activeRoomKey]);

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
      ({ message, isAuthError, isRoomNotFound, isNameConflict }) => {
        if (isRoomNotFound) {
          goHome();
          setTimeout(() => setError("Room not found"), 0);
          return;
        }

        if (isNameConflict) {
          setError(
            "This name is already in use. Please choose a different name.",
          );
          setConnectionIssue({
            type: "disconnected",
            message: "Please choose a different name to join the room.",
          });

          setScreen("join");
          return;
        }

        setError(message);
        setConnectionIssue({
          type: isAuthError ? "auth" : "disconnected",
          message,
        });
      },
      [setError, goHome, setScreen],
    ),
    onLoadingChange: setIsLoading,
    applyServerDefaults,
    onReconnectComplete: useCallback(() => setAutoReconnectDone(true), []),
    onNeedsJoin: useCallback(() => {
      setScreen("join");
    }, [setScreen]),
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

  const { handleCreateRoom, handleJoinRoom, abortLatestRoomRequest } =
    useRoomEntryActions({
      name,
      roomKey,
      passcode,
      selectedAvatar,
      pendingCreateSettings,
      applyServerDefaults,
      clearError,
      setError,
      goToRoom,
      setActiveRoomKey,
      setIsModeratorView,
      setPendingCreateSettings,
      setIsLoading,
    });

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

  const handleLeaveRoom = useCallback(() => {
    abortLatestRoomRequest();
    disconnectFromRoom();
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
    setUserVote(null);
    setIsSocketConnected(false);
    setIsSocketStatusKnown(false);
    setIsModeratorView(false);
    setPasscode("");
    setRoomKey("");
    goHome();
  }, [abortLatestRoomRequest, setPasscode, setRoomKey, goHome]);

  const {
    handleVote,
    handleResetVotes,
    handleToggleSpectatorMode,
    handleToggleShowVotes,
    handleUpdateSettings,
  } = useRoomVotingActions({
    roomData,
    userName: name,
    userVote,
    isModeratorView,
    setUserVote,
    setRoomError,
    setRoomErrorKind,
    assignRoomError,
  });

  const {
    handleSelectTicket,
    handleNextTicket,
    handleAddTicket,
    handleUpdateTicket,
    handleDeleteTicket,
    handleCompleteSession,
    handleStartGame,
    handleSubmitGameMove,
    handleEndGame,
  } = useRoomQueueAndGameActions({
    roomData,
    userName: name,
    setRoomError,
    setRoomErrorKind,
    assignRoomError,
  });

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
      isModeratorView,
      userVote,
      pendingCreateSettings,
    }),
    [
      activeRoomKey,
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
      handleCompleteSession,
      handleStartGame,
      handleSubmitGameMove,
      handleEndGame,
      retryConnection,
    }),
    [
      clearRoomError,
      handleAddTicket,
      handleCompleteSession,
      handleCreateRoom,
      handleEndGame,
      handleDeleteTicket,
      handleJoinRoom,
      handleLeaveRoom,
      handleNextTicket,
      handleResetVotes,
      handleRetryDefaults,
      handleSelectTicket,
      handleToggleShowVotes,
      handleToggleSpectatorMode,
      handleStartGame,
      handleSubmitGameMove,
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

export { useRoomState, useRoomStatus, useRoomActions };
