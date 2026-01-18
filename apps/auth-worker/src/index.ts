import type {
  Request as CfRequest,
  Response as CfResponse,
} from "@cloudflare/workers-types";
import type { AuthWorkerEnv } from "@sprintjam/types";
import { WorkerEntrypoint } from "cloudflare:workers";

import { handleRequest } from "./routes/router";
import { WorkspaceAuthRepository } from "./repositories/workspace-auth";

export default class extends WorkerEntrypoint {
  async fetch(request: CfRequest): Promise<CfResponse> {
    const env = this.env as AuthWorkerEnv;
    return handleRequest(request, env);
  }

  async scheduled(): Promise<void> {
    const env = this.env as AuthWorkerEnv;
    const repo = new WorkspaceAuthRepository(env.DB);

    try {
      const deletedLinks = await repo.cleanupExpiredMagicLinks();
      const deletedSessions = await repo.cleanupExpiredSessions();

      console.log(
        `Cleanup completed: ${deletedLinks} expired magic links, ${deletedSessions} expired sessions`,
      );
    } catch (error) {
      console.error("Cleanup job failed:", error);
    }
  }
}
