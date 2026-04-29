import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRevalidator } from "react-router";
import type { WorkspaceTeam, WorkspaceUser } from "@sprintjam/types";
import type { WorkspaceAuthProfile } from "@sprintjam/types";

import { isWorkspacesEnabled } from "@/utils/feature-flags";
import { logout as logoutService } from "@/lib/workspace-service";

import { useWorkspaceProfile } from "@/lib/data/hooks";
import {
  WORKSPACE_PROFILE_DOCUMENT_KEY,
  workspaceProfileCollection,
} from "@/lib/data/collections";

interface WorkspaceAuthContextValue {
  user: WorkspaceUser | null;
  teams: WorkspaceTeam[];
  isLoading: boolean;
  isAuthenticated: boolean;
  refreshAuth: () => Promise<void>;
  logout: () => Promise<void>;
}

const WorkspaceAuthContext = createContext<WorkspaceAuthContextValue | null>(
  null,
);

export function WorkspaceAuthProvider({
  children,
  initialProfile = null,
}: {
  children: ReactNode;
  initialProfile?: WorkspaceAuthProfile | null;
}) {
  const workspacesEnabled = isWorkspacesEnabled();
  const collectionProfile = useWorkspaceProfile(workspacesEnabled);
  const profile = collectionProfile ?? initialProfile;
  const [isLoading, setIsLoading] = useState(false);
  const revalidator = useRevalidator();

  useEffect(() => {
    if (!workspacesEnabled) {
      return;
    }

    if (initialProfile) {
      workspaceProfileCollection.utils.writeUpsert(initialProfile);
      return;
    }

    if (workspaceProfileCollection.get(WORKSPACE_PROFILE_DOCUMENT_KEY)) {
      workspaceProfileCollection.utils.writeDelete(
        WORKSPACE_PROFILE_DOCUMENT_KEY,
      );
    }
  }, [initialProfile, workspacesEnabled]);

  const refreshAuth = useCallback(async () => {
    setIsLoading(true);
    try {
      await revalidator.revalidate();
    } catch (error) {
      console.error("Failed to refresh workspace auth", error);
      if (workspaceProfileCollection.get(WORKSPACE_PROFILE_DOCUMENT_KEY)) {
        workspaceProfileCollection.utils.writeDelete(
          WORKSPACE_PROFILE_DOCUMENT_KEY,
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, [revalidator]);

  const logout = useCallback(async () => {
    try {
      await logoutService();
      if (workspaceProfileCollection.get(WORKSPACE_PROFILE_DOCUMENT_KEY)) {
        workspaceProfileCollection.utils.writeDelete(
          WORKSPACE_PROFILE_DOCUMENT_KEY,
        );
      }
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
