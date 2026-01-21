import type { WebSocket as CfWebSocket } from "@cloudflare/workers-types";

import type { WheelRoom } from ".";
import type { WheelClientMessage, WheelSettings } from "@sprintjam/types";

function findCanonicalUserName(
  users: string[],
  userName: string,
): string | undefined {
  return users.find((u) => u.toLowerCase() === userName.toLowerCase());
}

function validateClientMessage(
  data: unknown,
): WheelClientMessage | { error: string } {
  if (typeof data !== "object" || data === null) {
    return { error: "Invalid message format" };
  }

  const msg = data as Record<string, unknown>;

  if (typeof msg.type !== "string") {
    return { error: "Missing message type" };
  }

  switch (msg.type) {
    case "addEntry":
      if (typeof msg.name !== "string") {
        return { error: "Invalid addEntry message" };
      }
      return { type: "addEntry", name: msg.name };

    case "removeEntry":
      if (typeof msg.entryId !== "string") {
        return { error: "Invalid removeEntry message" };
      }
      return { type: "removeEntry", entryId: msg.entryId };

    case "updateEntry":
      if (typeof msg.entryId !== "string" || typeof msg.name !== "string") {
        return { error: "Invalid updateEntry message" };
      }
      return { type: "updateEntry", entryId: msg.entryId, name: msg.name };

    case "toggleEntry":
      if (typeof msg.entryId !== "string" || typeof msg.enabled !== "boolean") {
        return { error: "Invalid toggleEntry message" };
      }
      return {
        type: "toggleEntry",
        entryId: msg.entryId,
        enabled: msg.enabled,
      };

    case "clearEntries":
      return { type: "clearEntries" };

    case "bulkAddEntries":
      if (!Array.isArray(msg.names)) {
        return { error: "Invalid bulkAddEntries message" };
      }
      return {
        type: "bulkAddEntries",
        names: msg.names.filter((n): n is string => typeof n === "string"),
      };

    case "spin":
      return { type: "spin" };

    case "resetWheel":
      return { type: "resetWheel" };

    case "updateSettings":
      if (typeof msg.settings !== "object" || msg.settings === null) {
        return { error: "Invalid updateSettings message" };
      }
      return {
        type: "updateSettings",
        settings: msg.settings as Partial<WheelSettings>,
      };

    case "ping":
      return { type: "ping" };

    default:
      return { error: `Unknown message type: ${msg.type}` };
  }
}

export async function handleSession(
  wheel: WheelRoom,
  webSocket: CfWebSocket,
  wheelKey: string,
  userName: string,
  sessionToken: string,
) {
  const storedWheel = await wheel.getWheelData();
  const canonicalUserName = storedWheel
    ? findCanonicalUserName(storedWheel.users, userName)
    : undefined;

  const hasWheel =
    storedWheel && storedWheel.key === wheelKey && !!canonicalUserName;
  const hasValidToken = canonicalUserName
    ? wheel.repository.validateSessionToken(canonicalUserName, sessionToken)
    : false;

  if (!hasWheel || !hasValidToken) {
    webSocket.accept();
    webSocket.send(
      JSON.stringify({
        type: "error",
        error: "Invalid or expired session. Please rejoin the wheel.",
      }),
    );
    webSocket.close(4003, "Invalid session token");
    return;
  }

  if (!canonicalUserName) {
    return;
  }

  const session = { webSocket, wheelKey, userName: canonicalUserName };
  wheel.sessions.set(webSocket, session);

  webSocket.accept();

  const wheelData = await wheel.getWheelData();
  if (!wheelData) {
    webSocket.send(
      JSON.stringify({
        type: "error",
        error: "Unable to load wheel data",
      }),
    );
    webSocket.close(1011, "Wheel data unavailable");
    return;
  }

  wheel.repository.setUserConnection(canonicalUserName, true);

  const freshWheelData = await wheel.getWheelData();

  wheel.broadcast({
    type: "userJoined",
    user: canonicalUserName,
    users: freshWheelData?.users ?? [],
    userAvatars: freshWheelData?.userAvatars,
  });

  webSocket.send(
    JSON.stringify({
      type: "initialize",
      wheel: freshWheelData ?? wheelData,
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
        webSocket.send(JSON.stringify({ type: "pong" }));
        return;
      }

      const currentWheel = await wheel.getWheelData();
      if (currentWheel?.status === "completed") {
        return;
      }

      switch (validated.type) {
        case "addEntry":
          await wheel.handleAddEntry(canonicalUserName, validated.name);
          break;
        case "removeEntry":
          await wheel.handleRemoveEntry(canonicalUserName, validated.entryId);
          break;
        case "updateEntry":
          await wheel.handleUpdateEntry(
            canonicalUserName,
            validated.entryId,
            validated.name,
          );
          break;
        case "toggleEntry":
          await wheel.handleToggleEntry(
            canonicalUserName,
            validated.entryId,
            validated.enabled,
          );
          break;
        case "clearEntries":
          await wheel.handleClearEntries(canonicalUserName);
          break;
        case "bulkAddEntries":
          await wheel.handleBulkAddEntries(canonicalUserName, validated.names);
          break;
        case "spin":
          await wheel.handleSpin(canonicalUserName);
          break;
        case "resetWheel":
          await wheel.handleResetWheel(canonicalUserName);
          break;
        case "updateSettings":
          await wheel.handleUpdateSettings(
            canonicalUserName,
            validated.settings,
          );
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
    wheel.sessions.delete(webSocket);
    const stillConnected = Array.from(wheel.sessions.values()).some(
      (s) => s.userName === canonicalUserName,
    );

    if (!stillConnected) {
      wheel.repository.setUserConnection(canonicalUserName, false);
      const latestWheelData = await wheel.getWheelData();

      if (latestWheelData) {
        wheel.broadcast({
          type: "userLeft",
          user: canonicalUserName,
          users: latestWheelData.users.filter((u) => {
            const conn = latestWheelData.connectedUsers[u];
            return u === canonicalUserName ? false : conn;
          }),
        });

        if (canonicalUserName === latestWheelData.moderator) {
          const connectedUsers = latestWheelData.users
            .filter(
              (user) =>
                latestWheelData.connectedUsers[user] &&
                user !== canonicalUserName,
            )
            .sort((a, b) => a.localeCompare(b));

          if (connectedUsers.length > 0) {
            latestWheelData.moderator = connectedUsers[0];
            wheel.repository.setModerator(latestWheelData.moderator);

            wheel.broadcast({
              type: "newModerator",
              moderator: latestWheelData.moderator,
            });
          }
        }
      }
    }
  });
}
