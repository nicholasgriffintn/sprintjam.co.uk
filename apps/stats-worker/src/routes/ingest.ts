import type {
  Request as CfRequest,
  Response as CfResponse,
} from "@cloudflare/workers-types";
import type { StatsWorkerEnv } from "@sprintjam/types";

import { StatsRepository, type RoundIngestData } from "../repositories/stats";

interface RoundIngestPayload {
  roomKey: string;
  roundId: string;
  ticketId?: string;
  votes: {
    userName: string;
    vote: string;
    structuredVote?: object;
    votedAt: number;
  }[];
  judgeScore?: string;
  judgeMetadata?: object;
  roundEndedAt: number;
}

function validateToken(request: CfRequest, env: StatsWorkerEnv): boolean {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;
  const token = authHeader.substring(7);
  return token === env.STATS_INGEST_TOKEN;
}

export async function ingestRoundController(
  request: CfRequest,
  env: StatsWorkerEnv,
): Promise<CfResponse> {
  if (!validateToken(request, env)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    }) as unknown as CfResponse;
  }

  const body = (await request.json()) as RoundIngestPayload;

  if (!body.roomKey || !body.roundId || !body.votes || !body.roundEndedAt) {
    return new Response(JSON.stringify({ error: "Missing required fields" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    }) as unknown as CfResponse;
  }

  const repo = new StatsRepository(env.DB);

  const data: RoundIngestData = {
    roomKey: body.roomKey,
    roundId: body.roundId,
    ticketId: body.ticketId,
    votes: body.votes,
    judgeScore: body.judgeScore,
    judgeMetadata: body.judgeMetadata,
    roundEndedAt: body.roundEndedAt,
  };

  await repo.ingestRound(data);

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  }) as unknown as CfResponse;
}
