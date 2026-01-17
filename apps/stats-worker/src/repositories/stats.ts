import type { D1Database } from "@cloudflare/workers-types";
import { eq, inArray, desc } from "drizzle-orm";
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

export interface TeamInsightsResult {
  sessionsAnalyzed: number;
  totalTickets: number;
  totalRounds: number;
  participationRate: number;
  firstRoundConsensusRate: number;
  discussionRate: number;
  estimationVelocity: number | null;
  questionMarkRate: number;
}

export interface PaginationOptions {
  limit?: number;
  offset?: number;
}

export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 100;

export class StatsRepository {
  private db;
  private d1: D1Database;

  constructor(d1: D1Database) {
    this.d1 = d1;
    this.db = drizzle(d1);
  }

  async ingestRound(data: RoundIngestData): Promise<void> {
    const now = Math.floor(Date.now() / 1000);

    const inserted = await this.db
      .insert(roundVotes)
      .values({
        roomKey: data.roomKey,
        roundId: data.roundId,
        ticketId: data.ticketId ?? null,
        judgeScore: data.judgeScore ?? null,
        judgeMetadata: data.judgeMetadata
          ? JSON.stringify(data.judgeMetadata)
          : null,
        roundEndedAt: data.roundEndedAt,
        createdAt: now,
      })
      .onConflictDoNothing()
      .returning({ roundId: roundVotes.roundId });

    if (inserted.length === 0) {
      return;
    }

    if (data.votes.length > 0) {
      await this.db
        .insert(voteRecords)
        .values(
          data.votes.map((v) => ({
            roundId: data.roundId,
            userName: v.userName,
            vote: v.vote,
            structuredVotePayload: v.structuredVote
              ? JSON.stringify(v.structuredVote)
              : null,
            votedAt: v.votedAt,
          })),
        )
        .onConflictDoNothing();
    }

    await this.updateRoomStats(data.roomKey, data.votes.length);
  }

