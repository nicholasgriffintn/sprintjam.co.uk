import type {
  RecordStandupSessionStatsInput,
  RecordRetroSessionStatsInput,
  RecordWheelSessionStatsInput,
  RoundIngestPayload,
} from "@sprintjam/types";
import { isWorkspaceWheelMode } from "@sprintjam/utils";

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
  MAX_STANDUP_RESPONSES: 100,
  MAX_WHEEL_RESULTS: 100,
  MAX_WHEEL_ENTRIES: 200,
  MAX_WHEEL_WINNER_LENGTH: 200,
  MAX_RETRO_CARDS: 500,
  MAX_RETRO_ACTIONS: 100,
  MAX_RETRO_TEMPLATE_ID_LENGTH: 80,
  MAX_RETRO_TEMPLATE_NAME_LENGTH: 120,
} as const;

export type ValidationResult =
  | { valid: true }
  | { valid: false; error: string };

function validateVote(vote: unknown, index: number): ValidationResult {
  if (!vote || typeof vote !== "object") {
    return { valid: false, error: `votes[${index}] must be an object` };
  }

  const v = vote as Record<string, unknown>;

  if (
    typeof v.userName !== "string" ||
    v.userName.length === 0 ||
    v.userName.length > LIMITS.MAX_USERNAME_LENGTH
  ) {
    return {
      valid: false,
      error: `votes[${index}].userName must be a non-empty string with max ${LIMITS.MAX_USERNAME_LENGTH} characters`,
    };
  }

  if (
    typeof v.vote !== "string" ||
    v.vote.length === 0 ||
    v.vote.length > LIMITS.MAX_VOTE_LENGTH
  ) {
    return {
      valid: false,
      error: `votes[${index}].vote must be a non-empty string with max ${LIMITS.MAX_VOTE_LENGTH} characters`,
    };
  }

  if (typeof v.votedAt !== "number" || v.votedAt < 0) {
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
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Request body must be an object" };
  }

  const b = body as Partial<RoundIngestPayload> & Record<string, unknown>;

  if (
    !b.roomKey ||
    !b.roundId ||
    !b.votes ||
    b.roundEndedAt === undefined ||
    !b.type
  ) {
    return { valid: false, error: "Missing required fields" };
  }

  if (
    typeof b.roomKey !== "string" ||
    b.roomKey.length > LIMITS.MAX_ROOM_KEY_LENGTH
  ) {
    return {
      valid: false,
      error: `roomKey must be a string with max ${LIMITS.MAX_ROOM_KEY_LENGTH} characters`,
    };
  }

  if (
    typeof b.roundId !== "string" ||
    b.roundId.length > LIMITS.MAX_ROUND_ID_LENGTH
  ) {
    return {
      valid: false,
      error: `roundId must be a string with max ${LIMITS.MAX_ROUND_ID_LENGTH} characters`,
    };
  }

  if (
    b.ticketId !== undefined &&
    (typeof b.ticketId !== "string" ||
      b.ticketId.length > LIMITS.MAX_TICKET_ID_LENGTH)
  ) {
    return {
      valid: false,
      error: `ticketId must be a string with max ${LIMITS.MAX_TICKET_ID_LENGTH} characters`,
    };
  }

  if (typeof b.roundEndedAt !== "number" || b.roundEndedAt < 0) {
    return { valid: false, error: "roundEndedAt must be a positive number" };
  }

  if (!Array.isArray(b.votes)) {
    return { valid: false, error: "votes must be an array" };
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
    (typeof b.judgeScore !== "string" ||
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
    typeof b.type !== "string" ||
    b.type.length > LIMITS.MAX_TYPE_LENGTH ||
    (b.type !== "reset" && b.type !== "next_ticket")
  ) {
    return {
      valid: false,
      error: `type must be either "reset" or "next_ticket"`,
    };
  }

  return { valid: true };
}

export function validateStandupSessionStatsPayload(
  body: unknown,
): ValidationResult {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Request body must be an object" };
  }

  const b = body as Partial<RecordStandupSessionStatsInput>;

  if (!b.roomKey || b.totalParticipants === undefined || !b.responses) {
    return { valid: false, error: "Missing required fields" };
  }

  if (
    typeof b.roomKey !== "string" ||
    b.roomKey.length > LIMITS.MAX_ROOM_KEY_LENGTH
  ) {
    return {
      valid: false,
      error: `roomKey must be a string with max ${LIMITS.MAX_ROOM_KEY_LENGTH} characters`,
    };
  }

  if (
    typeof b.totalParticipants !== "number" ||
    !Number.isInteger(b.totalParticipants) ||
    b.totalParticipants < 0 ||
    b.totalParticipants > LIMITS.MAX_STANDUP_RESPONSES
  ) {
    return {
      valid: false,
      error: `totalParticipants must be an integer between 0 and ${LIMITS.MAX_STANDUP_RESPONSES}`,
    };
  }

  if (
    !Array.isArray(b.responses) ||
    b.responses.length > LIMITS.MAX_STANDUP_RESPONSES
  ) {
    return {
      valid: false,
      error: `responses must be an array with max ${LIMITS.MAX_STANDUP_RESPONSES} items`,
    };
  }

  for (const [index, response] of b.responses.entries()) {
    if (!response || typeof response !== "object") {
      return { valid: false, error: `responses[${index}] must be an object` };
    }

    if (
      typeof response.healthCheck !== "number" ||
      !Number.isInteger(response.healthCheck) ||
      response.healthCheck < 1 ||
      response.healthCheck > 5
    ) {
      return {
        valid: false,
        error: `responses[${index}].healthCheck must be an integer between 1 and 5`,
      };
    }

    if (typeof response.hasBlocker !== "boolean") {
      return {
        valid: false,
        error: `responses[${index}].hasBlocker must be a boolean`,
      };
    }

    if (
      response.blockerResolved !== undefined &&
      typeof response.blockerResolved !== "boolean"
    ) {
      return {
        valid: false,
        error: `responses[${index}].blockerResolved must be a boolean`,
      };
    }

    if (
      response.linkedTicketCount !== undefined &&
      (!Number.isInteger(response.linkedTicketCount) ||
        response.linkedTicketCount < 0)
    ) {
      return {
        valid: false,
        error: `responses[${index}].linkedTicketCount must be a non-negative integer`,
      };
    }

    if (
      response.hasKudos !== undefined &&
      typeof response.hasKudos !== "boolean"
    ) {
      return {
        valid: false,
        error: `responses[${index}].hasKudos must be a boolean`,
      };
    }
  }

  return { valid: true };
}

