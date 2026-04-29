import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useLocation } from "react-router";

import {
  getStoredUserAvatar,
  getStoredUserName,
  useUserPersistence,
} from "@/hooks/useUserPersistence";
import { useUrlParams } from "@/hooks/useUrlParams";
import type { AvatarId, ErrorKind } from "@/types";
import { parsePath } from "@/config/routes";
import { useAppNavigation } from "@/hooks/useAppNavigation";

interface SessionStateContextValue {
  joinFlowMode: "join" | "create";
  name: string;
  roomKey: string;
  passcode: string;
  selectedAvatar: AvatarId | null;
  selectedWorkspaceTeamId: number | null;
}

interface SessionActionsContextValue {
  setJoinFlowMode: (mode: "join" | "create") => void;
  setName: (name: string) => void;
  setRoomKey: (key: string) => void;
  setPasscode: (passcode: string) => void;
  setSelectedAvatar: (avatar: AvatarId | null) => void;
  setSelectedWorkspaceTeamId: (teamId: number | null) => void;
  goHome: () => void;
  goToLogin: () => void;
  goToWorkspace: () => void;
  goToWorkspaceProfile: () => void;
  goToWorkspaceSessions: () => void;
  goToWorkspaceAdmin: () => void;
  goToWorkspaceAdminTeams: () => void;
  goToWorkspaceAdminTeamSettings: () => void;
  goToRoom: (roomKey: string) => void;
  startCreateFlow: (teamId?: number) => void;
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

export const SessionProvider = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const navigateTo = useAppNavigation();
  const initialPath = parsePath(location.pathname);
  const [joinFlowMode, setJoinFlowMode] = useState<"join" | "create">(
    initialPath.screen === "create" ? "create" : "join",
  );
  const [name, setName] = useState(() => getStoredUserName());
  const [roomKey, setRoomKey] = useState(initialPath.roomKey ?? "");
  const [passcode, setPasscode] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarId | null>(() =>
    getStoredUserAvatar(),
  );
  const [selectedWorkspaceTeamId, setSelectedWorkspaceTeamId] = useState<
    number | null
  >(null);
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
    setSelectedWorkspaceTeamId(null);
    navigateTo("welcome");
    clearError();
  }, [clearError]);

  const goToLogin = useCallback(() => {
    setPasscode("");
    setJoinFlowMode("join");
    navigateTo("login");
    clearError();
  }, [clearError]);

  const goToWorkspace = useCallback(() => {
    setPasscode("");
    setJoinFlowMode("join");
    navigateTo("workspace");
    clearError();
  }, [clearError]);

  const goToWorkspaceProfile = useCallback(() => {
    setPasscode("");
    setJoinFlowMode("join");
    navigateTo("workspaceProfile");
    clearError();
  }, [clearError]);

  const goToWorkspaceSessions = useCallback(() => {
    setPasscode("");
    setJoinFlowMode("join");
    navigateTo("workspaceSessions");
    clearError();
  }, [clearError]);

  const goToWorkspaceAdmin = useCallback(() => {
    setPasscode("");
    setJoinFlowMode("join");
    navigateTo("workspaceAdmin");
    clearError();
  }, [clearError]);

  const goToWorkspaceAdminTeams = useCallback(() => {
    setPasscode("");
    setJoinFlowMode("join");
    navigateTo("workspaceAdminTeams");
    clearError();
  }, [clearError]);

  const goToWorkspaceAdminTeamSettings = useCallback(() => {
    setPasscode("");
    setJoinFlowMode("join");
    navigateTo("workspaceAdminTeamSettings");
    clearError();
  }, [clearError]);

  const goToRoom = useCallback(
    (key: string) => {
      setRoomKey(key);
      setJoinFlowMode("join");
      navigateTo("room", key);
      clearError();
    },
    [clearError],
  );

  const startCreateFlow = useCallback(
    (teamId?: number) => {
      setPasscode("");
      setJoinFlowMode("create");
      setSelectedWorkspaceTeamId(teamId ?? null);
      navigateTo("create");
      clearError();
    },
    [clearError],
  );

  const startJoinFlow = useCallback(() => {
    setPasscode("");
    setJoinFlowMode("join");
    navigateTo("join");
    clearError();
  }, [clearError]);

  useUrlParams({
    onJoinRoom: (joinRoomKey) => {
      setRoomKey(joinRoomKey);
      navigateTo("join");
    },
  });

  useEffect(() => {
    const parsed = parsePath(location.pathname);
    if (parsed.roomKey) {
      setRoomKey(parsed.roomKey);
    }
    clearError();
  }, [clearError, location.pathname]);

  useUserPersistence({
    name,
    avatar: selectedAvatar,
  });

  const stateValue = useMemo<SessionStateContextValue>(
    () => ({
      joinFlowMode,
      name,
      roomKey,
      passcode,
      selectedAvatar,
      selectedWorkspaceTeamId,
    }),
    [
      joinFlowMode,
      name,
      roomKey,
      passcode,
      selectedAvatar,
      selectedWorkspaceTeamId,
    ],
  );

  const actionsValue = useMemo<SessionActionsContextValue>(
    () => ({
      setJoinFlowMode,
      setName,
      setRoomKey,
      setPasscode,
      setSelectedAvatar,
      setSelectedWorkspaceTeamId,
      goHome,
      goToLogin,
      goToWorkspace,
      goToWorkspaceProfile,
      goToWorkspaceSessions,
      goToWorkspaceAdmin,
      goToWorkspaceAdminTeams,
      goToWorkspaceAdminTeamSettings,
      goToRoom,
      startCreateFlow,
      startJoinFlow,
    }),
    [
      goHome,
      goToLogin,
      goToWorkspace,
      goToWorkspaceProfile,
      goToWorkspaceSessions,
      goToWorkspaceAdmin,
      goToWorkspaceAdminTeams,
      goToWorkspaceAdminTeamSettings,
      goToRoom,
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
