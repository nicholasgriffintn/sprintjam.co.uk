import type {
  Request as CfRequest,
  Response as CfResponse,
} from "@cloudflare/workers-types";
import type { StatsWorkerEnv } from "@sprintjam/types";
import { WorkerEntrypoint } from "cloudflare:workers";

import { handleRequest } from "./routes/router";

export default class extends WorkerEntrypoint {
  async fetch(request: CfRequest): Promise<CfResponse> {
    const env = this.env as StatsWorkerEnv;
    return handleRequest(request, env);
  }
}
