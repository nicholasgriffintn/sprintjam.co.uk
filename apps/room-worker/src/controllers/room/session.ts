import { createJsonResponse } from "@sprintjam/utils";

import type { CfResponse, PlanningRoomHttpContext } from "./types";
import { findCanonicalUserName } from "../../lib/room-data";

export async function handleSessionValidation(
  ctx: PlanningRoomHttpContext,
  request: Request,
): Promise<CfResponse> {
  const { name, sessionToken, requireQueueManagement } =
    (await request.json()) as {
      name?: string;
      sessionToken?: string;
      requireQueueManagement?: boolean;
    };

  if (!name || !sessionToken) {
    return createJsonResponse(
      { error: "Missing user name or session token" },
      400,
    );
  }

  const roomData = await ctx.getRoomData();
  if (!roomData || !roomData.key) {
    return createJsonResponse({ error: "Room not found" }, 404);
  }

  const canonicalName = findCanonicalUserName(roomData, name);

  if (!canonicalName) {
    return createJsonResponse({ error: "Invalid session" }, 401);
  }

  const isMember = roomData.users.includes(canonicalName);
  const tokenValid = ctx.repository.validateSessionToken(
    canonicalName,
    sessionToken,
  );

  if (!isMember || !tokenValid) {
    return createJsonResponse({ error: "Invalid session" }, 401);
  }

  if (requireQueueManagement === true) {
    const canManageQueue =
      roomData.moderator === canonicalName ||
      roomData.settings.allowOthersToManageQueue === true;

    if (!canManageQueue) {
      return createJsonResponse(
        { error: "Insufficient permissions to manage queue" },
        403,
      );
    }
  }

  return createJsonResponse({ success: true });
}
