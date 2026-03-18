import type { WebSocket as CfWebSocket } from "@cloudflare/workers-types";

import type { StandupRoom } from ".";
import type { StandupResponsePayload } from "@sprintjam/types";

interface StandupClientMessage {
  type: string;
}

interface SubmitResponseMessage extends StandupClientMessage {
  type: "submitResponse";
  isInPerson?: boolean;
  yesterday: string;
  today: string;
  hasBlocker: boolean;
  blockerDescription?: string;
  healthCheck: number;
  linkedTickets?: Array<{
    id: string;
    key: string;
    title: string;
    url?: string;
    provider: "jira" | "linear" | "github";
  }>;
  kudos?: string;
  icebreakerAnswer?: string;
}

interface FocusUserMessage extends StandupClientMessage {
  type: "focusUser";
  userName: string;
}

interface CompleteStandupMessage extends StandupClientMessage {
  type: "completeStandup";
}

interface AddReactionMessage extends StandupClientMessage {
  type: "addReaction";
  responseUserName: string;
  emoji: string;
}

interface RemoveReactionMessage extends StandupClientMessage {
  type: "removeReaction";
  responseUserName: string;
  emoji: string;
}

interface SetThemeMessage extends StandupClientMessage {
  type: "setTheme";
  theme: string;
}

type ValidatedMessage =
  | SubmitResponseMessage
  | FocusUserMessage
  | CompleteStandupMessage
  | AddReactionMessage
  | RemoveReactionMessage
  | SetThemeMessage
  | { type: "lockResponses" }
  | { type: "unlockResponses" }
  | { type: "startPresentation" }
  | { type: "endPresentation" }
  | { type: "ping" };

const LIMITS = {
  responseText: 2000,
  blockerText: 1000,
  kudosText: 500,
  icebreakerText: 500,
  linkedTickets: 8,
  ticketId: 128,
  ticketKey: 64,
  ticketTitle: 240,
  ticketUrl: 2048,
} as const;

const ALLOWED_TICKET_PROVIDERS = new Set(["jira", "linear", "github"]);
const ALLOWED_REACTION_EMOJIS = new Set(["👏", "🎉", "💡", "❤️"]);
const ALLOWED_THEMES = new Set([
  "default",
  "cosmic",
  "forest",
  "ocean",
  "sunset",
]);

function normaliseNonEmptyString(
  value: unknown,
  maxLength: number,
): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > maxLength) {
    return undefined;
  }

  return trimmed;
}

function normaliseOptionalString(
  value: unknown,
  maxLength: number,
): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return undefined;
  }

  return trimmed.length <= maxLength ? trimmed : undefined;
}

function normaliseTicketUrl(value: unknown): string | undefined {
  const trimmed = normaliseOptionalString(value, LIMITS.ticketUrl);
  if (!trimmed) {
    return undefined;
  }

  try {
    const url = new URL(trimmed);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : undefined;
  } catch {
    return undefined;
  }
}

function normaliseLinkedTickets(
  value: unknown,
): SubmitResponseMessage["linkedTickets"] | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value) || value.length > LIMITS.linkedTickets) {
    return undefined;
  }

  const tickets: NonNullable<SubmitResponseMessage["linkedTickets"]> = [];

  for (const entry of value) {
    if (typeof entry !== "object" || entry === null) {
      return undefined;
    }

    const ticket = entry as Record<string, unknown>;
    const id = normaliseNonEmptyString(ticket.id, LIMITS.ticketId);
    const key = normaliseNonEmptyString(ticket.key, LIMITS.ticketKey);
    const title = normaliseNonEmptyString(ticket.title, LIMITS.ticketTitle);
    const provider =
      typeof ticket.provider === "string" &&
      ALLOWED_TICKET_PROVIDERS.has(ticket.provider)
        ? (ticket.provider as "jira" | "linear" | "github")
        : undefined;

    if (!id || !key || !title || !provider) {
      return undefined;
    }

    const url = normaliseTicketUrl(ticket.url);

    tickets.push({
      id,
      key,
      title,
      provider,
      ...(url ? { url } : {}),
    });
  }

  return tickets;
}

