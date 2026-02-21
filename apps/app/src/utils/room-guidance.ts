import type { RoomData } from "@/types";
import { getExtraVoteValueSet } from "@/utils/votingOptions";
import type { ExtraVoteOption, VoteValue } from "@sprintjam/types";

export type GuidancePhase =
  | "preVote"
  | "voting"
  | "revealedWideSpread"
  | "revealedConsensus";

export interface VoteSpreadSummary {
  totalVotes: number;
  numericVoteCount: number;
  unknownVoteCount: number;
  isWideSpread: boolean;
  highestVoteValue: VoteValue | null;
  lowestVoteValue: VoteValue | null;
  highestVoter: string | null;
  lowestVoter: string | null;
}

const normalizeVoteValue = (value: string | number) =>
  String(value).trim().toLowerCase();

const buildUnknownValueSet = (
  extraOptions: ExtraVoteOption[] = [],
): Set<string> => {
  const unknownValues = new Set<string>(["?", "❓"]);

  extraOptions.forEach((option) => {
    if (option.id === "unsure") {
      unknownValues.add(normalizeVoteValue(option.value));
      option.aliases?.forEach((alias) =>
        unknownValues.add(normalizeVoteValue(alias)),
      );
      return;
    }

    if (option.label.toLowerCase().includes("unsure")) {
      unknownValues.add(normalizeVoteValue(option.value));
    }

    option.aliases?.forEach((alias) => {
      if (normalizeVoteValue(alias).includes("?")) {
        unknownValues.add(normalizeVoteValue(alias));
      }
    });
  });

  return unknownValues;
};

export const getVoteSpreadSummary = (roomData: RoomData): VoteSpreadSummary => {
  const extraVoteValues = getExtraVoteValueSet(
    roomData.settings.extraVoteOptions ?? [],
  );
  const unknownValues = buildUnknownValueSet(
    roomData.settings.extraVoteOptions ?? [],
  );
  const votesEntries = Object.entries(roomData.votes);

  let unknownVoteCount = 0;
  const numericVotes: Array<{ user: string; value: number }> = [];

  votesEntries.forEach(([user, vote]) => {
    if (vote === null) return;
    const normalizedVote = normalizeVoteValue(vote);
    if (unknownValues.has(normalizedVote)) {
      unknownVoteCount += 1;
    }

    if (extraVoteValues.has(String(vote))) {
      return;
    }

    const numeric = Number(vote);
    if (!Number.isFinite(numeric)) {
      return;
    }

    numericVotes.push({ user, value: numeric });
  });

  const numericVoteValues = numericVotes.map((vote) => vote.value);
  const numericVoteCount = numericVoteValues.length;
  const totalVotes = votesEntries.filter(([, vote]) => vote !== null).length;

  let highestVoteValue: VoteValue | null = null;
  let lowestVoteValue: VoteValue | null = null;
  let highestVoter: string | null = null;
  let lowestVoter: string | null = null;

  if (numericVoteCount > 0) {
    let highest = numericVotes[0];
    let lowest = numericVotes[0];

    numericVotes.forEach((vote) => {
      if (vote.value > highest.value) highest = vote;
      if (vote.value < lowest.value) lowest = vote;
    });

    highestVoteValue = highest.value;
    lowestVoteValue = lowest.value;
    highestVoter = highest.user;
    lowestVoter = lowest.user;
  }

  const range =
    numericVoteCount >= 2
      ? Math.max(...numericVoteValues) - Math.min(...numericVoteValues)
      : 0;
  const uniqueVotes = new Set(numericVoteValues).size;

  const judgeSignalsWideSpread =
    roomData.settings.enableStructuredVoting &&
    (roomData.judgeMetadata?.needsDiscussion ||
      roomData.judgeMetadata?.confidence === "low");

  const isWideSpread =
    judgeSignalsWideSpread ||
    (numericVoteCount >= 2 && (range >= 8 || (uniqueVotes >= 3 && range >= 5)));

  return {
    totalVotes,
    numericVoteCount,
    unknownVoteCount,
    isWideSpread,
    highestVoteValue,
    lowestVoteValue,
    highestVoter,
    lowestVoter,
  };
};

export const getGuidancePhase = (
  roomData: RoomData,
  summary: VoteSpreadSummary,
): GuidancePhase => {
  if (roomData.showVotes) {
    return summary.isWideSpread ? "revealedWideSpread" : "revealedConsensus";
  }

  if (summary.totalVotes > 0) {
    return "voting";
  }

  return "preVote";
};
