import type { D1Database } from "@cloudflare/workers-types";
import { eq, inArray, desc, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";

import {
  roundVotes,
  voteRecords,
  roomStats,
  teamSessions,
} from "@sprintjam/db/d1/schemas";

import {
  buildVoteCounts,
  findConsensusVotes,
  countRoundsPerTicket,
  calculateTicketMetrics,
  buildRoomTimeRanges,
  buildTicketsByRoom,
  calculateVelocity,
  countQuestionMarkVotes,
  buildVotesPerRound,
  buildParticipantsByRoom,
  calculateParticipationRate,
  calculateInsightMetrics,
} from "../lib/metrics";

import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "../lib/pagination";

const MAX_SESSIONS_FOR_AGGREGATION = 1000;
const MAX_VOTES_FOR_AGGREGATION = 50000;

interface InsightsQueryData {
  rounds: Array<{
    roundId: string;
    roomKey: string;
    ticketId: string | null;
    roundEndedAt: number;
  }>;
  votes: Array<{
    roundId: string;
    userName: string;
    vote: string;
    roomKey: string;
  }>;
}

interface InsightsResult {
  sessionsAnalyzed: number;
  totalTickets: number;
  totalRounds: number;
  participationRate: number;
  firstRoundConsensusRate: number;
  discussionRate: number;
  estimationVelocity: number | null;
  questionMarkRate: number;
}

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
  type: "reset" | "next_ticket";
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

export interface WorkspaceInsightsResult {
  totalVotes: number;
  totalRounds: number;
  totalTickets: number;
  participationRate: number;
  firstRoundConsensusRate: number;
  discussionRate: number;
  estimationVelocity: number | null;
  questionMarkRate: number;
  teamCount: number;
  sessionsAnalyzed: number;
  topContributors: Array<{
    userName: string;
    totalVotes: number;
    participationRate: number;
    consensusAlignment: number;
  }>;
}

export interface SessionStatsResult {
  roomKey: string;
  totalRounds: number;
  totalVotes: number;
  uniqueParticipants: number;
  participationRate: number;
  consensusRate: number;
  firstRoundConsensusRate: number;
  discussionRate: number;
  estimationVelocity: number | null;
  durationMinutes: number | null;
}

export interface PaginationOptions {
  limit: number;
  offset: number;
}

export class StatsRepository {
  private db;

  constructor(d1: D1Database) {
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
        type: data.type,
        createdAt: now,
      })
      .onConflictDoNothing()
      .returning({ roundId: roundVotes.roundId });

    if (inserted.length === 0) return;

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

    await this.db
      .insert(roomStats)
      .values({
        roomKey,
        totalRounds: 1,
        totalVotes: newVotes,
        lastUpdatedAt: now,
      })
      .onConflictDoUpdate({
        target: roomStats.roomKey,
        set: {
          totalRounds: sql`${roomStats.totalRounds} + 1`,
          totalVotes: sql`${roomStats.totalVotes} + ${newVotes}`,
          lastUpdatedAt: now,
        },
      });
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

    const roundsMap = new Map(rounds.map((r) => [r.roundId, r]));
    const voteDistribution: Record<string, number> = {};
    let judgeMatches = 0;
    let judgeComparisons = 0;

    for (const vote of userVotes) {
      voteDistribution[vote.vote] = (voteDistribution[vote.vote] || 0) + 1;

      const round = roundsMap.get(vote.roundId);
      if (round?.judgeScore) {
        judgeComparisons++;
        if (vote.vote === round.judgeScore) judgeMatches++;
      }
    }

    const roundConsensus = findConsensusVotes(buildVoteCounts(allVotes));

    let consensusMatches = 0;
    for (const vote of userVotes) {
      if (vote.vote === roundConsensus.get(vote.roundId)) consensusMatches++;
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
      .orderBy(desc(teamSessions.createdAt))
      .limit(MAX_SESSIONS_FOR_AGGREGATION)
      .all();

    if (sessions.length === 0) return null;

    const roomKeys = sessions.map((s) => s.roomKey);
    const stats = await this.getBatchRoomStats(roomKeys);

    let totalRounds = 0;
    for (const s of stats.values()) {
      totalRounds += s.totalRounds;
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
            .limit(MAX_VOTES_FOR_AGGREGATION)
            .all()
        : Promise.resolve([]),
    ]);

    const roundsMap = new Map(rounds.map((r) => [r.roundId, r]));
    const roundConsensus = findConsensusVotes(buildVoteCounts(allVotes));

    const memberData = new Map<
      string,
      { votes: typeof allVotes; voteDistribution: Record<string, number> }
    >();

    for (const vote of allVotes) {
      const existing = memberData.get(vote.userName) ?? {
        votes: [],
        voteDistribution: {},
      };
      existing.votes.push(vote);
      existing.voteDistribution[vote.vote] =
        (existing.voteDistribution[vote.vote] || 0) + 1;
      memberData.set(vote.userName, existing);
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
          if (vote.vote === round.judgeScore) judgeMatches++;
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
      pagination?.limit ?? DEFAULT_PAGE_SIZE ?? 50,
      MAX_PAGE_SIZE ?? 100,
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
    const limit = Math.min(options?.limit ?? 6, 100);
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
      .filter((s) => s.completedAt)
      .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))
      .slice(0, limit);

    if (completedSessions.length === 0) return null;

    const roomKeys = [...new Set(completedSessions.map((s) => s.roomKey))];
    const data = await this.queryInsightsData(roomKeys);

    if (data.rounds.length === 0) return null;

    const baseMetrics = this.calculateBaseMetrics(data);
    const metrics = this.calculateInsights(data, baseMetrics);

    return {
      sessionsAnalyzed: completedSessions.length,
      ...metrics,
    };
  }

  async getWorkspaceInsights(
    teamIds: number[],
    options?: { sessionsLimit?: number; contributorsLimit?: number },
  ): Promise<WorkspaceInsightsResult | null> {
    const sessionsLimit = Math.min(options?.sessionsLimit ?? 20, 100);
    const contributorsLimit = Math.min(options?.contributorsLimit ?? 10, 100);

    if (teamIds.length === 0) return null;

    const sessions = await this.db
      .select({
        roomKey: teamSessions.roomKey,
        teamId: teamSessions.teamId,
        completedAt: teamSessions.completedAt,
      })
      .from(teamSessions)
      .where(inArray(teamSessions.teamId, teamIds))
      .orderBy(desc(teamSessions.completedAt))
      .all();

    const completedSessions = sessions
      .filter((s) => s.completedAt)
      .slice(0, sessionsLimit);

    if (completedSessions.length === 0) return null;

    const roomKeys = [...new Set(completedSessions.map((s) => s.roomKey))];
    const uniqueTeamIds = new Set(completedSessions.map((s) => s.teamId));
    const data = await this.queryInsightsData(roomKeys);

    if (data.rounds.length === 0) return null;

    const baseMetrics = this.calculateBaseMetrics(data);
    const metrics = this.calculateInsights(data, baseMetrics);

    const topContributors = this.calculateTopContributors(
      data.votes,
      data.rounds.length,
      contributorsLimit,
    );

    return {
      totalVotes: data.votes.length,
      ...metrics,
      teamCount: uniqueTeamIds.size,
      sessionsAnalyzed: completedSessions.length,
      topContributors,
    };
  }

  async getSessionStats(roomKey: string): Promise<SessionStatsResult | null> {
    const [rounds, votes] = await Promise.all([
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

    return this.calculateSessionStats(roomKey, rounds, votes);
  }

  async getBatchSessionStats(
    roomKeys: string[],
  ): Promise<Map<string, SessionStatsResult>> {
    if (roomKeys.length === 0) return new Map();

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

    const roundsByRoom = new Map<string, typeof rounds>();
    const votesByRoom = new Map<string, typeof votes>();

    for (const round of rounds) {
      const existing = roundsByRoom.get(round.roomKey) ?? [];
      existing.push(round);
      roundsByRoom.set(round.roomKey, existing);
    }

    for (const vote of votes) {
      const existing = votesByRoom.get(vote.roomKey) ?? [];
      existing.push(vote);
      votesByRoom.set(vote.roomKey, existing);
    }

    const results = new Map<string, SessionStatsResult>();
    for (const roomKey of roomKeys) {
      const roomRounds = roundsByRoom.get(roomKey) ?? [];
      const roomVotes = votesByRoom.get(roomKey) ?? [];
      if (roomRounds.length === 0) continue;

      results.set(
        roomKey,
        this.calculateSessionStats(roomKey, roomRounds, roomVotes),
      );
    }

    return results;
  }

  private async queryInsightsData(
    roomKeys: string[],
  ): Promise<InsightsQueryData> {
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

    return { rounds, votes };
  }

  private calculateBaseMetrics(data: InsightsQueryData) {
    const roundsPerTicket = countRoundsPerTicket(data.rounds);
    const ticketMetrics = calculateTicketMetrics(roundsPerTicket);
    const roomTimeRanges = buildRoomTimeRanges(data.rounds);
    const ticketsByRoom = buildTicketsByRoom(data.rounds);
    const velocity = calculateVelocity(roomTimeRanges, ticketsByRoom);

    const votesPerRound = buildVotesPerRound(data.votes);
    const participantsByRoom = buildParticipantsByRoom(data.votes);
    const participationRate = calculateParticipationRate(
      data.rounds,
      votesPerRound,
      participantsByRoom,
    );

    const questionMarkVotes = countQuestionMarkVotes(data.votes);

    return {
      ticketMetrics,
      velocity,
      participationRate,
      questionMarkVotes,
      totalVotes: data.votes.length,
    };
  }

  private calculateInsights(
    data: InsightsQueryData,
    baseMetrics: ReturnType<typeof this.calculateBaseMetrics>,
  ): Omit<InsightsResult, "sessionsAnalyzed"> {
    const metrics = calculateInsightMetrics(
      baseMetrics.ticketMetrics,
      baseMetrics.velocity,
      baseMetrics.participationRate,
      baseMetrics.questionMarkVotes,
      baseMetrics.totalVotes,
    );

    return {
      ...metrics,
      totalTickets: baseMetrics.ticketMetrics.totalTickets,
      totalRounds: data.rounds.length,
    };
  }

  private calculateTopContributors(
    votes: InsightsQueryData["votes"],
    totalRounds: number,
    limit: number,
  ): WorkspaceInsightsResult["topContributors"] {
    const roundConsensus = findConsensusVotes(buildVoteCounts(votes));

    const contributorData = new Map<
      string,
      { voteCount: number; consensusMatches: number }
    >();

    for (const vote of votes) {
      const existing = contributorData.get(vote.userName) ?? {
        voteCount: 0,
        consensusMatches: 0,
      };
      existing.voteCount++;
      if (vote.vote === roundConsensus.get(vote.roundId)) {
        existing.consensusMatches++;
      }
      contributorData.set(vote.userName, existing);
    }

    return [...contributorData.entries()]
      .map(([userName, data]) => ({
        userName,
        totalVotes: data.voteCount,
        participationRate:
          totalRounds > 0 ? (data.voteCount / totalRounds) * 100 : 0,
        consensusAlignment:
          data.voteCount > 0
            ? (data.consensusMatches / data.voteCount) * 100
            : 0,
      }))
      .sort((a, b) => b.totalVotes - a.totalVotes)
      .slice(0, limit);
  }

  private calculateSessionStats(
    roomKey: string,
    rounds: Array<{
      roundId: string;
      roomKey: string;
      ticketId: string | null;
      roundEndedAt: number;
    }>,
    votes: Array<{ roundId: string; userName: string; vote: string }>,
  ): SessionStatsResult {
    const roundsPerTicket = new Map<string, number>();
    let minTime = Number.POSITIVE_INFINITY;
    let maxTime = 0;

    for (const round of rounds) {
      if (round.ticketId) {
        roundsPerTicket.set(
          round.ticketId,
          (roundsPerTicket.get(round.ticketId) ?? 0) + 1,
        );
      }
      minTime = Math.min(minTime, round.roundEndedAt);
      maxTime = Math.max(maxTime, round.roundEndedAt);
    }

    const uniqueParticipants = new Set(votes.map((v) => v.userName));
    const votesPerRound = buildVotesPerRound(votes);
    const roundConsensus = findConsensusVotes(buildVoteCounts(votes));

    let consensusVotes = 0;
    for (const vote of votes) {
      if (vote.vote === roundConsensus.get(vote.roundId)) consensusVotes++;
    }

    let participationSum = 0;
    for (const round of rounds) {
      const roundVotesCount = votesPerRound.get(round.roundId) ?? 0;
      if (uniqueParticipants.size > 0) {
        participationSum += (roundVotesCount / uniqueParticipants.size) * 100;
      }
    }

    const ticketMetrics = calculateTicketMetrics(roundsPerTicket);
    const durationMs = maxTime > minTime ? maxTime - minTime : 0;
    const durationMinutes = durationMs > 0 ? durationMs / (1000 * 60) : null;
    const durationHours = durationMs > 0 ? durationMs / (1000 * 60 * 60) : 0;

    return {
      roomKey,
      totalRounds: rounds.length,
      totalVotes: votes.length,
      uniqueParticipants: uniqueParticipants.size,
      participationRate:
        rounds.length > 0 ? participationSum / rounds.length : 0,
      consensusRate:
        votes.length > 0 ? (consensusVotes / votes.length) * 100 : 0,
      firstRoundConsensusRate:
        ticketMetrics.totalTickets > 0
          ? (ticketMetrics.firstRoundTickets / ticketMetrics.totalTickets) * 100
          : 0,
      discussionRate:
        ticketMetrics.totalTickets > 0
          ? (ticketMetrics.multiRoundTickets / ticketMetrics.totalTickets) * 100
          : 0,
      estimationVelocity:
        durationHours > 0 && ticketMetrics.totalTickets > 0
          ? ticketMetrics.totalTickets / durationHours
          : null,
      durationMinutes,
    };
  }
}
