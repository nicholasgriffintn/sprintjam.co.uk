import type {
  Request as CfRequest,
  Response as CfResponse,
} from "@cloudflare/workers-types";
import type { RoomWorkerEnv } from "@sprintjam/types/env";
import * as Sentry from "@sentry/cloudflare";

import { handleRequest } from "./routes/router";
import { PlanningRoom } from "./durable-objects/planning-room";

const SENTRY_DSN =
  "https://d2b3ceb688e14058bf82a71ed27951c3@ingest.bitwobbly.com/11";

export default Sentry.withSentry(
  (env: RoomWorkerEnv) => ({
    dsn: SENTRY_DSN,
    tracesSampleRate: 0.1,
    enabled: env.ENVIRONMENT === "production" || env.ENVIRONMENT === "staging",
  }),
  {
    async fetch(request: CfRequest, env: RoomWorkerEnv): Promise<CfResponse> {
      return handleRequest(request, env);
    },
  },
);

export { PlanningRoom };
