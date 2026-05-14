import type {
  Request as CfRequest,
  Response as CfResponse,
} from "@cloudflare/workers-types";
import type { WheelWorkerEnv } from "@sprintjam/types";
import { getWheelSessionToken } from "@sprintjam/utils";

import { jsonError } from "../../lib/response";

export function getWheelStub(env: WheelWorkerEnv, wheelKey: string) {
  const wheelId = `wheel-${wheelKey.toLowerCase()}`;
  return env.WHEEL_ROOM.get(env.WHEEL_ROOM.idFromName(wheelId));
}

export async function validateWheelSessionForKey(
  request: CfRequest,
  env: WheelWorkerEnv,
  wheelKey: string,
  mode: "any" | "moderator" = "any",
): Promise<CfResponse | null> {
  const sessionToken = getWheelSessionToken(request);
  if (!sessionToken) {
    return jsonError("Wheel session is required", 401);
  }

  const response = await getWheelStub(env, wheelKey).fetch(
    new Request(`https://internal/session/validate-${mode}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `wheel_session=${sessionToken}`,
      },
    }) as unknown as CfRequest,
  );

  return response.ok ? null : (response as CfResponse);
}
