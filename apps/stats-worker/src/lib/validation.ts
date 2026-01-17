export const LIMITS = {
  MAX_VOTES_PER_ROUND: 100,
  MAX_USERNAME_LENGTH: 100,
  MAX_VOTE_LENGTH: 50,
  MAX_ROOM_KEY_LENGTH: 100,
  MAX_ROUND_ID_LENGTH: 100,
  MAX_TICKET_ID_LENGTH: 100,
  MAX_JUDGE_SCORE_LENGTH: 50,
  MAX_STRUCTURED_VOTE_SIZE: 10000,
  MAX_JUDGE_METADATA_SIZE: 10000,
  MAX_TYPE_LENGTH: 50,
} as const;

export type ValidationResult =
  | { valid: true }
  | { valid: false; error: string };

export interface VotePayload {
  userName: string;
  vote: string;
  structuredVote?: object;
  votedAt: number;
}

export interface RoundIngestPayload {
  roomKey: string;
  roundId: string;
  ticketId?: string;
  votes: VotePayload[];
  judgeScore?: string;
  judgeMetadata?: object;
  roundEndedAt: number;
  type: 'reset' | 'next_ticket';
}

function validateVote(vote: unknown, index: number): ValidationResult {
  if (!vote || typeof vote !== 'object') {
    return { valid: false, error: `votes[${index}] must be an object` };
  }

  const v = vote as Record<string, unknown>;

  if (
    typeof v.userName !== 'string' ||
    v.userName.length === 0 ||
    v.userName.length > LIMITS.MAX_USERNAME_LENGTH
  ) {
    return {
      valid: false,
      error: `votes[${index}].userName must be a non-empty string with max ${LIMITS.MAX_USERNAME_LENGTH} characters`,
    };
  }

  if (
    typeof v.vote !== 'string' ||
    v.vote.length === 0 ||
    v.vote.length > LIMITS.MAX_VOTE_LENGTH
  ) {
    return {
      valid: false,
      error: `votes[${index}].vote must be a non-empty string with max ${LIMITS.MAX_VOTE_LENGTH} characters`,
    };
  }

  if (typeof v.votedAt !== 'number' || v.votedAt < 0) {
    return {
      valid: false,
      error: `votes[${index}].votedAt must be a positive number`,
    };
  }

  if (v.structuredVote !== undefined) {
    const structuredVoteStr = JSON.stringify(v.structuredVote);
    if (structuredVoteStr.length > LIMITS.MAX_STRUCTURED_VOTE_SIZE) {
      return {
        valid: false,
        error: `votes[${index}].structuredVote exceeds max size of ${LIMITS.MAX_STRUCTURED_VOTE_SIZE} bytes`,
      };
    }
  }

  return { valid: true };
}

export function validateRoundIngestPayload(body: unknown): ValidationResult {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be an object' };
  }

  const b = body as Record<string, unknown>;

  if (
    !b.roomKey ||
    !b.roundId ||
    !b.votes ||
    b.roundEndedAt === undefined ||
    !b.type
  ) {
    return { valid: false, error: 'Missing required fields' };
  }

  if (
    typeof b.roomKey !== 'string' ||
    b.roomKey.length > LIMITS.MAX_ROOM_KEY_LENGTH
  ) {
    return {
      valid: false,
      error: `roomKey must be a string with max ${LIMITS.MAX_ROOM_KEY_LENGTH} characters`,
    };
  }

  if (
    typeof b.roundId !== 'string' ||
    b.roundId.length > LIMITS.MAX_ROUND_ID_LENGTH
  ) {
    return {
      valid: false,
      error: `roundId must be a string with max ${LIMITS.MAX_ROUND_ID_LENGTH} characters`,
    };
  }

  if (
    b.ticketId !== undefined &&
    (typeof b.ticketId !== 'string' ||
      b.ticketId.length > LIMITS.MAX_TICKET_ID_LENGTH)
  ) {
    return {
      valid: false,
      error: `ticketId must be a string with max ${LIMITS.MAX_TICKET_ID_LENGTH} characters`,
    };
  }

  if (typeof b.roundEndedAt !== 'number' || b.roundEndedAt < 0) {
    return { valid: false, error: 'roundEndedAt must be a positive number' };
  }

  if (!Array.isArray(b.votes)) {
    return { valid: false, error: 'votes must be an array' };
  }

  if (b.votes.length > LIMITS.MAX_VOTES_PER_ROUND) {
    return {
      valid: false,
      error: `Maximum ${LIMITS.MAX_VOTES_PER_ROUND} votes per round`,
    };
  }

  for (let i = 0; i < b.votes.length; i++) {
    const result = validateVote(b.votes[i], i);
    if (!result.valid) {
      return result;
    }
  }

  if (
    b.judgeScore !== undefined &&
    (typeof b.judgeScore !== 'string' ||
      b.judgeScore.length > LIMITS.MAX_JUDGE_SCORE_LENGTH)
  ) {
    return {
      valid: false,
      error: `judgeScore must be a string with max ${LIMITS.MAX_JUDGE_SCORE_LENGTH} characters`,
    };
  }

  if (b.judgeMetadata !== undefined) {
    const metadataStr = JSON.stringify(b.judgeMetadata);
    if (metadataStr.length > LIMITS.MAX_JUDGE_METADATA_SIZE) {
      return {
        valid: false,
        error: `judgeMetadata exceeds max size of ${LIMITS.MAX_JUDGE_METADATA_SIZE} bytes`,
      };
    }
  }

  if (
    typeof b.type !== 'string' ||
    b.type.length > LIMITS.MAX_TYPE_LENGTH ||
    (b.type !== 'reset' && b.type !== 'next_ticket')
  ) {
    return {
      valid: false,
      error: `type must be either "reset" or "next_ticket"`,
    };
  }

  return { valid: true };
}
