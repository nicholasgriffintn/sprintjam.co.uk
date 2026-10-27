import type {
  Request as CfRequest,
  Response as CfResponse,
} from "@cloudflare/workers-types";
import type { StatsWorkerEnv } from "@sprintjam/types";
import * as Sentry from "@sentry/cloudflare";

import { handleRequest } from "./routes/router";

const SENTRY_DSN =
  "https://8fc7345ff9c17e76e16feadc24a90e27@o4512330606247936.ingest.de.sentry.io/4512330621321296";

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
    environment: env.ENVIRONMENT,
    enabled: env.ENVIRONMENT !== "development",
  }),
  {
    async fetch(request: CfRequest, env: StatsWorkerEnv): Promise<CfResponse> {
      return handleRequest(request, env);
    },
  },
);
