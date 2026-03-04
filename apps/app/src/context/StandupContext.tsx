import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  StandupData,
  StandupResponse,
  StandupResponsePayload,
} from "@sprintjam/types";

import {
  connectToStandup,
  disconnectFromStandup,
  endStandupPresentation,
  focusStandupUser,
  lockStandupResponses,
  pingStandup,
  startStandupPresentation,
  submitStandupResponse,
  unlockStandupResponses,
  type StandupServerMessage,
} from "@/lib/standup-api-service";

interface StandupStateContextValue {
  standupData: StandupData | null;
  isModeratorView: boolean;
}

interface StandupStatusContextValue {
  isSocketConnected: boolean;
  standupError: string | null;
  isLoading: boolean;
}

interface StandupActionsContextValue {
  connectStandup: (standupKey: string, userName: string) => void;
  disconnectStandup: () => void;
  handleSubmitResponse: (payload: StandupResponsePayload) => void;
  handleLockResponses: () => void;
  handleUnlockResponses: () => void;
  handleStartPresentation: () => void;
  handleEndPresentation: () => void;
  handleFocusUser: (userName: string) => void;
  handlePing: () => void;
}

const StandupStateContext = createContext<StandupStateContextValue | null>(
  null,
);
const StandupStatusContext = createContext<StandupStatusContextValue | null>(
  null,
);
const StandupActionsContext = createContext<StandupActionsContextValue | null>(
  null,
);

function mergeResponse(
  responses: StandupResponse[],
  response: StandupResponse,
): StandupResponse[] {
  const existingIndex = responses.findIndex(
    (item) => item.userName === response.userName,
  );

  if (existingIndex === -1) {
    return [...responses, response].sort((a, b) => a.submittedAt - b.submittedAt);
  }

  return responses.map((item, index) =>
    index === existingIndex ? response : item,
  );
}

export function useStandupState(): StandupStateContextValue {
  const context = useContext(StandupStateContext);
  if (!context) {
    throw new Error("useStandupState must be used within a StandupProvider");
  }
  return context;
}

export function useStandupStatus(): StandupStatusContextValue {
  const context = useContext(StandupStatusContext);
  if (!context) {
    throw new Error("useStandupStatus must be used within a StandupProvider");
  }
  return context;
}

export function useStandupActions(): StandupActionsContextValue {
  const context = useContext(StandupActionsContext);
  if (!context) {
    throw new Error("useStandupActions must be used within a StandupProvider");
  }
  return context;
}

export function StandupProvider({
  children,
  userName,
}: {
  children: ReactNode;
  userName: string;
}) {
  const [standupData, setStandupData] = useState<StandupData | null>(null);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [standupError, setStandupError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const userNameRef = useRef(userName);
  userNameRef.current = userName;

  const handleMessage = useCallback((message: StandupServerMessage) => {
    switch (message.type) {
      case "initialize":
        setStandupData(message.standup);
        setStandupError(null);
        setIsLoading(false);
        break;

      case "userJoined":
        setStandupData((prev) => {
          if (!prev) {
            return prev;
          }

          const users = Array.from(new Set([...prev.users, ...message.users]));
          return {
            ...prev,
            users,
            userAvatars: message.userAvatars ?? prev.userAvatars,
            connectedUsers: {
              ...prev.connectedUsers,
              [message.user]: true,
            },
          };
        });
        break;

      case "userLeft":
        setStandupData((prev) => {
          if (!prev) {
            return prev;
          }

          return {
            ...prev,
            connectedUsers: {
              ...prev.connectedUsers,
              [message.user]: false,
            },
          };
        });
        break;

      case "responseSubmitted":
        setStandupData((prev) => {
          if (!prev) {
            return prev;
          }

          return {
            ...prev,
            respondedUsers: message.respondedUsers,
          };
        });
        break;

      case "responseUpdated":
      case "responseConfirmed":
        setStandupData((prev) => {
          if (!prev) {
            return prev;
          }

          return {
            ...prev,
            responses: mergeResponse(prev.responses, message.response),
            respondedUsers: Array.from(
              new Set([...prev.respondedUsers, message.response.userName]),
            ),
          };
        });
        break;

      case "responsesLocked":
        setStandupData((prev) =>
          prev ? { ...prev, status: "locked" } : prev,
        );
        break;

      case "responsesUnlocked":
        setStandupData((prev) =>
          prev ? { ...prev, status: "active" } : prev,
        );
        break;

      case "presentationStarted":
        setStandupData((prev) =>
          prev ? { ...prev, status: "presenting" } : prev,
        );
        break;

      case "presentationEnded":
        setStandupData((prev) =>
          prev ? { ...prev, status: "active", focusedUser: undefined } : prev,
        );
        break;

      case "userFocused":
        setStandupData((prev) =>
          prev ? { ...prev, focusedUser: message.userName } : prev,
        );
        break;

      case "newModerator":
        setStandupData((prev) =>
          prev ? { ...prev, moderator: message.moderator } : prev,
        );
        break;

      case "error":
      case "disconnected":
        setStandupError(message.error);
        setIsLoading(false);
        break;

      case "pong":
        break;
    }
  }, []);

  const handleConnectionChange = useCallback((connected: boolean) => {
    setIsSocketConnected(connected);
    if (!connected) {
      setIsLoading(false);
    }
  }, []);

  const connectStandup = useCallback(
    (standupKey: string, nextUserName: string) => {
      setIsLoading(true);
      setStandupError(null);
      connectToStandup(
        standupKey,
        nextUserName,
        handleMessage,
        handleConnectionChange,
      );
    },
    [handleConnectionChange, handleMessage],
  );

  const disconnectStandupRoom = useCallback(() => {
    disconnectFromStandup();
    setStandupData(null);
    setIsSocketConnected(false);
    setStandupError(null);
    setIsLoading(false);
  }, []);

  const stateValue: StandupStateContextValue = {
    standupData,
    isModeratorView: standupData?.moderator === userNameRef.current,
  };

  const statusValue: StandupStatusContextValue = {
    isSocketConnected,
    standupError,
    isLoading,
  };

  const actionsValue: StandupActionsContextValue = {
    connectStandup,
    disconnectStandup: disconnectStandupRoom,
    handleSubmitResponse: submitStandupResponse,
    handleLockResponses: lockStandupResponses,
    handleUnlockResponses: unlockStandupResponses,
    handleStartPresentation: startStandupPresentation,
    handleEndPresentation: endStandupPresentation,
    handleFocusUser: focusStandupUser,
    handlePing: pingStandup,
  };

  return (
    <StandupStateContext.Provider value={stateValue}>
      <StandupStatusContext.Provider value={statusValue}>
        <StandupActionsContext.Provider value={actionsValue}>
          {children}
        </StandupActionsContext.Provider>
      </StandupStatusContext.Provider>
    </StandupStateContext.Provider>
  );
}
