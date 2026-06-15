import type { AuthWorkerEnv } from "@sprintjam/types";
import * as Sentry from "@sentry/cloudflare";

import { handleRequest } from "./routes/router";
import { WorkspaceAuthRepository } from "./repositories/workspace-auth";

const SENTRY_DSN =
  "https://95460a28df42464d8860431ec35767c7@ingest.bitwobbly.com/12";

export default Sentry.withSentry<AuthWorkerEnv, unknown>(
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
        console.error("Cleanup job failed:", error);
      }
    },
  },
);
