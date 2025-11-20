import { useEffect, useMemo, useSyncExternalStore } from "react";

import type { RoomData, ServerDefaults } from "../../types";
import {
  SERVER_DEFAULTS_DOCUMENT_KEY,
  roomsCollection,
  serverDefaultsCollection,
} from "./collections";

const noopSubscribe = () => () => {};

/**
 * Subscribe to a collection using useSyncExternalStore.
 */
function createCollectionSubscriber(
  subscribeAll: (onChange: () => void) => () => void,
) {
  return (onChange: () => void) => subscribeAll(onChange);
}

/**
 * Returns the current server defaults and keeps them in sync with the collection.
 */
export function useServerDefaults(): ServerDefaults | null {
  useEffect(() => {
    serverDefaultsCollection
      .preload()
      .catch((error) =>
        console.error("Failed to preload server defaults", error),
      );
  }, []);

  const subscribe = useMemo(
    () =>
      createCollectionSubscriber((onChange) => {
        const subscription = serverDefaultsCollection.subscribeChanges(
          () => {
            onChange();
          },
          { includeInitialState: true },
        );

        return () => subscription.unsubscribe();
      }),
    [],
  );

  const getSnapshot = () =>
    serverDefaultsCollection.get(SERVER_DEFAULTS_DOCUMENT_KEY) ?? null;

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/**
 * Returns room data for a specific key and keeps it up to date with the collection.
 */
export function useRoomData(roomKey: string | null): RoomData | null {
  const subscribe = useMemo(
    () =>
      createCollectionSubscriber((onChange) => {
        const subscription = roomsCollection.subscribeChanges(
          () => {
            onChange();
          },
          { includeInitialState: true },
        );

        return () => subscription.unsubscribe();
      }),
    [],
  );

  const getSnapshot = () =>
    roomKey ? (roomsCollection.get(roomKey) ?? null) : null;

  return useSyncExternalStore(
    roomKey ? subscribe : noopSubscribe,
    getSnapshot,
    getSnapshot,
  );
}
