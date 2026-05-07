import type {
  Request as CfRequest,
  Response as CfResponse,
} from "@cloudflare/workers-types";
import type { WheelWorkerEnv } from "@sprintjam/types";

import { jsonError } from "../../lib/response";
import { validateWheelSessionForKey } from "./session-validation";

async function forwardAuthWorkspaceWrite(
  request: CfRequest,
  env: WheelWorkerEnv,
  path: string,
  body: Record<string, unknown>,
): Promise<CfResponse> {
  if (!env.AUTH_WORKER) {
    return jsonError("Workspace history is unavailable", 503);
  }

  return env.AUTH_WORKER.fetch(
    new Request(`https://auth-worker/api/${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: request.headers.get("Cookie") ?? "",
      },
      body: JSON.stringify(body),
    }) as unknown as CfRequest,
  );
}

async function forwardStatsWrite(
  env: WheelWorkerEnv,
  body: Record<string, unknown>,
): Promise<CfResponse> {
  if (!env.STATS_WORKER) {
    return jsonError("Stats collection is unavailable", 503);
  }

  return env.STATS_WORKER.fetch(
    new Request("https://stats-worker/api/internal/stats/wheel-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }) as unknown as CfRequest,
  );
}

export async function createWorkspaceSessionController(
  request: CfRequest,
  env: WheelWorkerEnv,
): Promise<CfResponse> {
  const body = await request.json<{
    teamSlug?: string;
    name?: string;
    roomKey?: string;
    metadata?: Record<string, unknown>;
  }>();
  const teamSlug = typeof body.teamSlug === "string" ? body.teamSlug : "";
  const wheelKey =
    typeof body.roomKey === "string" ? body.roomKey.trim().toUpperCase() : "";

  if (!teamSlug) {
    return jsonError("Team slug is required", 400);
  }

  if (!wheelKey) {
    return jsonError("Wheel key is required", 400);
  }

  const validationError = await validateWheelSessionForKey(
    request,
    env,
    wheelKey,
  );
  if (validationError) {
    return validationError;
  }

  return forwardAuthWorkspaceWrite(
    request,
    env,
    `internal/teams/${teamSlug}/sessions`,
    {
      name: body.name,
      roomKey: wheelKey,
      metadata: body.metadata,
    },
  );
}

export async function recordWorkspaceOutcomeController(
  request: CfRequest,
  env: WheelWorkerEnv,
): Promise<CfResponse> {
  const body = await request.json<
    Record<string, unknown> & { roomKey?: string }
  >();
  const wheelKey =
    typeof body.roomKey === "string" ? body.roomKey.trim().toUpperCase() : "";

  if (!wheelKey) {
    return jsonError("Wheel key is required", 400);
  }

  const validationError = await validateWheelSessionForKey(
    request,
    env,
    wheelKey,
  );
  if (validationError) {
    return validationError;
  }

  return forwardAuthWorkspaceWrite(
    request,
    env,
    "internal/sessions/wheel-outcomes",
    {
      ...body,
      roomKey: wheelKey,
    },
  );
}

export async function recordSessionStatsController(
  request: CfRequest,
  env: WheelWorkerEnv,
): Promise<CfResponse> {
  const body = await request.json<
    Record<string, unknown> & { roomKey?: string }
  >();
  const wheelKey =
    typeof body.roomKey === "string" ? body.roomKey.trim().toUpperCase() : "";

  if (!wheelKey) {
    return jsonError("Wheel key is required", 400);
  }

  const validationError = await validateWheelSessionForKey(
    request,
    env,
    wheelKey,
  );
  if (validationError) {
    return validationError;
  }

  return forwardStatsWrite(env, {
    ...body,
    roomKey: wheelKey,
  });
}
