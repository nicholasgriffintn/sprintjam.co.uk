import type { SaveTeamsCollaborationInstallationInput } from "@sprintjam/types";

const MAX_CONTEXT_VALUE_LENGTH = 256;
const MAX_DISPLAY_NAME_LENGTH = 120;
const MAX_METADATA_LENGTH = 4096;

type ParseResult =
  | { ok: true; value: SaveTeamsCollaborationInstallationInput }
  | { ok: false; error: string };

function optionalString(value: unknown, maxLength = MAX_CONTEXT_VALUE_LENGTH) {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.slice(0, maxLength);
}

function metadataObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const serialized = JSON.stringify(value);
  if (serialized.length > MAX_METADATA_LENGTH) {
    return {};
  }

  return value as Record<string, unknown>;
}

export function buildTeamsContextKey(
  input: Pick<
    SaveTeamsCollaborationInstallationInput,
    | "tenantId"
    | "externalTeamId"
    | "externalChannelId"
    | "externalChatId"
    | "externalMeetingId"
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
          : "personal";

  return `${input.tenantId}:${scope}`;
}

export function parseTeamsInstallationPayload(raw: unknown): ParseResult {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: "request body must be an object" };
  }

  const body = raw as Record<string, unknown>;
  const tenantId = optionalString(body.tenantId);
  if (!tenantId) {
    return { ok: false, error: "tenantId is required" };
  }

  const externalTeamId = optionalString(body.externalTeamId);
  const externalChannelId = optionalString(body.externalChannelId);
  const externalChatId = optionalString(body.externalChatId);
  const externalMeetingId = optionalString(body.externalMeetingId);
  const externalUserId = optionalString(body.externalUserId);

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
      displayName: optionalString(body.displayName, MAX_DISPLAY_NAME_LENGTH),
      metadata: metadataObject(body.metadata),
    },
  };
}