export function validateWheelSessionStatsPayload(
  body: unknown,
): ValidationResult {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Request body must be an object" };
  }

  const b = body as Partial<RecordWheelSessionStatsInput>;

  if (
    !b.roomKey ||
    !b.mode ||
    b.totalParticipants === undefined ||
    b.entryCount === undefined ||
    b.enabledEntryCount === undefined ||
    !b.results
  ) {
    return { valid: false, error: "Missing required fields" };
  }

  if (
    typeof b.roomKey !== "string" ||
    b.roomKey.length > LIMITS.MAX_ROOM_KEY_LENGTH
  ) {
    return {
      valid: false,
      error: `roomKey must be a string with max ${LIMITS.MAX_ROOM_KEY_LENGTH} characters`,
    };
  }

  if (!isWorkspaceWheelMode(b.mode)) {
    return {
      valid: false,
      error: "mode must be one of decision, reviewer, or facilitator",
    };
  }

  if (
    typeof b.totalParticipants !== "number" ||
    !Number.isInteger(b.totalParticipants) ||
    b.totalParticipants < 0 ||
    b.totalParticipants > LIMITS.MAX_WHEEL_ENTRIES
  ) {
    return {
      valid: false,
      error: `totalParticipants must be an integer between 0 and ${LIMITS.MAX_WHEEL_ENTRIES}`,
    };
  }

  if (
    typeof b.entryCount !== "number" ||
    !Number.isInteger(b.entryCount) ||
    b.entryCount < 0 ||
    b.entryCount > LIMITS.MAX_WHEEL_ENTRIES
  ) {
    return {
      valid: false,
      error: `entryCount must be an integer between 0 and ${LIMITS.MAX_WHEEL_ENTRIES}`,
    };
  }

  if (
    typeof b.enabledEntryCount !== "number" ||
    !Number.isInteger(b.enabledEntryCount) ||
    b.enabledEntryCount < 0 ||
    b.enabledEntryCount > b.entryCount
  ) {
    return {
      valid: false,
      error: "enabledEntryCount must be an integer between 0 and entryCount",
    };
  }

  if (
    !Array.isArray(b.results) ||
    b.results.length > LIMITS.MAX_WHEEL_RESULTS
  ) {
    return {
      valid: false,
      error: `results must be an array with max ${LIMITS.MAX_WHEEL_RESULTS} items`,
    };
  }

  for (const [index, result] of b.results.entries()) {
    if (!result || typeof result !== "object") {
      return { valid: false, error: `results[${index}] must be an object` };
    }

    if (
      typeof result.winner !== "string" ||
      result.winner.length === 0 ||
      result.winner.length > LIMITS.MAX_WHEEL_WINNER_LENGTH
    ) {
      return {
        valid: false,
        error: `results[${index}].winner must be a non-empty string with max ${LIMITS.MAX_WHEEL_WINNER_LENGTH} characters`,
      };
    }

    if (typeof result.removedAfter !== "boolean") {
      return {
        valid: false,
        error: `results[${index}].removedAfter must be a boolean`,
      };
    }
  }

  return { valid: true };
}

