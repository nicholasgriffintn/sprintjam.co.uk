import { createJsonResponse } from "../../utils/http";
import { findCanonicalUserName, sanitizeRoomData } from "../../utils/room-data";

import type { CfResponse, PlanningRoomHttpContext } from "./types";

export async function handleVote(
  ctx: PlanningRoomHttpContext,
  request: Request,
): Promise<CfResponse> {
  const { name, vote } = (await request.json()) as {
    name: string;
    vote: string | number;
  };

  const roomData = await ctx.getRoomData();

  if (!roomData || !roomData.key) {
    return createJsonResponse({ error: "Room not found" }, 404);
  }

  const canonicalName = findCanonicalUserName(roomData, name) ?? name.trim();

  if (!roomData.users.includes(canonicalName)) {
    return createJsonResponse({ error: "User not found in this room" }, 400);
  }

  if (roomData.showVotes && !roomData.settings.allowVotingAfterReveal) {
    return createJsonResponse(
      { error: "Voting is not allowed after votes have been revealed" },
      403,
    );
  }

  roomData.votes[canonicalName] = vote;
  ctx.repository.setVote(canonicalName, vote);

  const structuredVote = roomData.structuredVotes?.[canonicalName];

  ctx.broadcast({
    type: "vote",
    user: canonicalName,
    vote,
    structuredVote,
  });

  return createJsonResponse({
    success: true,
    room: sanitizeRoomData(roomData),
  });
}
