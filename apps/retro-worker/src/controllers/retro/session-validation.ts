import type {
  Request as CfRequest,
  Response as CfResponse,
} from "@cloudflare/workers-types";
import type { RetroWorkerEnv } from "@sprintjam/types";
import { getRetroSessionToken } from "@sprintjam/utils";

import { getRetroStub } from "../../lib/retro-room-stub";
import { jsonError } from "../../lib/response";

export async function validateRetroSessionForKey(
  request: CfRequest,
  env: RetroWorkerEnv,
  retroKey: string,
  mode: "any" | "moderator" = "any",
): Promise<CfResponse | null> {
  const sessionToken = getRetroSessionToken(request);
  if (!sessionToken) {
    return jsonError("Retro session is required", 401);
  }

  const response = await getRetroStub(env, retroKey).fetch(
    new Request(`https://internal/session/validate-${mode}`, {
      method: "POST",
      headers: {
        Cookie: `retro_session=${sessionToken}`,
      },
    }) as unknown as CfRequest,
  );

  return response.ok ? null : (response as CfResponse);
}
