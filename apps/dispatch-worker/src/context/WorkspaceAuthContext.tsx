import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";

import { logout as logoutService } from "@/lib/workspace-service";
import type { Team, WorkspaceUser } from "@/lib/workspace-service";
import { useWorkspaceProfile } from "@/lib/data/hooks";
import {
  WORKSPACE_PROFILE_DOCUMENT_KEY,
  ensureWorkspaceProfileCollectionReady,
  workspaceProfileCollection,
} from "@/lib/data/collections";
import { useSessionState } from "./SessionContext";

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
  const { screen } = useSessionState();
  const shouldLoadProfile = screen === "workspace";
  const profile = useWorkspaceProfile(shouldLoadProfile);
  const [isLoading, setIsLoading] = useState(true);

  const refreshAuth = useCallback(async () => {
    if (!shouldLoadProfile) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      await ensureWorkspaceProfileCollectionReady();
      await workspaceProfileCollection.utils.refetch({ throwOnError: false });
    } catch (error) {
      console.error("Failed to refresh workspace auth", error);
      workspaceProfileCollection.utils.writeDelete(
        WORKSPACE_PROFILE_DOCUMENT_KEY,
      );
    } finally {
      setIsLoading(false);
    }
  }, [shouldLoadProfile]);

  const logout = useCallback(async () => {
    try {
      await logoutService();
      await ensureWorkspaceProfileCollectionReady();
      workspaceProfileCollection.utils.writeDelete(
        WORKSPACE_PROFILE_DOCUMENT_KEY,
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!shouldLoadProfile) {
      setIsLoading(false);
      return;
    }

    if (profile) {
      setIsLoading(false);
    }
  }, [profile, shouldLoadProfile]);

  const value = useMemo<WorkspaceAuthContextValue>(
    () => ({
      user: profile?.user ?? null,
      teams: profile?.teams ?? [],
      isLoading,
      isAuthenticated: Boolean(profile?.user),
      refreshAuth,
      logout,
    }),
    [profile, isLoading, refreshAuth, logout],
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
