import { API_BASE_URL } from "@/constants";

import { workspaceRequest } from "./workspace-service";

export interface RoomStats {
  roomKey: string;
  totalRounds: number;
  totalVotes: number;
  lastUpdatedAt: number;
}

export interface UserRoomStats {
  userName: string;
  totalVotes: number;
  participationRate: number;
  consensusAlignment: number;
  judgeAlignment: number;
  voteDistribution: Record<string, number>;
}

export interface TeamStats {
  totalMembers: number;
  totalRounds: number;
  avgParticipation: number;
  consensusRate: number;
  memberStats: UserRoomStats[];
}

const STATS_API_BASE = `${API_BASE_URL}/stats`;

export async function getRoomStats(roomKey: string): Promise<RoomStats | null> {
  try {
    const data = await workspaceRequest<{ stats: RoomStats }>(
      `${STATS_API_BASE}/room/${encodeURIComponent(roomKey)}`,
    );
    return data.stats;
  } catch {
    return null;
  }
}

export async function getUserRoomStats(
  roomKey: string,
  userName: string,
): Promise<UserRoomStats | null> {
  try {
    const data = await workspaceRequest<{ stats: UserRoomStats }>(
      `${STATS_API_BASE}/room/${encodeURIComponent(roomKey)}/user/${encodeURIComponent(userName)}`,
    );
    return data.stats;
  } catch {
    return null;
  }
}

export async function getBatchRoomStats(
  roomKeys: string[],
): Promise<Record<string, RoomStats>> {
  if (roomKeys.length === 0) return {};

  try {
    const data = await workspaceRequest<{ stats: Record<string, RoomStats> }>(
      `${STATS_API_BASE}/rooms?keys=${roomKeys.map(encodeURIComponent).join(",")}`,
    );
    return data.stats;
  } catch {
    return {};
  }
}

export async function getTeamStats(teamId: number): Promise<TeamStats | null> {
  try {
    const data = await workspaceRequest<{ stats: TeamStats }>(
      `${STATS_API_BASE}/team/${teamId}`,
    );
    return data.stats;
  } catch {
    return null;
  }
}
