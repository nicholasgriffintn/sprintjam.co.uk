import type { WebSocket as CfWebSocket } from "@cloudflare/workers-types";

import type { StandupRoom } from ".";
import type { StandupResponsePayload } from "@sprintjam/types";

interface StandupClientMessage {
  type: string;
}

interface SubmitResponseMessage extends StandupClientMessage {
  type: "submitResponse";
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
}

interface FocusUserMessage extends StandupClientMessage {
  type: "focusUser";
  userName: string;
}

type ValidatedMessage =
  | SubmitResponseMessage
  | FocusUserMessage
  | { type: "lockResponses" }
  | { type: "unlockResponses" }
  | { type: "startPresentation" }
  | { type: "endPresentation" }
  | { type: "ping" };

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
      if (
        typeof msg.yesterday !== "string" ||
        typeof msg.today !== "string" ||
        typeof msg.hasBlocker !== "boolean" ||
        typeof msg.healthCheck !== "number"
      ) {
        return { error: "Invalid submitResponse message" };
      }
      const result: SubmitResponseMessage = {
        type: "submitResponse",
        yesterday: msg.yesterday,
        today: msg.today,
        hasBlocker: msg.hasBlocker,
        healthCheck: msg.healthCheck,
      };
      if (typeof msg.blockerDescription === "string") {
        result.blockerDescription = msg.blockerDescription;
      }
      if (Array.isArray(msg.linkedTickets)) {
        result.linkedTickets =
          msg.linkedTickets as SubmitResponseMessage["linkedTickets"];
      }
      return result;
    }

    case "focusUser":
      if (typeof msg.userName !== "string") {
        return { error: "Invalid focusUser message" };
      }
      return { type: "focusUser", userName: msg.userName };

    case "lockResponses":
      return { type: "lockResponses" };

    case "unlockResponses":
      return { type: "unlockResponses" };

    case "startPresentation":
      return { type: "startPresentation" };

    case "endPresentation":
      return { type: "endPresentation" };

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
            standup.repository.setStatus("active");
            standup.broadcast({ type: "presentationEnded" });
          }
          break;

        case "focusUser":
          if (canonicalUserName === currentStandup.moderator) {
            standup.focusedUser = validated.userName;
            standup.broadcast({
              type: "userFocused",
              userName: validated.userName,
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

        // Reassign moderator if the facilitator disconnects
        if (canonicalUserName === latestData.moderator) {
          const connectedUsers = latestData.users
            .filter(
              (user) =>
                latestData.connectedUsers[user] && user !== canonicalUserName,
            )
            .sort((a, b) => a.localeCompare(b));

          if (connectedUsers.length > 0) {
            standup.repository.setModerator(connectedUsers[0]);

            standup.broadcast({
              type: "newModerator",
              moderator: connectedUsers[0],
            });
          }
        }
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
    yesterday: message.yesterday,
    today: message.today,
    hasBlocker: message.hasBlocker,
    blockerDescription: message.blockerDescription,
    healthCheck: message.healthCheck,
    linkedTickets: message.linkedTickets,
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
