import type {
  Request as CfRequest,
  Response as CfResponse,
} from "@cloudflare/workers-types";
import type { RetroWorkerEnv } from "@sprintjam/types";
import * as Sentry from "@sentry/cloudflare";

import { RetroRoom } from "./durable-objects/retro-room";
import { handleRequest } from "./routes/router";

const SENTRY_DSN =
  "https://8bf80480a2674ad9ac27e2b5572016f7@ingest.bitwobbly.com/14";

export default Sentry.withSentry(
  (env: RetroWorkerEnv) => ({
    dsn: SENTRY_DSN,
    tracesSampleRate: 0.1,
    enabled: env.ENVIRONMENT === "production" || env.ENVIRONMENT === "staging",
  }),
  {
    async fetch(request: CfRequest, env: RetroWorkerEnv): Promise<CfResponse> {
      return handleRequest(request, env);
    },
  },
);

export { RetroRoom };
