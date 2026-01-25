import type { AuthWorkerEnv } from "@sprintjam/types";
import * as Sentry from '@sentry/cloudflare';

import { handleRequest } from "./routes/router";
import { WorkspaceAuthRepository } from "./repositories/workspace-auth";

const SENTRY_DSN =
  'https://95460a28df42464d8860431ec35767c7@ingest.bitwobbly.com/12';

export default Sentry.withSentry(
  (env: AuthWorkerEnv) => ({
    dsn: SENTRY_DSN,
    tracesSampleRate: 0.1,
    enabled: env.ENVIRONMENT === 'production' || env.ENVIRONMENT === 'staging',
  }),
  {
    async fetch(request: Request, env: AuthWorkerEnv): Promise<Response> {
      return handleRequest(request, env);
    },

    async scheduled(
      _controller: ScheduledController,
      env: AuthWorkerEnv,
    ): Promise<void> {
      const repo = new WorkspaceAuthRepository(env.DB);

      try {
        const deletedLinks = await repo.cleanupExpiredMagicLinks();
        const deletedSessions = await repo.cleanupExpiredSessions();

        console.log(
          `Cleanup completed: ${deletedLinks} expired magic links, ${deletedSessions} expired sessions`,
        );
      } catch (error) {
        Sentry.captureException(error);
        console.error('Cleanup job failed:', error);
      }
    },
  },
);
