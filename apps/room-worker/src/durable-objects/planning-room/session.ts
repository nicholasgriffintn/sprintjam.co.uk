import type { WebSocket as CfWebSocket } from "@cloudflare/workers-types";
import { validateClientMessage } from '@sprintjam/utils';

import type { PlanningRoom } from ".";
import {
  markUserConnection,
  normalizeRoomData,
  anonymizeRoomData,
  findCanonicalUserName,
} from '../../lib/room-data';

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

  const freshRoomData = await room.getRoomData();
  const isSpectator =
    freshRoomData?.spectators?.includes(canonicalUserName) ?? false;

  if (isSpectator) {
    room.broadcast({
      type: "spectatorStatusChanged",
      user: canonicalUserName,
      isSpectator: true,
      users: freshRoomData?.users ?? [],
      spectators: freshRoomData?.spectators ?? [],
    });
  } else {
    room.broadcast({
      type: "userConnectionStatus",
      user: canonicalUserName,
      isConnected: true,
    });
  }

  webSocket.send(
    JSON.stringify({
      type: "initialize",
      roomData: anonymizeRoomData(freshRoomData ?? roomData),
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

      const roomData = await room.getRoomData();
      if (
        roomData?.status === "completed" &&
        validated.type !== "completeSession"
      ) {
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
        case "selectTicket":
          await room.handleSelectTicket(canonicalUserName, validated.ticketId);
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
        case "toggleSpectator":
          await room.handleToggleSpectator(
            canonicalUserName,
            validated.isSpectator,
          );
          break;
        case "completeSession":
          await room.handleCompleteSession(canonicalUserName);
          break;
        case "startGame":
          await room.handleStartGame(canonicalUserName, validated.gameType);
          break;
        case "submitGameMove":
          await room.handleSubmitGameMove(canonicalUserName, validated.value);
          break;
        case "endGame":
          await room.handleEndGame(canonicalUserName);
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