function validateClientMessage(
  data: unknown,
): ValidatedMessage | { error: string } {
  if (typeof data !== "object" || data === null) {
    return { error: "Invalid message format" };
  }

  const msg = data as Record<string, unknown>;

  if (typeof msg.type !== "string") {
    return { error: "Missing message type" };
  }

  switch (msg.type) {
    case "submitResponse": {
      const isInPerson = msg.isInPerson === true;
      const yesterday = isInPerson
        ? ""
        : normaliseNonEmptyString(msg.yesterday, LIMITS.responseText);
      const today = isInPerson
        ? ""
        : normaliseNonEmptyString(msg.today, LIMITS.responseText);
      const blockerDescription = normaliseOptionalString(
        msg.blockerDescription,
        LIMITS.blockerText,
      );
      const linkedTickets = normaliseLinkedTickets(msg.linkedTickets);
      const kudos = normaliseOptionalString(msg.kudos, LIMITS.kudosText);
      const icebreakerAnswer = normaliseOptionalString(
        msg.icebreakerAnswer,
        LIMITS.icebreakerText,
      );
      const healthCheck =
        typeof msg.healthCheck === "number" &&
        Number.isInteger(msg.healthCheck) &&
        msg.healthCheck >= 1 &&
        msg.healthCheck <= 5
          ? msg.healthCheck
          : undefined;

      if (
        (!isInPerson && (!yesterday || !today)) ||
        typeof msg.hasBlocker !== "boolean" ||
        healthCheck === undefined ||
        (msg.linkedTickets !== undefined && linkedTickets === undefined) ||
        (msg.hasBlocker && !blockerDescription)
      ) {
        return { error: "Invalid submitResponse message" };
      }

      const result: SubmitResponseMessage = {
        type: "submitResponse",
        isInPerson,
        yesterday: yesterday ?? "",
        today: today ?? "",
        hasBlocker: msg.hasBlocker,
        healthCheck,
      };

      if (msg.hasBlocker && blockerDescription) {
        result.blockerDescription = blockerDescription;
      }

      if (linkedTickets) {
        result.linkedTickets = linkedTickets;
      }

      if (kudos) {
        result.kudos = kudos;
      }

      if (icebreakerAnswer) {
        result.icebreakerAnswer = icebreakerAnswer;
      }

      return result;
    }

    case "focusUser":
      if (!normaliseNonEmptyString(msg.userName, 64)) {
        return { error: "Invalid focusUser message" };
      }
      return {
        type: "focusUser",
        userName: normaliseNonEmptyString(msg.userName, 64)!,
      };

    case "addReaction": {
      const responseUserName = normaliseNonEmptyString(
        msg.responseUserName,
        64,
      );
      if (!responseUserName) {
        return { error: "Invalid addReaction: missing responseUserName" };
      }
      if (
        typeof msg.emoji !== "string" ||
        !ALLOWED_REACTION_EMOJIS.has(msg.emoji)
      ) {
        return { error: "Invalid addReaction: unsupported emoji" };
      }
      return { type: "addReaction", responseUserName, emoji: msg.emoji };
    }

    case "removeReaction": {
      const responseUserName = normaliseNonEmptyString(
        msg.responseUserName,
        64,
      );
      if (!responseUserName) {
        return { error: "Invalid removeReaction: missing responseUserName" };
      }
      if (
        typeof msg.emoji !== "string" ||
        !ALLOWED_REACTION_EMOJIS.has(msg.emoji)
      ) {
        return { error: "Invalid removeReaction: unsupported emoji" };
      }
      return { type: "removeReaction", responseUserName, emoji: msg.emoji };
    }

    case "setTheme": {
      if (typeof msg.theme !== "string" || !ALLOWED_THEMES.has(msg.theme)) {
        return { error: "Invalid setTheme: unsupported theme" };
      }
      return { type: "setTheme", theme: msg.theme };
    }

    case "lockResponses":
      return { type: "lockResponses" };

    case "unlockResponses":
      return { type: "unlockResponses" };

    case "startPresentation":
      return { type: "startPresentation" };

    case "endPresentation":
      return { type: "endPresentation" };

    case "completeStandup":
      return { type: "completeStandup" };

    case "ping":
      return { type: "ping" };

    default:
      return { error: `Unknown message type: ${msg.type}` };
  }
}

