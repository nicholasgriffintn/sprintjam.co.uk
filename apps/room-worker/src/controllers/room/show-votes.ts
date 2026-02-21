import { createJsonResponse, sanitizeRoomData } from "@sprintjam/utils";

import type { CfResponse, PlanningRoomHttpContext } from "./types";

export async function handleToggleShowVotes(
  ctx: PlanningRoomHttpContext,
  request: Request,
): Promise<CfResponse> {
  const { name } = (await request.json()) as { name: string };

  const roomData = await ctx.getRoomData();

  if (!roomData || !roomData.key) {
    return createJsonResponse({ error: "Room not found" }, 404);
  }

  if (
    roomData.moderator !== name &&
    !roomData.settings.allowOthersToShowEstimates
  ) {
    return createJsonResponse(
      { error: "Only the moderator can show votes" },
      403,
    );
  }

  roomData.showVotes = !roomData.showVotes;
  ctx.repository.setShowVotes(roomData.showVotes);

  ctx.broadcast({
    type: "showVotes",
    showVotes: roomData.showVotes,
  });

  return createJsonResponse({
    success: true,
    room: sanitizeRoomData(roomData),
  });
}
