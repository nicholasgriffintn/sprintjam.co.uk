import type {
  Request as CfRequest,
  Response as CfResponse,
} from "@cloudflare/workers-types";
import type { RoomWorkerEnv } from "@sprintjam/types/env";
import * as Sentry from "@sentry/cloudflare";

import { handleRequest } from "./routes/router";
import { PlanningRoom } from "./durable-objects/planning-room";

const SENTRY_DSN =
  "https://0b2449c78219ad9b18859ecd35770126@o4512330606247936.ingest.de.sentry.io/4512330615357520";

export default Sentry.withSentry<RoomWorkerEnv, unknown>(
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
    async fetch(request: CfRequest, env: RoomWorkerEnv): Promise<CfResponse> {
      return handleRequest(request, env);
    },
  },
);

export { PlanningRoom };
