import type {
  Request as CfRequest,
  Response as CfResponse,
} from "@cloudflare/workers-types";
import type { WheelWorkerEnv } from "@sprintjam/types";
import * as Sentry from "@sentry/cloudflare";

import { handleRequest } from "./routes/router";
import { WheelRoom } from "./durable-objects/wheel-room";

const SENTRY_DSN =
  "https://d15ad0d836cc2c10cb3f75797fec5a76@o4512330606247936.ingest.de.sentry.io/4512330623156304";

export default Sentry.withSentry<WheelWorkerEnv, unknown>(
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
    async fetch(request: CfRequest, env: WheelWorkerEnv): Promise<CfResponse> {
      return handleRequest(request, env);
    },
  },
);

export { WheelRoom };
