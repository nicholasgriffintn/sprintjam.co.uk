import { QueryClient } from "@tanstack/react-query";
import { createCollection, type Collection } from "@tanstack/db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";

import { API_BASE_URL } from "../../constants";
import type { RoomData, ServerDefaults } from "../../types";

export const SERVER_DEFAULTS_DOCUMENT_KEY = "server-defaults";

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

export const serverDefaultsCollection = createCollection(
  queryCollectionOptions<ServerDefaults>({
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
  }),
);

export const roomsCollection = createCollection(
  queryCollectionOptions<RoomData>({
    id: "rooms",
    queryKey: ["rooms"],
    startSync: false,
    queryFn: async () => [],
    queryClient,
    getKey: (room) => room.key,
  }),
);

export const ensureServerDefaultsCollectionReady = createEnsureCollectionReady(
  serverDefaultsCollection,
);

export const ensureRoomsCollectionReady =
  createEnsureCollectionReady(roomsCollection);
