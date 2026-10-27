import type {
  Request as CfRequest,
  Response as CfResponse,
} from "@cloudflare/workers-types";
import type { StandupWorkerEnv } from "@sprintjam/types";
import * as Sentry from "@sentry/cloudflare";

import { handleRequest } from "./routes/router";
import { StandupRoom } from "./durable-objects/standup-room";

const SENTRY_DSN =
  "https://f2c93a8ca67107653ee80e0da0847428@o4512330606247936.ingest.de.sentry.io/4512330624467024";

export default Sentry.withSentry<StandupWorkerEnv, unknown>(
  (env) => ({
    dsn: SENTRY_DSN,
    sampleRate: 1,
    enableLogs: false,
    tracesSampleRate: 0,
    beforeSend(event) {
      return event.exception?.values?.length ? event : null;
    },
    beforeSendTransaction() {
      return null;
    },
    environment: env.ENVIRONMENT,
    enabled: env.ENVIRONMENT !== "development",
  }),
  {
    async fetch(
      request: CfRequest,
      env: StandupWorkerEnv,
    ): Promise<CfResponse> {
      return handleRequest(request, env);
    },
  },
);

export { StandupRoom };
