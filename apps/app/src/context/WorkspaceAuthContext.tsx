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

function seedCollection(profile: WorkspaceAuthProfile | null) {
  if (profile) {
    workspaceProfileCollection.utils.writeUpsert(profile);
  } else if (workspaceProfileCollection.get(WORKSPACE_PROFILE_DOCUMENT_KEY)) {
    workspaceProfileCollection.utils.writeDelete(
      WORKSPACE_PROFILE_DOCUMENT_KEY,
    );
  }
}

export function WorkspaceAuthProvider({
  children,
  initialProfile = null,
}: {
  children: ReactNode;
  initialProfile?:
    | WorkspaceAuthProfile
    | null
    | Promise<WorkspaceAuthProfile | null>;
}) {
  const workspacesEnabled = isWorkspacesEnabled();
  const collectionProfile = useWorkspaceProfile(workspacesEnabled);
  const [resolvedProfile, setResolvedProfile] =
    useState<WorkspaceAuthProfile | null>(
      initialProfile instanceof Promise ? null : (initialProfile ?? null),
    );
  const profile = collectionProfile ?? resolvedProfile;
  const [isLoading, setIsLoading] = useState(false);
  const revalidator = useRevalidator();

  useEffect(() => {
    if (!(initialProfile instanceof Promise)) {
      seedCollection(initialProfile ?? null);
      return;
    }

    initialProfile.then((resolved) => {
      setResolvedProfile(resolved);
      seedCollection(resolved);
    });
  }, []);

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
