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
import type { Team, WorkspaceUser } from "@sprintjam/types";

import { isWorkspacesEnabled } from "@/utils/feature-flags";
import { logout as logoutService } from "@/lib/workspace-service";

import { useWorkspaceProfile } from "@/lib/data/hooks";
import {
  WORKSPACE_PROFILE_DOCUMENT_KEY,
  ensureWorkspaceProfileCollectionReady,
  workspaceProfileCollection,
} from "@/lib/data/collections";

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
  const workspacesEnabled = isWorkspacesEnabled();
  const profile = useWorkspaceProfile(workspacesEnabled);
  const [isLoading, setIsLoading] = useState(workspacesEnabled);
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    if (!workspacesEnabled) {
      setIsLoading(false);
      return;
    }

    ensureWorkspaceProfileCollectionReady()
      .then(() => {
        setIsLoading(false);
      })
      .catch((error) => {
        console.error("Failed to initialize workspace auth", error);
        setIsLoading(false);
      });
  }, [workspacesEnabled]);

  const refreshAuth = useCallback(async () => {
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
  }, []);

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
    if (profile) {
      setIsLoading(false);
    }
  }, [profile]);

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
