import type {
  Request as CfRequest,
  Response as CfResponse,
} from '@cloudflare/workers-types';
import type { StandupWorkerEnv } from '@sprintjam/types';
import * as Sentry from '@sentry/cloudflare';

import { handleRequest } from './routes/router';
import { StandupRoom } from './durable-objects/standup-room';

const SENTRY_DSN =
  'https://bd52ec8b408a48558cd07219756855a3@ingest.bitwobbly.com/17';

export default Sentry.withSentry(
  (env: StandupWorkerEnv) => ({
    dsn: SENTRY_DSN,
    tracesSampleRate: 0.1,
    enabled: env.ENVIRONMENT === 'production' || env.ENVIRONMENT === 'staging',
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
