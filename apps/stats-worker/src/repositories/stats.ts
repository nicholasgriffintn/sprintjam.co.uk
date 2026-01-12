import type { D1Database } from "@cloudflare/workers-types";
import { eq, sql, and, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";

import {
  roundVotes,
  voteRecords,
  roomStats,
  teamSessions,
} from "@sprintjam/db/d1/schemas";

export interface RoundIngestData {
  roomKey: string;
  roundId: string;
  ticketId?: string;
  votes: {
    userName: string;
    vote: string;
    structuredVote?: object;
    votedAt: number;
  }[];
  judgeScore?: string;
  judgeMetadata?: object;
  roundEndedAt: number;
}

export interface RoomStatsResult {
  roomKey: string;
  totalRounds: number;
  totalVotes: number;
  lastUpdatedAt: number;
}

export interface UserRoomStatsResult {
  userName: string;
  totalVotes: number;
  participationRate: number;
  consensusAlignment: number;
  judgeAlignment: number;
  voteDistribution: Record<string, number>;
}

export interface TeamStatsResult {
  totalMembers: number;
  totalRounds: number;
  avgParticipation: number;
  consensusRate: number;
  memberStats: UserRoomStatsResult[];
}

export class StatsRepository {
  private db;

  constructor(d1: D1Database) {
    this.db = drizzle(d1);
  }

  async ingestRound(data: RoundIngestData): Promise<void> {
    const now = Math.floor(Date.now() / 1000);

    await this.db.insert(roundVotes).values({
      roomKey: data.roomKey,
      roundId: data.roundId,
      ticketId: data.ticketId ?? null,
      judgeScore: data.judgeScore ?? null,
      judgeMetadata: data.judgeMetadata
        ? JSON.stringify(data.judgeMetadata)
        : null,
      roundEndedAt: data.roundEndedAt,
      createdAt: now,
    });

    if (data.votes.length > 0) {
      await this.db.insert(voteRecords).values(
        data.votes.map((v) => ({
          roundId: data.roundId,
          userName: v.userName,
          vote: v.vote,
          structuredVotePayload: v.structuredVote
            ? JSON.stringify(v.structuredVote)
            : null,
          votedAt: v.votedAt,
        })),
      );
    }

    await this.updateRoomStats(data.roomKey, data.votes.length);
  }

  private async updateRoomStats(
    roomKey: string,
    newVotes: number,
  ): Promise<void> {
    const now = Math.floor(Date.now() / 1000);

    const existing = await this.db
      .select()
      .from(roomStats)
      .where(eq(roomStats.roomKey, roomKey))
      .get();

    if (existing) {
      await this.db
        .update(roomStats)
        .set({
          totalRounds: existing.totalRounds + 1,
          totalVotes: existing.totalVotes + newVotes,
          lastUpdatedAt: now,
        })
        .where(eq(roomStats.roomKey, roomKey));
    } else {
      await this.db.insert(roomStats).values({
        roomKey,
        totalRounds: 1,
        totalVotes: newVotes,
        lastUpdatedAt: now,
      });
    }
  }

  async getRoomStats(roomKey: string): Promise<RoomStatsResult | null> {
    const result = await this.db
      .select()
      .from(roomStats)
      .where(eq(roomStats.roomKey, roomKey))
      .get();

    if (!result) return null;

    return {
      roomKey: result.roomKey,
      totalRounds: result.totalRounds,
      totalVotes: result.totalVotes,
      lastUpdatedAt: result.lastUpdatedAt,
    };
  }

  async getBatchRoomStats(
    roomKeys: string[],
  ): Promise<Map<string, RoomStatsResult>> {
    if (roomKeys.length === 0) return new Map();

    const results = await this.db
      .select()
      .from(roomStats)
      .where(inArray(roomStats.roomKey, roomKeys))
      .all();

    const map = new Map<string, RoomStatsResult>();
    for (const r of results) {
      map.set(r.roomKey, {
        roomKey: r.roomKey,
        totalRounds: r.totalRounds,
        totalVotes: r.totalVotes,
        lastUpdatedAt: r.lastUpdatedAt,
      });
    }
    return map;
  }

  async getUserRoomStats(
    roomKey: string,
    userName: string,
  ): Promise<UserRoomStatsResult | null> {
    const rounds = await this.db
      .select()
      .from(roundVotes)
      .where(eq(roundVotes.roomKey, roomKey))
      .all();

    if (rounds.length === 0) return null;

    const roundIds = rounds.map((r) => r.roundId);
    const userVotes = await this.db
      .select()
      .from(voteRecords)
      .where(
        and(
          inArray(voteRecords.roundId, roundIds),
          eq(voteRecords.userName, userName),
        ),
      )
      .all();

    if (userVotes.length === 0) return null;

    const voteDistribution: Record<string, number> = {};
    let judgeMatches = 0;
    let judgeComparisons = 0;

    for (const vote of userVotes) {
      voteDistribution[vote.vote] = (voteDistribution[vote.vote] || 0) + 1;

      const round = rounds.find((r) => r.roundId === vote.roundId);
      if (round?.judgeScore) {
        judgeComparisons++;
        if (vote.vote === round.judgeScore) {
          judgeMatches++;
        }
      }
    }

    const allVotesForRounds = await this.db
      .select()
      .from(voteRecords)
      .where(inArray(voteRecords.roundId, roundIds))
      .all();

    let consensusMatches = 0;
    for (const vote of userVotes) {
      const roundVotesForRound = allVotesForRounds.filter(
        (v) => v.roundId === vote.roundId,
      );
      const voteCounts: Record<string, number> = {};
      for (const v of roundVotesForRound) {
        voteCounts[v.vote] = (voteCounts[v.vote] || 0) + 1;
      }
      const consensus = Object.entries(voteCounts).sort(
        (a, b) => b[1] - a[1],
      )[0]?.[0];
      if (vote.vote === consensus) {
        consensusMatches++;
      }
    }

    return {
      userName,
      totalVotes: userVotes.length,
      participationRate: (userVotes.length / rounds.length) * 100,
      consensusAlignment:
        userVotes.length > 0 ? (consensusMatches / userVotes.length) * 100 : 0,
      judgeAlignment:
        judgeComparisons > 0 ? (judgeMatches / judgeComparisons) * 100 : 0,
      voteDistribution,
    };
  }

  async getTeamStats(teamId: number): Promise<TeamStatsResult | null> {
    const sessions = await this.db
      .select()
      .from(teamSessions)
      .where(eq(teamSessions.teamId, teamId))
      .all();

    if (sessions.length === 0) return null;

    const roomKeys = sessions.map((s) => s.roomKey);
    const stats = await this.getBatchRoomStats(roomKeys);

    let totalRounds = 0;
    let totalVotes = 0;
    for (const s of stats.values()) {
      totalRounds += s.totalRounds;
      totalVotes += s.totalVotes;
    }

    const rounds = await this.db
      .select()
      .from(roundVotes)
      .where(inArray(roundVotes.roomKey, roomKeys))
      .all();

    const roundIds = rounds.map((r) => r.roundId);
    const allVotes =
      roundIds.length > 0
        ? await this.db
            .select()
            .from(voteRecords)
            .where(inArray(voteRecords.roundId, roundIds))
            .all()
        : [];

    const memberVoteCounts = new Map<string, number>();
    for (const vote of allVotes) {
      memberVoteCounts.set(
        vote.userName,
        (memberVoteCounts.get(vote.userName) || 0) + 1,
      );
    }

    const memberStats: UserRoomStatsResult[] = [];
    for (const [userName, voteCount] of memberVoteCounts) {
      const userVotes = allVotes.filter((v) => v.userName === userName);
      const voteDistribution: Record<string, number> = {};
      for (const v of userVotes) {
        voteDistribution[v.vote] = (voteDistribution[v.vote] || 0) + 1;
      }

      memberStats.push({
        userName,
        totalVotes: voteCount,
        participationRate:
          totalRounds > 0 ? (voteCount / totalRounds) * 100 : 0,
        consensusAlignment: 0,
        judgeAlignment: 0,
        voteDistribution,
      });
    }

    const avgParticipation =
      memberStats.length > 0
        ? memberStats.reduce((sum, m) => sum + m.participationRate, 0) /
          memberStats.length
        : 0;

    return {
      totalMembers: memberStats.length,
      totalRounds,
      avgParticipation,
      consensusRate: 0,
      memberStats,
    };
  }
}
