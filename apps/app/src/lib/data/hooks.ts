import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";

import type { RoomData, ServerDefaults } from "@/types";
import {
  SERVER_DEFAULTS_DOCUMENT_KEY,
  WORKSPACE_PROFILE_DOCUMENT_KEY,
  WORKSPACE_STATS_DOCUMENT_KEY,
  roomsCollection,
  serverDefaultsCollection,
  teamSessionsCollection,
  workspaceProfileCollection,
  workspaceStatsCollection,
} from "./collections";
import type {
  TeamSession,
  WorkspaceProfile,
  WorkspaceStats,
} from "@/lib/workspace-service";

const noopSubscribe = () => () => {};

function createCollectionSubscriber(
  subscribeAll: (onChange: () => void) => () => void,
) {
  return (onChange: () => void) => subscribeAll(onChange);
}

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

export function useWorkspaceProfile(enabled = true): WorkspaceProfile | null {
  const subscribe = useMemo(
    () =>
      createCollectionSubscriber((onChange) => {
        if (!enabled) {
          return () => {};
        }

        const subscription = workspaceProfileCollection.subscribeChanges(
          () => onChange(),
          { includeInitialState: true },
        );

        return () => subscription.unsubscribe();
      }),
    [enabled],
  );

  const getSnapshot = () =>
    enabled
      ? (workspaceProfileCollection.get(WORKSPACE_PROFILE_DOCUMENT_KEY) ?? null)
      : null;

  return useSyncExternalStore(
    enabled ? subscribe : noopSubscribe,
    getSnapshot,
    getSnapshot,
  );
}

export function useWorkspaceStats(): WorkspaceStats | null {
  const subscribe = useMemo(
    () =>
      createCollectionSubscriber((onChange) => {
        const subscription = workspaceStatsCollection.subscribeChanges(
          () => onChange(),
          { includeInitialState: true },
        );

        return () => subscription.unsubscribe();
      }),
    [],
  );

  const getSnapshot = () =>
    workspaceStatsCollection.get(WORKSPACE_STATS_DOCUMENT_KEY) ?? null;

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useTeamSessions(teamId: number | null): TeamSession[] {
  const lastSnapshotRef = useRef<TeamSession[]>([]);

  const areSessionsEqual = (
    prev: TeamSession[],
    next: TeamSession[],
  ): boolean => {
    if (prev === next) return true;
    if (prev.length !== next.length) return false;
    for (let i = 0; i < prev.length; i++) {
      const prevItem = prev[i];
      const nextItem = next[i];
      if (
        prevItem.id !== nextItem.id ||
        prevItem.teamId !== nextItem.teamId ||
        prevItem.updatedAt !== nextItem.updatedAt ||
        prevItem.completedAt !== nextItem.completedAt ||
        prevItem.createdAt !== nextItem.createdAt
      ) {
        return false;
      }
    }
    return true;
  };

  const subscribe = useMemo(
    () =>
      createCollectionSubscriber((onChange) => {
        const subscription = teamSessionsCollection.subscribeChanges(
          () => onChange(),
          { includeInitialState: true },
        );

        return () => subscription.unsubscribe();
      }),
    [],
  );

  const getSnapshot = () => {
    if (teamId === null) {
      if (lastSnapshotRef.current.length === 0) {
        return lastSnapshotRef.current;
      }
      lastSnapshotRef.current = [];
      return lastSnapshotRef.current;
    }

    const filtered = Array.from(teamSessionsCollection.values()).filter(
      (session) => session.teamId === teamId,
    );

    if (areSessionsEqual(lastSnapshotRef.current, filtered)) {
      return lastSnapshotRef.current;
    }

    lastSnapshotRef.current = filtered;
    return lastSnapshotRef.current;
  };

  return useSyncExternalStore(
    teamId !== null ? subscribe : noopSubscribe,
    getSnapshot,
    getSnapshot,
  );
}
