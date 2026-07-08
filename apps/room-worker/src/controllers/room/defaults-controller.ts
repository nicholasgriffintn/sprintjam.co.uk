import type { Response as CfResponse } from "@cloudflare/workers-types";
import { CACHE_CONTROL, getServerDefaults } from "@sprintjam/utils";

export function getDefaultsController(): CfResponse {
  const defaultsPayload = getServerDefaults();

  return new Response(JSON.stringify(defaultsPayload), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": CACHE_CONTROL.PUBLIC_LONG,
      "Cache-Tag": "room-defaults",
    },
  });
}
