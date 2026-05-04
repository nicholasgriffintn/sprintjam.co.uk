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
  const [resolvedProfile, setResolvedProfile] =
    useState<WorkspaceAuthProfile | null>(initialProfile);
  const profile = workspacesEnabled ? resolvedProfile : null;
  const [isLoading, setIsLoading] = useState(false);
  const revalidator = useRevalidator();

  useEffect(() => {
    setResolvedProfile(initialProfile);
  }, [initialProfile]);

  const refreshAuth = useCallback(async () => {
    setIsLoading(true);
    try {
      await revalidator.revalidate();
    } catch (error) {
      console.error("Failed to refresh workspace auth", error);
      setResolvedProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, [revalidator]);

  const logout = useCallback(async () => {
    try {
      await logoutService();
      setResolvedProfile(null);
      await revalidator.revalidate();
    } finally {
      setIsLoading(false);
    }
  }, [revalidator]);

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