export function validateRetroSessionStatsPayload(
  body: unknown,
): ValidationResult {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Request body must be an object" };
  }

  const b = body as Partial<RecordRetroSessionStatsInput>;

  if (
    !b.roomKey ||
    !b.templateId ||
    !b.templateName ||
    b.totalParticipants === undefined ||
    b.cardCount === undefined ||
    b.voteCount === undefined ||
    b.actionCount === undefined ||
    b.completedActionCount === undefined
  ) {
    return { valid: false, error: "Missing required fields" };
  }

  if (
    typeof b.roomKey !== "string" ||
    b.roomKey.length > LIMITS.MAX_ROOM_KEY_LENGTH
  ) {
    return {
      valid: false,
      error: `roomKey must be a string with max ${LIMITS.MAX_ROOM_KEY_LENGTH} characters`,
    };
  }

  if (
    typeof b.templateId !== "string" ||
    b.templateId.length > LIMITS.MAX_RETRO_TEMPLATE_ID_LENGTH
  ) {
    return {
      valid: false,
      error: `templateId must be a string with max ${LIMITS.MAX_RETRO_TEMPLATE_ID_LENGTH} characters`,
    };
  }

  if (
    typeof b.templateName !== "string" ||
    b.templateName.length > LIMITS.MAX_RETRO_TEMPLATE_NAME_LENGTH
  ) {
    return {
      valid: false,
      error: `templateName must be a string with max ${LIMITS.MAX_RETRO_TEMPLATE_NAME_LENGTH} characters`,
    };
  }

  const numericFields = [
    ["totalParticipants", b.totalParticipants, LIMITS.MAX_WHEEL_ENTRIES],
    ["cardCount", b.cardCount, LIMITS.MAX_RETRO_CARDS],
    ["voteCount", b.voteCount, LIMITS.MAX_RETRO_CARDS * 10],
    ["actionCount", b.actionCount, LIMITS.MAX_RETRO_ACTIONS],
    ["completedActionCount", b.completedActionCount, LIMITS.MAX_RETRO_ACTIONS],
  ] as const;

  for (const [field, value, max] of numericFields) {
    if (
      typeof value !== "number" ||
      !Number.isInteger(value) ||
      value < 0 ||
      value > max
    ) {
      return {
        valid: false,
        error: `${field} must be an integer between 0 and ${max}`,
      };
    }
  }

  if (b.completedActionCount > b.actionCount) {
    return {
      valid: false,
      error: "completedActionCount cannot be greater than actionCount",
    };
  }

  if (
    b.durationMs !== undefined &&
    (typeof b.durationMs !== "number" || b.durationMs < 0)
  ) {
    return {
      valid: false,
      error: "durationMs must be a non-negative number",
    };
  }

  return { valid: true };
}
