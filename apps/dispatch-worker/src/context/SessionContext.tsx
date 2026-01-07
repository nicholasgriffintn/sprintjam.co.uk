import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useUserPersistence } from "@/hooks/useUserPersistence";
import { useUrlParams } from "@/hooks/useUrlParams";
import type { AvatarId, ErrorKind } from "@/types";
import { getScreenFromPath, navigateTo } from "@/utils/navigation";

export type AppScreen =
  | "welcome"
  | "login"
  | "verify"
  | "workspace"
  | "create"
  | "join"
  | "room"
  | "404"
  | "privacy"
  | "terms"
  | "changelog";

interface SessionStateContextValue {
  screen: AppScreen;
  joinFlowMode: "join" | "create";
  name: string;
  roomKey: string;
  passcode: string;
  selectedAvatar: AvatarId | null;
}

interface SessionActionsContextValue {
  setScreen: (screen: AppScreen) => void;
  setJoinFlowMode: (mode: "join" | "create") => void;
  setName: (name: string) => void;
  setRoomKey: (key: string) => void;
  setPasscode: (passcode: string) => void;
  setSelectedAvatar: (avatar: AvatarId | null) => void;
  goHome: () => void;
  goToLogin: () => void;
  goToWorkspace: () => void;
  goToRoom: (roomKey: string) => void;
  startCreateFlow: () => void;
  startJoinFlow: () => void;
}

interface SessionErrorContextValue {
  error: string;
  errorKind: ErrorKind | null;
  setError: (message: string, kind?: ErrorKind | null) => void;
  clearError: () => void;
}

export interface SessionContextValue
  extends
    SessionStateContextValue,
    SessionActionsContextValue,
    SessionErrorContextValue {}

const SessionStateContext = createContext<SessionStateContextValue | undefined>(
  undefined,
);
const SessionActionsContext = createContext<
  SessionActionsContextValue | undefined
>(undefined);
const SessionErrorContext = createContext<SessionErrorContextValue | undefined>(
  undefined,
);

export const SessionProvider = ({
  currentPath,
  children,
}: {
  currentPath: string;
  children: ReactNode;
}) => {
  const screenFromPath = getScreenFromPath(currentPath);
  const [screen, setScreen] = useState<AppScreen>(screenFromPath);
  const [joinFlowMode, setJoinFlowMode] = useState<"join" | "create">(
    screenFromPath === "create" ? "create" : "join",
  );
  const [name, setName] = useState("");
  const [roomKey, setRoomKey] = useState("");
  const [passcode, setPasscode] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarId | null>(null);
  const [error, setErrorState] = useState("");
  const [errorKind, setErrorKind] = useState<ErrorKind | null>(null);

  const setError = useCallback(
    (message: string, kind: ErrorKind | null = null) => {
      setErrorState(message);
      setErrorKind(kind);
    },
    [],
  );

  const clearError = useCallback(() => {
    setErrorState("");
    setErrorKind(null);
  }, []);

  const goHome = useCallback(() => {
    setPasscode("");
    setJoinFlowMode("join");
    setScreen("welcome");
    navigateTo("welcome");
    clearError();
  }, [clearError]);

  const goToLogin = useCallback(() => {
    setPasscode("");
    setJoinFlowMode("join");
    setScreen("login");
    navigateTo("login");
    clearError();
  }, [clearError]);

  const goToWorkspace = useCallback(() => {
    setPasscode("");
    setJoinFlowMode("join");
    setScreen("workspace");
    navigateTo("workspace");
    clearError();
  }, [clearError]);

  const goToRoom = useCallback(
    (roomKey: string) => {
      setRoomKey(roomKey);
      setScreen("room");
      navigateTo("room");
      clearError();
    },
    [clearError],
  );

  const startCreateFlow = useCallback(() => {
    setPasscode("");
    setJoinFlowMode("create");
    setScreen("create");
    navigateTo("create");
    clearError();
  }, [clearError]);

  const startJoinFlow = useCallback(() => {
    setPasscode("");
    setJoinFlowMode("join");
    setScreen("join");
    navigateTo("join");
    clearError();
  }, [clearError]);

  useUrlParams({
    onJoinRoom: (joinRoomKey) => {
      setRoomKey(joinRoomKey);
      setScreen("join");
    },
  });

  useEffect(() => {
    const handlePopState = () => {
      const newScreen = getScreenFromPath(window.location.pathname);
      setScreen(newScreen);
      clearError();
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [clearError]);

  useUserPersistence({
    name,
    onNameLoaded: setName,
  });

  const stateValue = useMemo<SessionStateContextValue>(
    () => ({
      screen,
      joinFlowMode,
      name,
      roomKey,
      passcode,
      selectedAvatar,
    }),
    [screen, joinFlowMode, name, roomKey, passcode, selectedAvatar],
  );

  const actionsValue = useMemo<SessionActionsContextValue>(
    () => ({
      setScreen,
      setJoinFlowMode,
      setName,
      setRoomKey,
      setPasscode,
      setSelectedAvatar,
      goHome,
      goToLogin,
      goToWorkspace,
      goToRoom,
      startCreateFlow,
      startJoinFlow,
    }),
    [
      setScreen,
      setJoinFlowMode,
      setName,
      setRoomKey,
      setPasscode,
      setSelectedAvatar,
      goHome,
      startCreateFlow,
      startJoinFlow,
    ],
  );

  const errorValue = useMemo<SessionErrorContextValue>(
    () => ({
      error,
      errorKind,
      setError,
      clearError,
    }),
    [error, errorKind, setError, clearError],
  );

  return (
    <SessionStateContext.Provider value={stateValue}>
      <SessionErrorContext.Provider value={errorValue}>
        <SessionActionsContext.Provider value={actionsValue}>
          {children}
        </SessionActionsContext.Provider>
      </SessionErrorContext.Provider>
    </SessionStateContext.Provider>
  );
};

export const useSessionState = (): SessionStateContextValue => {
  const ctx = useContext(SessionStateContext);
  if (!ctx) {
    throw new Error("useSessionState must be used within SessionProvider");
  }
  return ctx;
};

export const useSessionActions = (): SessionActionsContextValue => {
  const ctx = useContext(SessionActionsContext);
  if (!ctx) {
    throw new Error("useSessionActions must be used within SessionProvider");
  }
  return ctx;
};

export const useSessionErrors = (): SessionErrorContextValue => {
  const ctx = useContext(SessionErrorContext);
  if (!ctx) {
    throw new Error("useSessionErrors must be used within SessionProvider");
  }
  return ctx;
};

export const useSession = (): SessionContextValue => {
  const state = useSessionState();
  const errors = useSessionErrors();
  const actions = useSessionActions();

  return useMemo(
    () => ({
      ...state,
      ...errors,
      ...actions,
    }),
    [state, errors, actions],
  );
};
