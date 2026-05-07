import type {
  Request as CfRequest,
  Response as CfResponse,
} from "@cloudflare/workers-types";
import type { StandupWorkerEnv } from "@sprintjam/types";
import { getStandupSessionToken } from "@sprintjam/utils";

import { jsonError } from "../../lib/response";

export function getStandupStub(env: StandupWorkerEnv, standupKey: string) {
  const standupId = `standup-${standupKey.toLowerCase()}`;
  return env.STANDUP_ROOM.get(env.STANDUP_ROOM.idFromName(standupId));
}

export async function validateStandupSessionForKey(
  request: CfRequest,
  env: StandupWorkerEnv,
  standupKey: string,
): Promise<CfResponse | null> {
  const sessionToken = getStandupSessionToken(request);
  if (!sessionToken) {
    return jsonError("Standup session is required", 401);
  }

  const response = await getStandupStub(env, standupKey).fetch(
    new Request("https://internal/session/validate-any", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `standup_session=${sessionToken}`,
      },
    }) as unknown as CfRequest,
  );

  return response.ok ? null : (response as CfResponse);
}