  private async updateRoomStats(
    roomKey: string,
    newVotes: number,
  ): Promise<void> {
    const now = Math.floor(Date.now() / 1000);

    await this.d1.batch([
      this.d1
        .prepare(
          `INSERT INTO room_stats (room_key, total_rounds, total_votes, last_updated_at)
         VALUES (?, 1, ?, ?)
         ON CONFLICT(room_key) DO UPDATE SET
           total_rounds = total_rounds + 1,
           total_votes = total_votes + excluded.total_votes,
           last_updated_at = excluded.last_updated_at`,
        )
        .bind(roomKey, newVotes, now),
    ]);
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
    const [rounds, allVotes] = await Promise.all([
      this.db
        .select()
        .from(roundVotes)
        .where(eq(roundVotes.roomKey, roomKey))
        .all(),
      this.db
        .select({
          roundId: voteRecords.roundId,
          userName: voteRecords.userName,
          vote: voteRecords.vote,
        })
        .from(voteRecords)
        .innerJoin(roundVotes, eq(voteRecords.roundId, roundVotes.roundId))
        .where(eq(roundVotes.roomKey, roomKey))
        .all(),
    ]);

    if (rounds.length === 0) return null;

    const userVotes = allVotes.filter((v) => v.userName === userName);
    if (userVotes.length === 0) return null;

    const voteDistribution: Record<string, number> = {};
    const roundsMap = new Map(rounds.map((r) => [r.roundId, r]));
    let judgeMatches = 0;
    let judgeComparisons = 0;

    for (const vote of userVotes) {
      voteDistribution[vote.vote] = (voteDistribution[vote.vote] || 0) + 1;

      const round = roundsMap.get(vote.roundId);
      if (round?.judgeScore) {
        judgeComparisons++;
        if (vote.vote === round.judgeScore) {
          judgeMatches++;
        }
      }
    }

    const roundVoteCounts = new Map<string, Map<string, number>>();
    for (const vote of allVotes) {
      if (!roundVoteCounts.has(vote.roundId)) {
        roundVoteCounts.set(vote.roundId, new Map());
      }
      const counts = roundVoteCounts.get(vote.roundId)!;
      counts.set(vote.vote, (counts.get(vote.vote) || 0) + 1);
    }

    const roundConsensus = new Map<string, string>();
    for (const [roundId, counts] of roundVoteCounts) {
      let maxVote = "";
      let maxCount = 0;
      for (const [vote, count] of counts) {
        if (count > maxCount) {
          maxCount = count;
          maxVote = vote;
        }
      }
      roundConsensus.set(roundId, maxVote);
    }

    let consensusMatches = 0;
    for (const vote of userVotes) {
      if (vote.vote === roundConsensus.get(vote.roundId)) {
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

  async getTeamStats(
    teamId: number,
    pagination?: PaginationOptions,
  ): Promise<TeamStatsResult | null> {
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

    const [rounds, allVotes] = await Promise.all([
      this.db
        .select()
        .from(roundVotes)
        .where(inArray(roundVotes.roomKey, roomKeys))
        .all(),
      roomKeys.length > 0
        ? this.db
            .select({
              roundId: voteRecords.roundId,
              userName: voteRecords.userName,
              vote: voteRecords.vote,
            })
            .from(voteRecords)
            .innerJoin(roundVotes, eq(voteRecords.roundId, roundVotes.roundId))
            .where(inArray(roundVotes.roomKey, roomKeys))
            .all()
        : Promise.resolve([]),
    ]);

    const roundsMap = new Map(rounds.map((r) => [r.roundId, r]));

    const roundVoteCounts = new Map<string, Map<string, number>>();
    for (const vote of allVotes) {
      if (!roundVoteCounts.has(vote.roundId)) {
        roundVoteCounts.set(vote.roundId, new Map());
      }
      const counts = roundVoteCounts.get(vote.roundId)!;
      counts.set(vote.vote, (counts.get(vote.vote) || 0) + 1);
    }

    const roundConsensus = new Map<string, string>();
    for (const [roundId, counts] of roundVoteCounts) {
      let maxVote = "";
      let maxCount = 0;
      for (const [vote, count] of counts) {
        if (count > maxCount) {
          maxCount = count;
          maxVote = vote;
        }
      }
      roundConsensus.set(roundId, maxVote);
    }

    const memberData = new Map<
      string,
      {
        votes: typeof allVotes;
        voteDistribution: Record<string, number>;
      }
    >();

    for (const vote of allVotes) {
      if (!memberData.has(vote.userName)) {
        memberData.set(vote.userName, { votes: [], voteDistribution: {} });
      }
      const data = memberData.get(vote.userName)!;
      data.votes.push(vote);
      data.voteDistribution[vote.vote] =
        (data.voteDistribution[vote.vote] || 0) + 1;
    }

    let totalConsensusMatches = 0;
    let totalVotesWithConsensus = 0;

    const memberStats: UserRoomStatsResult[] = [];
    for (const [userName, data] of memberData) {
      let consensusMatches = 0;
      let judgeMatches = 0;
      let judgeComparisons = 0;

      for (const vote of data.votes) {
        if (vote.vote === roundConsensus.get(vote.roundId)) {
          consensusMatches++;
          totalConsensusMatches++;
        }
        totalVotesWithConsensus++;

        const round = roundsMap.get(vote.roundId);
        if (round?.judgeScore) {
          judgeComparisons++;
          if (vote.vote === round.judgeScore) {
            judgeMatches++;
          }
        }
      }

      memberStats.push({
        userName,
        totalVotes: data.votes.length,
        participationRate:
          totalRounds > 0 ? (data.votes.length / totalRounds) * 100 : 0,
        consensusAlignment:
          data.votes.length > 0
            ? (consensusMatches / data.votes.length) * 100
            : 0,
        judgeAlignment:
          judgeComparisons > 0 ? (judgeMatches / judgeComparisons) * 100 : 0,
        voteDistribution: data.voteDistribution,
      });
    }

    memberStats.sort((a, b) => b.totalVotes - a.totalVotes);

    const limit = Math.min(
      pagination?.limit ?? DEFAULT_PAGE_SIZE,
      MAX_PAGE_SIZE,
    );
    const offset = pagination?.offset ?? 0;
    const paginatedMemberStats = memberStats.slice(offset, offset + limit);

    const avgParticipation =
      memberStats.length > 0
        ? memberStats.reduce((sum, m) => sum + m.participationRate, 0) /
          memberStats.length
        : 0;

    const consensusRate =
      totalVotesWithConsensus > 0
        ? (totalConsensusMatches / totalVotesWithConsensus) * 100
        : 0;

    return {
      totalMembers: memberStats.length,
      totalRounds,
      avgParticipation,
      consensusRate,
      memberStats: paginatedMemberStats,
    };
  }

  async getTeamInsights(
    teamId: number,
    options?: { limit?: number },
  ): Promise<TeamInsightsResult | null> {
    const limit = Math.min(options?.limit ?? 6, 12);
    const sessions = await this.db
      .select({
        roomKey: teamSessions.roomKey,
        completedAt: teamSessions.completedAt,
      })
      .from(teamSessions)
      .where(eq(teamSessions.teamId, teamId))
      .orderBy(desc(teamSessions.completedAt))
      .all();

    const completedSessions = sessions
      .filter((session) => session.completedAt)
      .sort(
        (a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0),
      )
      .slice(0, limit);

    if (completedSessions.length === 0) {
      return null;
    }

    const roomKeys = Array.from(
      new Set(completedSessions.map((session) => session.roomKey)),
    );

    const [rounds, votes] = await Promise.all([
      this.db
        .select()
        .from(roundVotes)
        .where(inArray(roundVotes.roomKey, roomKeys))
        .all(),
      this.db
        .select({
          roundId: voteRecords.roundId,
          userName: voteRecords.userName,
          vote: voteRecords.vote,
          roomKey: roundVotes.roomKey,
        })
        .from(voteRecords)
        .innerJoin(roundVotes, eq(voteRecords.roundId, roundVotes.roundId))
        .where(inArray(roundVotes.roomKey, roomKeys))
        .all(),
    ]);

    if (rounds.length === 0) {
      return null;
    }

    const roundsPerTicket = new Map<string, number>();
    const ticketsByRoom = new Map<string, Set<string>>();
    const roundsByRoom = new Map<
      string,
      { min: number; max: number }
    >();
    const votesPerRound = new Map<string, number>();
    const participantsByRoom = new Map<string, Set<string>>();

    for (const round of rounds) {
      if (round.ticketId) {
        roundsPerTicket.set(
          round.ticketId,
          (roundsPerTicket.get(round.ticketId) ?? 0) + 1,
        );
        if (!ticketsByRoom.has(round.roomKey)) {
          ticketsByRoom.set(round.roomKey, new Set());
        }
        ticketsByRoom.get(round.roomKey)!.add(round.ticketId);
      }

      const existing = roundsByRoom.get(round.roomKey);
      const endedAt = round.roundEndedAt;
      if (!existing) {
        roundsByRoom.set(round.roomKey, { min: endedAt, max: endedAt });
      } else {
        existing.min = Math.min(existing.min, endedAt);
        existing.max = Math.max(existing.max, endedAt);
      }
    }

    let questionMarkVotes = 0;
    for (const vote of votes) {
      votesPerRound.set(
        vote.roundId,
        (votesPerRound.get(vote.roundId) ?? 0) + 1,
      );
      if (vote.vote === "?") {
        questionMarkVotes++;
      }
      if (!participantsByRoom.has(vote.roomKey)) {
        participantsByRoom.set(vote.roomKey, new Set());
      }
      participantsByRoom.get(vote.roomKey)!.add(vote.userName);
    }

    let participationSum = 0;
    let participationSamples = 0;
    for (const round of rounds) {
      const participants = participantsByRoom.get(round.roomKey)?.size ?? 0;
      if (participants === 0) continue;
      const roundVotesCount = votesPerRound.get(round.roundId) ?? 0;
      participationSum += (roundVotesCount / participants) * 100;
      participationSamples++;
    }

    let totalTickets = 0;
    let firstRoundTickets = 0;
    let multiRoundTickets = 0;
    for (const count of roundsPerTicket.values()) {
      totalTickets++;
      if (count === 1) {
        firstRoundTickets++;
      } else if (count > 1) {
        multiRoundTickets++;
      }
    }

    let velocityTickets = 0;
    let velocityHours = 0;
    for (const [roomKey, range] of roundsByRoom) {
      const tickets = ticketsByRoom.get(roomKey);
      if (!tickets || tickets.size === 0) {
        continue;
      }
      const durationMs = range.max - range.min;
      if (durationMs <= 0) {
        continue;
      }
      const hours = durationMs / (1000 * 60 * 60);
      velocityTickets += tickets.size;
      velocityHours += hours;
    }

    const participationRate =
      participationSamples > 0 ? participationSum / participationSamples : 0;
    const firstRoundConsensusRate =
      totalTickets > 0 ? (firstRoundTickets / totalTickets) * 100 : 0;
    const discussionRate =
      totalTickets > 0 ? (multiRoundTickets / totalTickets) * 100 : 0;
    const estimationVelocity =
      velocityHours > 0 ? velocityTickets / velocityHours : null;
    const questionMarkRate =
      votes.length > 0 ? (questionMarkVotes / votes.length) * 100 : 0;

    return {
      sessionsAnalyzed: completedSessions.length,
      totalTickets,
      totalRounds: rounds.length,
      participationRate,
      firstRoundConsensusRate,
      discussionRate,
      estimationVelocity,
      questionMarkRate,
    };
  }
}
