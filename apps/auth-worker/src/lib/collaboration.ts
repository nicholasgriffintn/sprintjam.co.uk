import type { SaveTeamsCollaborationInstallationInput } from "@sprintjam/types";
import {
  boundedRecord,
  optionalTrimmedString,
} from "@sprintjam/utils";

const MAX_CONTEXT_VALUE_LENGTH = 256;
const MAX_DISPLAY_NAME_LENGTH = 120;
const MAX_METADATA_LENGTH = 4096;

type TeamsParseResult =
  | { ok: true; value: SaveTeamsCollaborationInstallationInput }
  | { ok: false; error: string };

export class TeamsContextAlreadyLinkedError extends Error {
  constructor() {
    super("Teams context is already linked to another team");
    this.name = "TeamsContextAlreadyLinkedError";
  }
}

export function buildTeamsContextKey(
  input: Pick<
    SaveTeamsCollaborationInstallationInput,
    | "tenantId"
    | "externalTeamId"
    | "externalChannelId"
    | "externalChatId"
    | "externalMeetingId"
    | "externalUserId"
  >,
): string {
  const scope = input.externalChannelId
    ? `channel:${input.externalChannelId}`
    : input.externalChatId
      ? `chat:${input.externalChatId}`
      : input.externalMeetingId
        ? `meeting:${input.externalMeetingId}`
        : input.externalTeamId
          ? `team:${input.externalTeamId}`
          : input.externalUserId
            ? `personal:${input.externalUserId}`
            : "personal";

  return `${input.tenantId}:${scope}`;
}

export function parseTeamsInstallationPayload(
  raw: unknown,
): TeamsParseResult {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: "request body must be an object" };
  }

  const body = raw as Record<string, unknown>;
  const tenantId = optionalTrimmedString(
    body.tenantId,
    MAX_CONTEXT_VALUE_LENGTH,
  );
  if (!tenantId) {
    return { ok: false, error: "tenantId is required" };
  }

  const externalTeamId = optionalTrimmedString(
    body.externalTeamId,
    MAX_CONTEXT_VALUE_LENGTH,
  );
  const externalChannelId = optionalTrimmedString(
    body.externalChannelId,
    MAX_CONTEXT_VALUE_LENGTH,
  );
  const externalChatId = optionalTrimmedString(
    body.externalChatId,
    MAX_CONTEXT_VALUE_LENGTH,
  );
  const externalMeetingId = optionalTrimmedString(
    body.externalMeetingId,
    MAX_CONTEXT_VALUE_LENGTH,
  );
  const externalUserId = optionalTrimmedString(
    body.externalUserId,
    MAX_CONTEXT_VALUE_LENGTH,
  );

  if (
    !externalTeamId &&
    !externalChannelId &&
    !externalChatId &&
    !externalMeetingId &&
    !externalUserId
  ) {
    return {
      ok: false,
      error:
        "Teams context must include a team, channel, chat, meeting, or user id",
    };
  }

  return {
    ok: true,
    value: {
      tenantId,
      externalTeamId,
      externalChannelId,
      externalChatId,
      externalMeetingId,
      externalUserId,
      displayName: optionalTrimmedString(
        body.displayName,
        MAX_DISPLAY_NAME_LENGTH,
      ),
      metadata: boundedRecord(body.metadata, MAX_METADATA_LENGTH),
    },
  };
}
