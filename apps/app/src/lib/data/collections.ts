import { QueryClient } from "@tanstack/react-query";
import { createCollection, type Collection } from "@tanstack/db";
import {
  queryCollectionOptions,
  type QueryCollectionConfig,
} from "@tanstack/query-db-collection";

import { API_BASE_URL } from "@/constants";
import { isWorkspacesEnabled } from "@/utils/feature-flags";
import {
  workspaceRequest,
  type WorkspaceProfile,
  type WorkspaceStats,
  type TeamSession,
} from "@/lib/workspace-service";
import type { RoomData, ServerDefaults } from "@/types";
import type { WheelData } from "@sprintjam/types";

export const SERVER_DEFAULTS_DOCUMENT_KEY = "server-defaults";
export const WORKSPACE_PROFILE_DOCUMENT_KEY = "workspace-profile";
export const WORKSPACE_STATS_DOCUMENT_KEY = "workspace-stats";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      retry: false,
      staleTime: Infinity,
    },
  },
});

function createEnsureCollectionReady(
  collection: Collection<any, any, any, any, any>,
) {
  let readyPromise: Promise<void> | null = null;

  return async () => {
    if (collection.isReady()) {
      return;
    }

    if (!readyPromise) {
      readyPromise = collection.preload().catch((error) => {
        readyPromise = null;
        throw error;
      });
    }

    await readyPromise;
  };
}

const serverDefaultsCollectionConfig = {
  id: "server-defaults",
  queryKey: ["server-defaults"],
  queryFn: async () => {
    const response = await fetch(`${API_BASE_URL}/defaults`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        errorText || `Failed to fetch defaults: ${response.status}`,
      );
    }

    const defaults = (await response.json()) as ServerDefaults;
    return [defaults];
  },
  getKey: () => SERVER_DEFAULTS_DOCUMENT_KEY,
  queryClient,
  staleTime: 1000 * 60 * 5,
} satisfies QueryCollectionConfig<ServerDefaults>;

export const serverDefaultsCollection = createCollection<
  ServerDefaults,
  string
>(queryCollectionOptions(serverDefaultsCollectionConfig));

const workspaceProfileCollectionConfig = {
  id: "workspace-profile",
  queryKey: ["workspace-profile"],
  startSync: false,
  queryFn: async () => {
    if (!isWorkspacesEnabled()) {
      return [];
    }

    try {
      const profile = await workspaceRequest<WorkspaceProfile>(
        `${API_BASE_URL}/auth/me`,
      );
      return [profile];
    } catch (error) {
      if (error instanceof Error && error.message === "Unauthorized") {
        return [];
      }
      throw error;
    }
  },
  getKey: () => WORKSPACE_PROFILE_DOCUMENT_KEY,
  queryClient,
  staleTime: 1000 * 60 * 5,
} satisfies QueryCollectionConfig<WorkspaceProfile>;

export const workspaceProfileCollection = createCollection<
  WorkspaceProfile,
  string
>(queryCollectionOptions(workspaceProfileCollectionConfig));

const workspaceStatsCollectionConfig = {
  id: "workspace-stats",
  queryKey: ["workspace-stats"],
  startSync: false,
  queryFn: async () => {
    const profile = workspaceProfileCollection.get(
      WORKSPACE_PROFILE_DOCUMENT_KEY,
    );
    if (!profile?.user) {
      return [];
    }

    try {
      const stats = await workspaceRequest<WorkspaceStats>(
        `${API_BASE_URL}/workspace/stats`,
      );
      return [stats];
    } catch (error) {
      if (error instanceof Error && error.message === "Unauthorized") {
        return [];
      }
      throw error;
    }
  },
  getKey: () => WORKSPACE_STATS_DOCUMENT_KEY,
  queryClient,
  staleTime: 1000 * 60 * 2,
} satisfies QueryCollectionConfig<WorkspaceStats>;

export const workspaceStatsCollection = createCollection<
  WorkspaceStats,
  string
>(queryCollectionOptions(workspaceStatsCollectionConfig));

const roomsCollectionConfig = {
  id: "rooms",
  queryKey: ["rooms"],
  startSync: false,
  queryFn: async () => [],
  queryClient,
  getKey: (room) => room.key,
} satisfies QueryCollectionConfig<RoomData>;

export const roomsCollection = createCollection<RoomData, string>(
  queryCollectionOptions(roomsCollectionConfig),
);

const wheelsCollectionConfig = {
  id: "wheels",
  queryKey: ["wheels"],
  startSync: false,
  queryFn: async () => [],
  queryClient,
  getKey: (wheel) => wheel.key,
} satisfies QueryCollectionConfig<WheelData>;

export const wheelsCollection = createCollection<WheelData, string>(
  queryCollectionOptions(wheelsCollectionConfig),
);

const teamSessionsCollectionConfig = {
  id: "team-sessions",
  queryKey: ["team-sessions"],
  startSync: false,
  queryFn: async () => [],
  queryClient,
  getKey: (session) => `${session.teamId}:${session.id}`,
} satisfies QueryCollectionConfig<TeamSession>;

export const teamSessionsCollection = createCollection<TeamSession, string>(
  queryCollectionOptions(teamSessionsCollectionConfig),
);

export const ensureServerDefaultsCollectionReady = createEnsureCollectionReady(
  serverDefaultsCollection,
);

export const ensureWorkspaceProfileCollectionReady =
  createEnsureCollectionReady(workspaceProfileCollection);

export const ensureWorkspaceStatsCollectionReady = createEnsureCollectionReady(
  workspaceStatsCollection,
);

export const ensureRoomsCollectionReady =
  createEnsureCollectionReady(roomsCollection);

export const ensureWheelsCollectionReady =
  createEnsureCollectionReady(wheelsCollection);

export const ensureTeamSessionsCollectionReady = createEnsureCollectionReady(
  teamSessionsCollection,
);
