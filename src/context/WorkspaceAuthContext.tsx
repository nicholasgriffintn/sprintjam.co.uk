import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";

import {
  getCurrentUser,
  logout as logoutService,
  type WorkspaceUser,
  type Team,
} from "@/lib/workspace-service";

interface WorkspaceAuthContextValue {
  user: WorkspaceUser | null;
  teams: Team[];
  isLoading: boolean;
  isAuthenticated: boolean;
  refreshAuth: () => Promise<void>;
  logout: () => Promise<void>;
}

const WorkspaceAuthContext = createContext<WorkspaceAuthContextValue | null>(
  null,
);

export function WorkspaceAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<WorkspaceUser | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshAuth = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getCurrentUser();
      if (result) {
        setUser(result.user);
        setTeams(result.teams);
      } else {
        setUser(null);
        setTeams([]);
      }
    } catch {
      setUser(null);
      setTeams([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutService();
    } finally {
      setUser(null);
      setTeams([]);
    }
  }, []);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  const value = useMemo<WorkspaceAuthContextValue>(
    () => ({
      user,
      teams,
      isLoading,
      isAuthenticated: !!user,
      refreshAuth,
      logout,
    }),
    [user, teams, isLoading, refreshAuth, logout],
  );

  return (
    <WorkspaceAuthContext.Provider value={value}>
      {children}
    </WorkspaceAuthContext.Provider>
  );
}

export function useWorkspaceAuth(): WorkspaceAuthContextValue {
  const context = useContext(WorkspaceAuthContext);
  if (!context) {
    throw new Error(
      "useWorkspaceAuth must be used within WorkspaceAuthProvider",
    );
  }
  return context;
}
