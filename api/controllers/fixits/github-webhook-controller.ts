import type {
  Request as CfRequest,
  Response as CfResponse,
} from "@cloudflare/workers-types";

import type { Env } from "../../types";
import { createJsonResponse, jsonError } from "../../utils/http";
import { verifyGithubSignature } from "../../utils/github-webhook";
import {
  deriveLeaderboardDelta,
  determineUser,
  extractLabels,
  extractTimestamp,
} from "../../utils/fixits";
import {
  calculatePointsSummary,
  type PointBreakdown,
} from "../../lib/fixits/scoring";
import {
  FixitEventsRepository,
  type FixitEventRecord,
} from "../../repositories/fixit-events";
import { FixitLeaderboardRepository } from "../../repositories/fixit-leaderboard";
import { getFixitRoomStub } from "../../utils/fixit-room";

const JSON_HEADERS = { "Content-Type": "application/json" };

function inferEventType(
  headerEvent: string | null,
  payload: Record<string, any>,
): string {
  if (headerEvent) return headerEvent;
  if (payload.pull_request) return "pull_request";
  if (payload.issue) return "issues";
  if (payload.workflow_run) return "workflow_run";
  if (payload.commits || payload.head_commit) return "push";
  return "unknown";
}

export async function handleGithubWebhookRequest(
  request: CfRequest,
  env: Env,
): Promise<CfResponse> {
  const deliveryId =
    request.headers.get("X-GitHub-Delivery") ??
    crypto.randomUUID();
  const signature = request.headers.get("X-Hub-Signature-256");
  const headerEvent = request.headers.get("X-GitHub-Event");
  const fixitId =
    request.headers.get("X-Fixit-Id") ?? env.FIXITS_DEFAULT_RUN_ID;

  if (!fixitId) {
    return jsonError("Missing Fixit identifier (X-Fixit-Id header)", 400);
  }

  const rawBody = await request.text();

  if (env.GITHUB_WEBHOOK_SECRET) {
    const isValid = await verifyGithubSignature(
      env.GITHUB_WEBHOOK_SECRET,
      rawBody,
      signature,
    );
    if (!isValid) {
      return jsonError("Invalid webhook signature", 401);
    }
  }

  let payload: Record<string, any>;
  try {
    payload = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    return jsonError("Invalid JSON payload", 400);
  }

  const eventType = inferEventType(headerEvent, payload);
  const action = payload.action as string | undefined;
  const labels = extractLabels(payload, eventType);
  const user = determineUser(payload);

  if (!user) {
    return jsonError("Unable to determine user from payload", 400);
  }

  const timestamp = extractTimestamp(payload, eventType);
  const breakdown: PointBreakdown = calculatePointsSummary({
    eventType,
    action,
    labels,
    payload,
  });

  const eventRecord: FixitEventRecord = {
    eventId: deliveryId,
    fixitId,
    roomId: payload.fixit_room_id ?? null,
    user,
    points: breakdown.total,
    basePoints: breakdown.basePoints,
    labelBonus: breakdown.labelBonus,
    severityBonus: breakdown.severityBonus,
    storyPoints: breakdown.storyPoints,
    eventType,
    action,
    labels,
    severity: breakdown.severity,
    timestamp,
    rawPayload: rawBody,
  };

  if (!env.FIXITS_DB) {
    return jsonError("Fixits database is not configured", 500);
  }

  const db = env.FIXITS_DB;
  const eventsRepo = new FixitEventsRepository(db);
  const inserted = await eventsRepo.insertEvent(eventRecord);

  if (inserted) {
    const leaderboardRepo = new FixitLeaderboardRepository(db);
    const activityDelta = deriveLeaderboardDelta({
      eventType,
      action,
      labels,
      payload,
    });

    await leaderboardRepo.applyDelta({
      fixitId,
      user,
      points: breakdown.total,
      bugsClosed: activityDelta.bugsClosed,
      prsMerged: activityDelta.prsMerged,
      issuesClosed: activityDelta.issuesClosed,
      timestamp,
      severity: breakdown.severity,
      labels,
      storyPoints: breakdown.storyPoints,
    });

    if (env.FIXIT_ROOM) {
      try {
        const stub = getFixitRoomStub(env, fixitId);
        await stub.fetch("https://fixit-room.internal/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fixitId }),
        });
      } catch (error) {
        console.error("Failed to notify FixitRoom", error);
      }
    }
  }

  return new Response(
    JSON.stringify({
      ok: true,
      fixitId,
      eventId: deliveryId,
      points: breakdown.total,
      deduplicated: !inserted,
    }),
    { status: 200, headers: JSON_HEADERS },
  ) as unknown as CfResponse;
}
