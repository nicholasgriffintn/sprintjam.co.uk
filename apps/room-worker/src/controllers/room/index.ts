import type { CfResponse, PlanningRoomHttpContext } from "./types";
import { handleInitialize } from "./initialize";
import { handleSessionValidation } from "./session";
import { handleJoin } from "./join";
import { handleVote } from "./vote";
import { handleToggleShowVotes } from "./show-votes";
import { handleResetVotes } from "./reset-votes";
import { handleGetSettings, handleUpdateSettings } from "./settings";

export type {
  PlanningRoomHttpContext,
  PlanningRoomRepositoryShape,
} from "./types";

export async function handleHttpRequest(
  ctx: PlanningRoomHttpContext,
  request: Request,
): Promise<CfResponse | null> {
  try {
    const url = new URL(request.url);

    if (url.pathname === "/initialize" && request.method === "POST") {
      return handleInitialize(ctx, request);
    }

    if (url.pathname === "/session/validate" && request.method === "POST") {
      return handleSessionValidation(ctx, request);
    }

    if (url.pathname === "/join" && request.method === "POST") {
      return handleJoin(ctx, request);
    }

    if (url.pathname === "/vote" && request.method === "POST") {
      return handleVote(ctx, request);
    }

    if (url.pathname === "/showVotes" && request.method === "POST") {
      return handleToggleShowVotes(ctx, request);
    }

    if (url.pathname === "/resetVotes" && request.method === "POST") {
      return handleResetVotes(ctx, request);
    }

    if (url.pathname === "/settings" && request.method === "GET") {
      return handleGetSettings(ctx, request);
    }

    if (url.pathname === "/settings" && request.method === "PUT") {
      return handleUpdateSettings(ctx, request);
    }

    if (url.pathname === "/room/team-id" && request.method === "GET") {
      const roomData = await ctx.getRoomData();
      return new Response(
        JSON.stringify({ teamId: roomData?.teamId ?? null }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ) as unknown as CfResponse;
    }

    return null;
  } catch (error) {
    console.error("Error in handleHttpRequest:", error);
    throw error;
  }
}