function findCanonicalUserName(
  users: string[],
  userName: string,
): string | undefined {
  return users.find((u) => u.toLowerCase() === userName.toLowerCase());
}

export async function handleSession(
  standup: StandupRoom,
  webSocket: CfWebSocket,
  standupKey: string,
  userName: string,
  sessionToken: string,
) {
  const storedStandup = await standup.getStandupData();
  const canonicalUserName = storedStandup
    ? findCanonicalUserName(storedStandup.users, userName)
    : undefined;

  const hasStandup =
    storedStandup && storedStandup.key === standupKey && !!canonicalUserName;
  const hasValidToken = canonicalUserName
    ? standup.repository.validateSessionToken(canonicalUserName, sessionToken)
    : false;

  if (!hasStandup || !hasValidToken) {
    webSocket.accept();
    webSocket.send(
      JSON.stringify({
        type: "error",
        error: "Invalid or expired session. Please rejoin the standup.",
      }),
    );
    webSocket.close(4003, "Invalid session token");
    return;
  }

  if (!canonicalUserName) {
    return;
  }

  const session = { webSocket, standupKey, userName: canonicalUserName };
  standup.sessions.set(webSocket, session);

  webSocket.accept();

  const standupData = await standup.getStandupData();
  if (!standupData) {
    webSocket.send(
      JSON.stringify({
        type: "error",
        error: "Unable to load standup data",
      }),
    );
    webSocket.close(1011, "Standup data unavailable");
    return;
  }

  standup.repository.setUserConnection(canonicalUserName, true);

  const freshData = await standup.getStandupData();
  if (!freshData) {
    return;
  }

  // Broadcast userJoined to all
  standup.broadcast({
    type: "userJoined",
    user: canonicalUserName,
    users: freshData.users,
    userAvatars: freshData.userAvatars,
  });

  // Send initialize — facilitator gets all responses, respondent gets own only
  const isModerator = canonicalUserName === freshData.moderator;
  const initPayload = {
    type: "initialize",
    standup: {
      ...freshData,
      responses: isModerator
        ? freshData.responses
        : freshData.responses.filter((r) => r.userName === canonicalUserName),
    },
  };

  webSocket.send(JSON.stringify(initPayload));

  webSocket.addEventListener("message", async (msg) => {
    try {
      const messageData =
        typeof msg.data === "string"
          ? msg.data
          : new TextDecoder().decode(msg.data);
      const data = JSON.parse(messageData);
      const validated = validateClientMessage(data);

      if ("error" in validated) {
        webSocket.send(
          JSON.stringify({
            type: "error",
            error: validated.error,
          }),
        );
        return;
      }

      if (validated.type === "ping") {
        webSocket.send(JSON.stringify({ type: "pong" }));
        return;
      }

      const currentStandup = await standup.getStandupData();
      if (!currentStandup || currentStandup.status === "completed") {
        return;
      }

      switch (validated.type) {
        case "submitResponse":
          await handleSubmitResponse(
            standup,
            canonicalUserName,
            currentStandup.moderator,
            validated,
          );
          break;

        case "lockResponses":
          if (canonicalUserName === currentStandup.moderator) {
            standup.repository.setStatus("locked");
            standup.broadcast({ type: "responsesLocked" });
          }
          break;

        case "unlockResponses":
          if (canonicalUserName === currentStandup.moderator) {
            standup.repository.setStatus("active");
            standup.broadcast({ type: "responsesUnlocked" });
          }
          break;

        case "startPresentation":
          if (canonicalUserName === currentStandup.moderator) {
            standup.repository.setStatus("presenting");
            standup.broadcast({ type: "presentationStarted" });
          }
          break;

        case "endPresentation":
          if (canonicalUserName === currentStandup.moderator) {
            standup.focusedUser = undefined;
            standup.repository.setStatus("active");
            standup.broadcast({ type: "presentationEnded" });
          }
          break;

        case "focusUser":
          if (canonicalUserName === currentStandup.moderator) {
            const focusedUser = findCanonicalUserName(
              currentStandup.users,
              validated.userName,
            );

            if (!focusedUser) {
              webSocket.send(
                JSON.stringify({
                  type: "error",
                  error: "User not found",
                }),
              );
              return;
            }

            standup.focusedUser = focusedUser;
            standup.broadcast({
              type: "userFocused",
              userName: focusedUser,
            });
          }
          break;

        case "completeStandup":
          if (canonicalUserName === currentStandup.moderator) {
            standup.focusedUser = undefined;
            standup.repository.setStatus("completed");
            standup.broadcast({ type: "standupCompleted" });
          }
          break;

        case "addReaction": {
          const responseUser = findCanonicalUserName(
            currentStandup.users,
            validated.responseUserName,
          );
          if (responseUser) {
            standup.repository.addReaction(
              canonicalUserName,
              responseUser,
              validated.emoji,
            );
            standup.broadcast({
              type: "reactionAdded",
              responseUserName: responseUser,
              reactingUserName: canonicalUserName,
              emoji: validated.emoji,
            });
          }
          break;
        }

        case "removeReaction": {
          const responseUser = findCanonicalUserName(
            currentStandup.users,
            validated.responseUserName,
          );
          if (responseUser) {
            standup.repository.removeReaction(
              canonicalUserName,
              responseUser,
              validated.emoji,
            );
            standup.broadcast({
              type: "reactionRemoved",
              responseUserName: responseUser,
              reactingUserName: canonicalUserName,
              emoji: validated.emoji,
            });
          }
          break;
        }

        case "setTheme":
          if (canonicalUserName === currentStandup.moderator) {
            standup.repository.setTheme(validated.theme);
            standup.broadcast({
              type: "themeUpdated",
              theme: validated.theme,
            });
          }
          break;
      }
    } catch (err: unknown) {
      console.error("WebSocket message error:", err);
      webSocket.send(
        JSON.stringify({
          type: "error",
          error: "An error occurred",
        }),
      );
    }
  });

  webSocket.addEventListener("close", async () => {
    standup.sessions.delete(webSocket);
    const stillConnected = Array.from(standup.sessions.values()).some(
      (s) => s.userName === canonicalUserName,
    );

    if (!stillConnected) {
      standup.repository.setUserConnection(canonicalUserName, false);
      const latestData = await standup.getStandupData();

      if (latestData) {
        standup.broadcast({
          type: "userLeft",
          user: canonicalUserName,
          users: latestData.users.filter((u) => {
            const conn = latestData.connectedUsers[u];
            return u === canonicalUserName ? false : conn;
          }),
        });
      }
    }
  });
}

