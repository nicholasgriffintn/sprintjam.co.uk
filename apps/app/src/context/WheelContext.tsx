import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import type {
  WheelData,
  WheelSettings,
  WheelServerMessage,
} from "@sprintjam/types";
import { isWorkspaceWheelMode } from "@sprintjam/utils";
import {
  connectToWheel,
  disconnectFromWheel,
  getCachedWheel,
  addEntry as apiAddEntry,
  removeEntry as apiRemoveEntry,
  updateEntry as apiUpdateEntry,
  toggleEntry as apiToggleEntry,
  clearEntries as apiClearEntries,
  bulkAddEntries as apiBulkAddEntries,
  spin as apiSpin,
  resetWheel as apiResetWheel,
  updateWheelSettings as apiUpdateWheelSettings,
} from "@/lib/wheel-api-service";
import { HttpError } from "@/lib/errors";
import {
  recordWheelOutcomeByRoomKey,
  recordWheelSessionStats,
} from "@/lib/workspace-service";
import { upsertWheel } from "@/lib/wheel-store";
import { useWorkspaceData } from "@/hooks/useWorkspaceData";

interface WheelStateContextValue {
  wheelData: WheelData | null;
  isModeratorView: boolean;
}

interface WheelStatusContextValue {
  isSocketConnected: boolean;
  wheelError: string | null;
  isLoading: boolean;
}

interface WheelActionsContextValue {
  connectWheel: (wheelKey: string, userName: string) => void;
  disconnectWheel: () => void;
  handleAddEntry: (name: string) => void;
  handleRemoveEntry: (entryId: string) => void;
  handleUpdateEntry: (entryId: string, name: string) => void;
  handleToggleEntry: (entryId: string, enabled: boolean) => void;
  handleClearEntries: () => void;
  handleBulkAddEntries: (names: string[]) => void;
  handleSpin: () => void;
  handleResetWheel: () => void;
  handleUpdateSettings: (settings: Partial<WheelSettings>) => void;
}

function isExpectedWorkspaceRecordError(error: unknown): boolean {
  return (
    error instanceof HttpError &&
    (error.status === 401 ||
      error.status === 403 ||
      error.status === 404 ||
      error.status === 409)
  );
}

function logWorkspaceRecordFailure(
  label: string,
  result: PromiseSettledResult<unknown>,
): void {
  if (
    result.status === "fulfilled" ||
    isExpectedWorkspaceRecordError(result.reason)
  ) {
    return;
  }

  console.error(`Failed to record wheel ${label}:`, result.reason);
}

const WheelStateContext = createContext<WheelStateContextValue | null>(null);
const WheelStatusContext = createContext<WheelStatusContextValue | null>(null);
const WheelActionsContext = createContext<WheelActionsContextValue | null>(
  null,
);

export function useWheelState(): WheelStateContextValue {
  const context = useContext(WheelStateContext);
  if (!context) {
    throw new Error("useWheelState must be used within a WheelProvider");
  }
  return context;
}

export function useWheelStatus(): WheelStatusContextValue {
  const context = useContext(WheelStatusContext);
  if (!context) {
    throw new Error("useWheelStatus must be used within a WheelProvider");
  }
  return context;
}

export function useWheelActions(): WheelActionsContextValue {
  const context = useContext(WheelActionsContext);
  if (!context) {
    throw new Error("useWheelActions must be used within a WheelProvider");
  }
  return context;
}

interface WheelProviderProps {
  children: ReactNode;
  userName: string;
}

