import type {
  Request as CfRequest,
  Response as CfResponse,
} from "@cloudflare/workers-types";
import type { StatsWorkerEnv } from "@sprintjam/types";
import * as Sentry from "@sentry/cloudflare";

import { handleRequest } from "./routes/router";

const SENTRY_DSN =
  "https://c76d60afe2c74fa8a3b1f06ef1307b82@ingest.bitwobbly.com/13";

export default Sentry.withSentry<StatsWorkerEnv, unknown>(
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
    enabled: env.ENVIRONMENT === "production" || env.ENVIRONMENT === "staging",
  }),
  {
    async fetch(request: CfRequest, env: StatsWorkerEnv): Promise<CfResponse> {
      return handleRequest(request, env);
    },
  },
);
