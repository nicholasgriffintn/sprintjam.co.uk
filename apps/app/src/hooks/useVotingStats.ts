import { useCallback, useEffect, useState } from "react";

import {
  getBatchRoomStats,
  getRoomStats,
  getTeamStats,
  getUserRoomStats,
  type RoomStats,
  type TeamStats,
  type UserRoomStats,
} from "@/lib/stats-service";

export function useTeamVotingStats(teamId: number | null) {
  const [stats, setStats] = useState<TeamStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!teamId) {
      setStats(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await getTeamStats(teamId);
      setStats(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load team stats",
      );
      setStats(null);
    } finally {
      setIsLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { stats, isLoading, error, refetch };
}

export function useRoomVotingStats(roomKey: string | null) {
  const [stats, setStats] = useState<RoomStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!roomKey) {
      setStats(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await getRoomStats(roomKey);
      setStats(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load room stats",
      );
      setStats(null);
    } finally {
      setIsLoading(false);
    }
  }, [roomKey]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { stats, isLoading, error, refetch };
}

export function useUserRoomVotingStats(
  roomKey: string | null,
  userName: string | null,
) {
  const [stats, setStats] = useState<UserRoomStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!roomKey || !userName) {
      setStats(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await getUserRoomStats(roomKey, userName);
      setStats(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load user stats",
      );
      setStats(null);
    } finally {
      setIsLoading(false);
    }
  }, [roomKey, userName]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { stats, isLoading, error, refetch };
}

export function useBatchRoomStats(roomKeys: string[]) {
  const [stats, setStats] = useState<Record<string, RoomStats>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (roomKeys.length === 0) {
      setStats({});
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await getBatchRoomStats(roomKeys);
      setStats(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load room stats",
      );
      setStats({});
    } finally {
      setIsLoading(false);
    }
  }, [roomKeys]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { stats, isLoading, error, refetch };
}
