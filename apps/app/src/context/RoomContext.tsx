import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { StructuredVote, VoteValue } from "@sprintjam/types";

import { disconnectFromRoom, updateTicket } from "@/lib/api-service";
import { removeRoomFromCollection } from "@/lib/data/room-store";
import { useRoomData } from "@/lib/data/hooks";
import { useServerDefaults } from "@/hooks/useServerDefaults";
import { useAutoReconnect } from "@/hooks/useAutoReconnect";
import { useAutoEstimateUpdate } from "@/hooks/useAutoEstimateUpdate";
import { useRoomConnection } from "@/hooks/useRoomConnection";
import { useRoomDataSync } from "@/hooks/useRoomDataSync";
import type { RoomSettings, TicketQueueItem } from "@/types";
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
import { useWorkspaceData } from "@/hooks/useWorkspaceData";
import { useRoomQueueAndGameActions } from "./useRoomQueueAndGameActions";
import { useRoomRealtimeState } from "./useRoomRealtimeState";
import { useRoomVotingActions } from "./useRoomVotingActions";
import { sanitiseAvatarValue } from "@/utils/avatars";

export const RoomProvider = ({ children }: { children: ReactNode }) => {
  const {
    screen,
    name,
    roomKey,
    passcode,
    selectedAvatar,
    selectedWorkspaceTeamId,
  } = useSessionState();
  const { setScreen, setRoomKey, setPasscode, goHome, goToRoom } =
    useSessionActions();
  const { setError, clearError } = useSessionErrors();
  const {
    createSession,
    isAuthenticated,
    user: workspaceUser,
  } = useWorkspaceData();

  const effectiveName = isAuthenticated
    ? workspaceUser?.name?.trim() || name
    : name;
  const effectiveAvatar = isAuthenticated
    ? sanitiseAvatarValue(workspaceUser?.avatar) ||
      sanitiseAvatarValue(selectedAvatar) ||
      "user"
    : selectedAvatar;

  const [activeRoomKey, setActiveRoomKey] = useState<string | null>(null);
  const [autoReconnectDone, setAutoReconnectDone] = useState(false);
  const [userVote, setUserVote] = useState<VoteValue | StructuredVote | null>(
    null,
  );
  const [isModeratorView, setIsModeratorView] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [pendingCreateSettings, setPendingCreateSettings] =
    useState<Partial<RoomSettings> | null>(null);

  useEffect(() => {
    if (screen !== "room") {
      setAutoReconnectDone(false);
    }
  }, [screen]);

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

  const {
    isSocketConnected,
    isSocketStatusKnown,
    roomError,
    roomErrorKind,
    connectionIssue,
    reconnectSignal,
    setConnectionIssue,
    setRoomError,
    setRoomErrorKind,
    assignRoomError,
    reportRoomError,
    clearRoomError,
    handleRoomMessage,
    handleConnectionChange,
    handleConnectionError,
    retryConnection,
    resetRealtimeState,
  } = useRoomRealtimeState({
    activeRoomKeyRef,
    setActiveRoomKey,
  });

  const needsAutoReconnect =
    screen === "room" && !!roomKey && !autoReconnectDone;

  useAutoReconnect({
    enabled: needsAutoReconnect,
    name: effectiveName,
    screen,
    roomKey,
    isLoadingDefaults,
    selectedAvatar: effectiveAvatar,
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

        if (isAuthError) {
          setScreen("join");
          setError(message, "passcode");
          return;
        }

        setError(message);
        setConnectionIssue({
          type: "disconnected",
          message,
        });
      },
      [setError, goHome, setScreen, setConnectionIssue],
    ),
    onLoadingChange: setIsLoading,
    applyServerDefaults,
    onReconnectComplete: useCallback(() => setAutoReconnectDone(true), []),
    onNeedsJoin: useCallback(() => {
      setScreen("join");
    }, [setScreen]),
  });

  useRoomConnection({
    screen,
    name: effectiveName,
    activeRoomKey,
    onMessage: handleRoomMessage,
    onConnectionChange: handleConnectionChange,
    onError: handleConnectionError,
    reconnectSignal,
    skip: needsAutoReconnect,
  });

  useRoomDataSync({
    roomData,
    name: effectiveName,
    userVote,
    isModeratorView,
    onVoteChange: setUserVote,
    onModeratorViewChange: setIsModeratorView,
  });

  const derivedServerDefaults = serverDefaults ?? null;

  const { handleCreateRoom, handleJoinRoom, abortLatestRoomRequest } =
    useRoomEntryActions({
      name: effectiveName,
      roomKey,
      passcode,
      selectedAvatar: effectiveAvatar,
      selectedWorkspaceTeamId,
      pendingCreateSettings,
      applyServerDefaults,
      clearError,
      setError,
      goToRoom,
      setActiveRoomKey,
      setIsModeratorView,
      setPendingCreateSettings,
      setIsLoading,
      markAutoReconnectDone: () => setAutoReconnectDone(true),
      createSession,
    });

  useAutoEstimateUpdate({
    roomData,
    userName: effectiveName,
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
    resetRealtimeState();

    const key = activeRoomKeyRef.current;
    if (key) {
      void removeRoomFromCollection(key).catch((err) => {
        console.error("Failed to remove room from collection", err);
      });
    }
    setActiveRoomKey(null);
    setAutoReconnectDone(false);
    setUserVote(null);
    setIsModeratorView(false);
    setPasscode("");
    setRoomKey("");
    goHome();
  }, [
    abortLatestRoomRequest,
    goHome,
    resetRealtimeState,
    setPasscode,
    setRoomKey,
  ]);

  const {
    handleVote,
    handleResetVotes,
    handleToggleSpectatorMode,
    handleToggleShowVotes,
    handleUpdateSettings,
  } = useRoomVotingActions({
    roomData,
    userName: effectiveName,
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
    userName: effectiveName,
    setRoomError,
    setRoomErrorKind,
    assignRoomError,
  });

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