async function handleSubmitResponse(
  standup: StandupRoom,
  userName: string,
  moderator: string,
  message: SubmitResponseMessage,
) {
  const currentStandup = await standup.getStandupData();
  if (currentStandup?.status === "locked" && userName !== moderator) {
    return;
  }

  const payload: StandupResponsePayload = {
    isInPerson: message.isInPerson,
    yesterday: message.yesterday || undefined,
    today: message.today || undefined,
    hasBlocker: message.hasBlocker,
    blockerDescription: message.blockerDescription,
    healthCheck: message.healthCheck,
    linkedTickets: message.linkedTickets,
    kudos: message.kudos,
    icebreakerAnswer: message.icebreakerAnswer,
  };

  standup.repository.submitResponse(userName, payload);

  // Broadcast responseSubmitted to all (username + flag only)
  standup.broadcast({
    type: "responseSubmitted",
    userName,
    hasResponded: true,
    respondedUsers: standup.repository.getRespondedUsers(),
  });

  // Send full response data to facilitator only
  const fullResponse = standup.repository.getResponse(userName);
  if (fullResponse) {
    standup.sendToModerator(moderator, {
      type: "responseUpdated",
      response: fullResponse,
    });
  }

  // Send confirmation back to the submitter
  if (fullResponse) {
    standup.sendToUser(userName, {
      type: "responseConfirmed",
      response: fullResponse,
    });
  }
}
