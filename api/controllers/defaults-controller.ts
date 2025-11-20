import type { Response as CfResponse } from "@cloudflare/workers-types";

import { getServerDefaults } from "../utils/defaults";

export function getDefaultsController(): CfResponse {
  const defaultsPayload = getServerDefaults();

  return new Response(JSON.stringify(defaultsPayload), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  }) as unknown as CfResponse;
}
