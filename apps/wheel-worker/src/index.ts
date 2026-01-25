import type {
  Request as CfRequest,
  Response as CfResponse,
} from "@cloudflare/workers-types";
import type { WheelWorkerEnv } from "@sprintjam/types";
import * as Sentry from "@sentry/cloudflare";

import { handleRequest } from "./routes/router";
import { WheelRoom } from "./durable-objects/wheel-room";

const SENTRY_DSN =
  "https://8bf80480a2674ad9ac27e2b5572016f7@ingest.bitwobbly.com/14";

export default Sentry.withSentry(
  (env: WheelWorkerEnv) => ({
    dsn: SENTRY_DSN,
    tracesSampleRate: 0.1,
    enabled: env.ENVIRONMENT === "production" || env.ENVIRONMENT === "staging",
  }),
  {
    async fetch(request: CfRequest, env: WheelWorkerEnv): Promise<CfResponse> {
      return handleRequest(request, env);
    },
  },
);

export { WheelRoom };
