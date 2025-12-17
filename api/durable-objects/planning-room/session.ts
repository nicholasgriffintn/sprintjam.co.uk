import type { WebSocket as CfWebSocket } from "@cloudflare/workers-types";

import {
  markUserConnection,
  normalizeRoomData,
  anonymizeRoomData,
  findCanonicalUserName,
} from "../../utils/room-data";
import { validateClientMessage } from "../../utils/validate";
import type { PlanningRoom } from ".";

export async function handleSession(
  room: PlanningRoom,
  webSocket: CfWebSocket,
  roomKey: string,
  userName: string,
  sessionToken: string,
) {
  const storedRoom = await room.getRoomData();
  const canonicalUserName = storedRoom
    ? findCanonicalUserName(storedRoom, userName)
    : undefined;
  const hasRoom =
    storedRoom && storedRoom.key === roomKey && !!canonicalUserName;
  const hasValidToken = canonicalUserName
    ? room.repository.validateSessionToken(canonicalUserName, sessionToken)
    : false;

  if (!hasRoom || !hasValidToken) {
    webSocket.accept();
    webSocket.send(
      JSON.stringify({
        type: "error",
        error: "Invalid or expired session. Please rejoin the room.",
      }),
    );
    webSocket.close(4003, "Invalid session token");
    return;
  }

  if (!canonicalUserName) {
    return;
  }

  const session = { webSocket, roomKey, userName: canonicalUserName };
  room.sessions.set(webSocket, session);

  webSocket.accept();

  const roomData = await room.getRoomData();
  if (!roomData) {
    webSocket.send(
      JSON.stringify({
        type: "error",
        error: "Unable to load room data",
      }),
    );
    webSocket.close(1011, "Room data unavailable");
    return;
  }

  const normalizedRoomData = normalizeRoomData(roomData);
  markUserConnection(normalizedRoomData, canonicalUserName, true);

  room.repository.setUserConnection(canonicalUserName, true);

  room.broadcast({
    type: "userConnectionStatus",
    user: canonicalUserName,
    isConnected: true,
  });

  webSocket.send(
    JSON.stringify({
      type: "initialize",
      roomData: anonymizeRoomData(roomData),
    }),
  );

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
        return;
      }

      switch (validated.type) {
        case "vote":
          await room.handleVote(canonicalUserName, validated.vote);
          break;
        case "showVotes":
          await room.handleShowVotes(canonicalUserName);
          break;
        case "resetVotes":
          await room.handleResetVotes(canonicalUserName);
          break;
        case "updateSettings":
          await room.handleUpdateSettings(
            canonicalUserName,
            validated.settings,
          );
          break;
        case "generateStrudelCode":
          await room.handleGenerateStrudel(canonicalUserName);
          break;
        case "toggleStrudelPlayback":
          await room.handleToggleStrudelPlayback(canonicalUserName);
          break;
        case "nextTicket":
          await room.handleNextTicket(canonicalUserName);
          break;
        case "addTicket":
          await room.handleAddTicket(canonicalUserName, validated.ticket);
          break;
        case "updateTicket":
          await room.handleUpdateTicket(
            canonicalUserName,
            validated.ticketId,
            validated.updates,
          );
          break;
        case "deleteTicket":
          await room.handleDeleteTicket(canonicalUserName, validated.ticketId);
          break;
        case "completeTicket":
          await room.handleCompleteTicket(canonicalUserName, validated.outcome);
          break;
        case "startTimer":
          await room.handleStartTimer(canonicalUserName);
          break;
        case "pauseTimer":
          await room.handlePauseTimer(canonicalUserName);
          break;
        case "resetTimer":
          await room.handleResetTimer(canonicalUserName);
          break;
        case "configureTimer":
          await room.handleConfigureTimer(canonicalUserName, validated.config);
          break;
      }
    } catch (err: unknown) {
      webSocket.send(
        JSON.stringify({
          type: "error",
          error: err instanceof Error ? err.message : String(err),
        }),
      );
    }
  });

  webSocket.addEventListener("close", async () => {
    room.sessions.delete(webSocket);
    const stillConnected = Array.from(room.sessions.values()).some(
      (s) => s.userName === canonicalUserName,
    );

    if (!stillConnected) {
      const latestRoomData = await room.getRoomData();

      if (latestRoomData) {
        markUserConnection(latestRoomData, canonicalUserName, false);

        room.repository.setUserConnection(canonicalUserName, false);
        room.broadcast({
          type: "userConnectionStatus",
          user: canonicalUserName,
          isConnected: false,
        });

        if (
          canonicalUserName === latestRoomData.moderator &&
          latestRoomData.settings.autoHandoverModerator
        ) {
          const connectedUsers = latestRoomData.users
            .filter((user) => latestRoomData.connectedUsers[user])
            .sort((a, b) => a.localeCompare(b));

          if (connectedUsers.length > 0) {
            latestRoomData.moderator = connectedUsers[0];
            room.repository.setModerator(latestRoomData.moderator);

            room.broadcast({
              type: "newModerator",
              moderator: latestRoomData.moderator,
            });
          }
        }
      }
    }
  });
}
