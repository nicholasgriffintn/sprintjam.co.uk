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

import {
  getWorkspaceAuthProfile,
  logout as logoutService,
} from "@/lib/workspace-service";

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
  initialProfile?:
    | WorkspaceAuthProfile
    | null
    | Promise<WorkspaceAuthProfile | null>;
}) {
  const isInitialProfilePromise =
    initialProfile !== null && typeof initialProfile === "object" && "then" in initialProfile;
  const [resolvedProfile, setResolvedProfile] =
    useState<WorkspaceAuthProfile | null>(
      isInitialProfilePromise ? null : initialProfile,
    );
  const profile = resolvedProfile;
  const [isLoading, setIsLoading] = useState(isInitialProfilePromise);
  const revalidator = useRevalidator();

  useEffect(() => {
    let isActive = true;

    if (initialProfile && "then" in initialProfile) {
      setIsLoading(true);
      initialProfile
        .then((profile) => {
          if (isActive) {
            setResolvedProfile(profile);
          }
        })
        .catch((error: unknown) => {
          if (
            error instanceof Error &&
            !/401|403|unauthori[sz]ed|forbidden/i.test(error.message)
          ) {
            console.error("Failed to load workspace auth", error);
          }
          if (isActive) {
            setResolvedProfile(null);
          }
        })
        .finally(() => {
          if (isActive) {
            setIsLoading(false);
          }
        });

      return () => {
        isActive = false;
      };
    }

    setResolvedProfile(initialProfile);
    setIsLoading(false);
  }, [initialProfile]);

  const refreshAuth = useCallback(async () => {
    setIsLoading(true);
    try {
      const profile = await getWorkspaceAuthProfile();
      setResolvedProfile(profile);
    } catch (error) {
      if (
        error instanceof Error &&
        !/401|403|unauthori[sz]ed|forbidden/i.test(error.message)
      ) {
        console.error("Failed to refresh workspace auth", error);
      }
      setResolvedProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

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
