interface Vote {
  roundId: string;
  userName: string;
  vote: string;
  roomKey?: string;
}

interface Round {
  roundId: string;
  roomKey: string;
  ticketId: string | null;
  roundEndedAt: number;
}

export interface TicketMetrics {
  totalTickets: number;
  firstRoundTickets: number;
  multiRoundTickets: number;
}

export interface VelocityData {
  ticketCount: number;
  hours: number;
}

export interface InsightMetrics {
  participationRate: number;
  firstRoundConsensusRate: number;
  discussionRate: number;
  estimationVelocity: number | null;
  questionMarkRate: number;
}

export function buildVoteCounts(
  votes: Vote[],
): Map<string, Map<string, number>> {
  const counts = new Map<string, Map<string, number>>();
  for (const vote of votes) {
    if (!counts.has(vote.roundId)) {
      counts.set(vote.roundId, new Map());
    }
    const roundCounts = counts.get(vote.roundId)!;
    roundCounts.set(vote.vote, (roundCounts.get(vote.vote) || 0) + 1);
  }
  return counts;
}

export function findConsensusVotes(
  voteCounts: Map<string, Map<string, number>>,
): Map<string, string> {
  const consensus = new Map<string, string>();
  for (const [roundId, counts] of voteCounts) {
    let maxVote = "";
    let maxCount = 0;
    for (const [vote, count] of counts) {
      if (count > maxCount) {
        maxCount = count;
        maxVote = vote;
      }
    }
    consensus.set(roundId, maxVote);
  }
  return consensus;
}

export function countRoundsPerTicket(rounds: Round[]): Map<string, number> {
  const roundsPerTicket = new Map<string, number>();
  for (const round of rounds) {
    if (round.ticketId) {
      const ticketKey = `${round.roomKey}:${round.ticketId}`;
      roundsPerTicket.set(ticketKey, (roundsPerTicket.get(ticketKey) ?? 0) + 1);
    }
  }
  return roundsPerTicket;
}

export function calculateTicketMetrics(
  roundsPerTicket: Map<string, number>,
): TicketMetrics {
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

  return { totalTickets, firstRoundTickets, multiRoundTickets };
}

export function buildRoomTimeRanges(
  rounds: Round[],
): Map<string, { min: number; max: number }> {
  const ranges = new Map<string, { min: number; max: number }>();
  for (const round of rounds) {
    const existing = ranges.get(round.roomKey);
    if (!existing) {
      ranges.set(round.roomKey, {
        min: round.roundEndedAt,
        max: round.roundEndedAt,
      });
    } else {
      existing.min = Math.min(existing.min, round.roundEndedAt);
      existing.max = Math.max(existing.max, round.roundEndedAt);
    }
  }
  return ranges;
}

export function buildTicketsByRoom(rounds: Round[]): Map<string, Set<string>> {
  const ticketsByRoom = new Map<string, Set<string>>();
  for (const round of rounds) {
    if (round.ticketId) {
      if (!ticketsByRoom.has(round.roomKey)) {
        ticketsByRoom.set(round.roomKey, new Set());
      }
      ticketsByRoom.get(round.roomKey)!.add(round.ticketId);
    }
  }
  return ticketsByRoom;
}

export function calculateVelocity(
  roomTimeRanges: Map<string, { min: number; max: number }>,
  ticketsByRoom: Map<string, Set<string>>,
): VelocityData {
  let ticketCount = 0;
  let hours = 0;

  for (const [roomKey, range] of roomTimeRanges) {
    const tickets = ticketsByRoom.get(roomKey);
    if (!tickets || tickets.size === 0) continue;

    const durationMs = range.max - range.min;
    if (durationMs <= 0) continue;

    hours += durationMs / (1000 * 60 * 60);
    ticketCount += tickets.size;
  }

  return { ticketCount, hours };
}

export function countQuestionMarkVotes(votes: Vote[]): number {
  return votes.filter((v) => v.vote === "?").length;
}

export function buildVotesPerRound(votes: Vote[]): Map<string, number> {
  const votesPerRound = new Map<string, number>();
  for (const vote of votes) {
    votesPerRound.set(vote.roundId, (votesPerRound.get(vote.roundId) ?? 0) + 1);
  }
  return votesPerRound;
}

export function buildParticipantsByRoom(
  votes: Vote[],
): Map<string, Set<string>> {
  const participants = new Map<string, Set<string>>();
  for (const vote of votes) {
    const roomKey = vote.roomKey;
    if (!roomKey) continue;
    if (!participants.has(roomKey)) {
      participants.set(roomKey, new Set());
    }
    participants.get(roomKey)!.add(vote.userName);
  }
  return participants;
}

export function calculateParticipationRate(
  rounds: Round[],
  votesPerRound: Map<string, number>,
  participantsByRoom: Map<string, Set<string>>,
): number {
  let participationSum = 0;
  let participationSamples = 0;

  for (const round of rounds) {
    const participants = participantsByRoom.get(round.roomKey)?.size ?? 0;
    if (participants === 0) continue;

    const roundVotesCount = votesPerRound.get(round.roundId) ?? 0;
    participationSum += (roundVotesCount / participants) * 100;
    participationSamples++;
  }

  return participationSamples > 0 ? participationSum / participationSamples : 0;
}

export function calculateInsightMetrics(
  ticketMetrics: TicketMetrics,
  velocity: VelocityData,
  participationRate: number,
  questionMarkVotes: number,
  totalVotes: number,
): InsightMetrics {
  const { totalTickets, firstRoundTickets, multiRoundTickets } = ticketMetrics;

  return {
    participationRate,
    firstRoundConsensusRate:
      totalTickets > 0 ? (firstRoundTickets / totalTickets) * 100 : 0,
    discussionRate:
      totalTickets > 0 ? (multiRoundTickets / totalTickets) * 100 : 0,
    estimationVelocity:
      velocity.hours > 0 ? velocity.ticketCount / velocity.hours : null,
    questionMarkRate:
      totalVotes > 0 ? (questionMarkVotes / totalVotes) * 100 : 0,
  };
}
