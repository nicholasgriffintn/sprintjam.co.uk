import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useUserPersistence } from "@/hooks/useUserPersistence";
import { useUrlParams } from "@/hooks/useUrlParams";
import type { AvatarId, ErrorKind } from "@/types";

export type AppScreen =
  | "welcome"
  | "create"
  | "join"
  | "room"
  | "404"
  | "privacy"
  | "terms";

interface SessionContextValue {
  screen: AppScreen;
  setScreen: (screen: AppScreen) => void;
  name: string;
  setName: (name: string) => void;
  roomKey: string;
  setRoomKey: (key: string) => void;
  passcode: string;
  setPasscode: (passcode: string) => void;
  selectedAvatar: AvatarId | null;
  setSelectedAvatar: (avatar: AvatarId | null) => void;
  error: string;
  errorKind: ErrorKind | null;
  setError: (message: string, kind?: ErrorKind | null) => void;
  clearError: () => void;
  goHome: () => void;
  startCreateFlow: () => void;
  startJoinFlow: () => void;
}

const SessionContext = createContext<SessionContextValue | undefined>(
  undefined,
);

function getScreenFromPath(path: string): AppScreen {
  if (path === "/" || !path) {
    return "welcome";
  }

  const pathWithoutQuery = path.split("?")[0];
  const pathWithoutTrailingSlash = pathWithoutQuery.endsWith("/")
    ? pathWithoutQuery.slice(0, -1)
    : pathWithoutQuery;
  return pathWithoutTrailingSlash === "/create"
    ? "create"
    : pathWithoutTrailingSlash === "/join"
      ? "join"
      : pathWithoutTrailingSlash === "/room"
        ? "room"
        : pathWithoutTrailingSlash === "/privacy"
          ? "privacy"
          : pathWithoutTrailingSlash === "/terms"
            ? "terms"
            : "404";
}

export const SessionProvider = ({
  currentPath,
  children,
}: {
  currentPath: string;
  children: ReactNode;
}) => {
  const screenFromPath = getScreenFromPath(currentPath);
  const [screen, setScreen] = useState<AppScreen>(screenFromPath);
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
    setScreen("welcome");
    clearError();
  }, [clearError]);

  const startCreateFlow = useCallback(() => {
    setPasscode("");
    setScreen("create");
    clearError();
  }, [clearError]);

  const startJoinFlow = useCallback(() => {
    setPasscode("");
    setScreen("join");
    clearError();
  }, [clearError]);

  useUrlParams({
    onJoinRoom: (joinRoomKey) => {
      setRoomKey(joinRoomKey);
      setScreen("join");
    },
  });

  useUserPersistence({
    name,
    onNameLoaded: setName,
  });

  const value = useMemo(
    () => ({
      screen,
      setScreen,
      name,
      setName,
      roomKey,
      setRoomKey,
      passcode,
      setPasscode,
      selectedAvatar,
      setSelectedAvatar,
      error,
      errorKind,
      setError,
      clearError,
      goHome,
      startCreateFlow,
      startJoinFlow,
    }),
    [
      screen,
      name,
      roomKey,
      passcode,
      selectedAvatar,
      error,
      errorKind,
      setError,
      clearError,
      goHome,
      startCreateFlow,
      startJoinFlow,
    ],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
};

export const useSession = (): SessionContextValue => {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession must be used within SessionProvider");
  }
  return ctx;
};