export function WheelProvider({ children, userName }: WheelProviderProps) {
  const { isAuthenticated } = useWorkspaceData();
  const [wheelData, setWheelData] = useState<WheelData | null>(null);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [wheelError, setWheelError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const userNameRef = useRef(userName);
  const wheelDataRef = useRef<WheelData | null>(null);
  userNameRef.current = userName;
  wheelDataRef.current = wheelData;

  const recordWorkspaceOutcome = useCallback(
    async (
      wheel: WheelData,
      result: WheelData["results"][number],
      entries: WheelData["entries"],
    ) => {
      if (!isWorkspaceWheelMode(wheel.settings.mode)) {
        return;
      }

      const results = [...wheel.results, result];
      const statsResult = await Promise.allSettled([
        recordWheelSessionStats({
          roomKey: wheel.key,
          mode: wheel.settings.mode,
          totalParticipants: wheel.users.length,
          entryCount: entries.length,
          enabledEntryCount: entries.filter((entry) => entry.enabled).length,
          results: results.map((item) => ({
            winner: item.winner,
            removedAfter: item.removedAfter,
          })),
        }),
      ]);
      const outcomeResult = isAuthenticated
        ? await Promise.allSettled([
            recordWheelOutcomeByRoomKey(wheel.key, wheel.settings.mode, result),
          ])
        : [];

      for (const result of outcomeResult) {
        logWorkspaceRecordFailure("outcome", result);
      }
      for (const result of statsResult) {
        logWorkspaceRecordFailure("stats", result);
      }
    },
    [isAuthenticated],
  );

  const handleMessage = useCallback((message: WheelServerMessage) => {
    switch (message.type) {
      case "initialize":
        setWheelData(message.wheel);
        upsertWheel(message.wheel);
        setIsLoading(false);
        break;

      case "userJoined":
        setWheelData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            users: message.users,
            userAvatars: message.userAvatars ?? prev.userAvatars,
            connectedUsers: {
              ...prev.connectedUsers,
              [message.user]: true,
            },
          };
        });
        break;

      case "userLeft":
        setWheelData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            users: message.users,
            connectedUsers: {
              ...prev.connectedUsers,
              [message.user]: false,
            },
          };
        });
        break;

      case "entriesUpdated":
        setWheelData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            entries: message.entries,
          };
        });
        break;

      case "spinStarted":
        setWheelData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            spinState: message.spinState,
          };
        });
        break;

      case "spinEnded":
        if (wheelDataRef.current) {
          void recordWorkspaceOutcome(
            wheelDataRef.current,
            message.result,
            message.entries,
          );
        }
        setWheelData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            spinState: null,
            entries: message.entries,
            results: [...prev.results, message.result],
          };
        });
        break;

      case "settingsUpdated":
        setWheelData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            settings: message.settings,
          };
        });
        break;

      case "wheelReset":
        setWheelData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            entries: message.entries,
            results: message.results,
            spinState: null,
          };
        });
        break;

      case "newModerator":
        setWheelData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            moderator: message.moderator,
          };
        });
        break;

      case "error":
        setWheelError(message.error);
        break;
    }
  }, [recordWorkspaceOutcome]);

  const handleConnectionChange = useCallback((connected: boolean) => {
    setIsSocketConnected(connected);
    if (!connected) {
      setIsLoading(false);
    }
  }, []);

  const connectWheel = useCallback(
    (wheelKey: string, userName: string) => {
      const cachedWheel = getCachedWheel(wheelKey);
      if (cachedWheel) {
        setWheelData(cachedWheel);
        setIsLoading(false);
      } else {
        setIsLoading(true);
      }
      setWheelError(null);
      connectToWheel(wheelKey, userName, handleMessage, handleConnectionChange);
    },
    [handleMessage, handleConnectionChange],
  );

  const disconnectWheel = useCallback(() => {
    disconnectFromWheel();
    setWheelData(null);
    setIsSocketConnected(false);
    setWheelError(null);
  }, []);

  const handleAddEntry = useCallback((name: string) => {
    apiAddEntry(name);
  }, []);

  const handleRemoveEntry = useCallback((entryId: string) => {
    apiRemoveEntry(entryId);
  }, []);

  const handleUpdateEntry = useCallback((entryId: string, name: string) => {
    apiUpdateEntry(entryId, name);
  }, []);

  const handleToggleEntry = useCallback((entryId: string, enabled: boolean) => {
    apiToggleEntry(entryId, enabled);
  }, []);

  const handleClearEntries = useCallback(() => {
    apiClearEntries();
  }, []);

  const handleBulkAddEntries = useCallback((names: string[]) => {
    apiBulkAddEntries(names);
  }, []);

  const handleSpin = useCallback(() => {
    apiSpin();
  }, []);

  const handleResetWheel = useCallback(() => {
    apiResetWheel();
  }, []);

  const handleUpdateSettings = useCallback(
    (settings: Partial<WheelSettings>) => {
      apiUpdateWheelSettings(settings);
    },
    [],
  );

  useEffect(() => {
    return () => {
      disconnectFromWheel();
    };
  }, []);

  const isModeratorView = wheelData?.moderator === userName;

  const stateValue: WheelStateContextValue = {
    wheelData,
    isModeratorView,
  };

  const statusValue: WheelStatusContextValue = {
    isSocketConnected,
    wheelError,
    isLoading,
  };

  const actionsValue: WheelActionsContextValue = {
    connectWheel,
    disconnectWheel,
    handleAddEntry,
    handleRemoveEntry,
    handleUpdateEntry,
    handleToggleEntry,
    handleClearEntries,
    handleBulkAddEntries,
    handleSpin,
    handleResetWheel,
    handleUpdateSettings,
  };

  return (
    <WheelStateContext.Provider value={stateValue}>
      <WheelStatusContext.Provider value={statusValue}>
        <WheelActionsContext.Provider value={actionsValue}>
          {children}
        </WheelActionsContext.Provider>
      </WheelStatusContext.Provider>
    </WheelStateContext.Provider>
  );
}
