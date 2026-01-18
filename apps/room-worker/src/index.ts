import type {
  Request as CfRequest,
  Response as CfResponse,
} from "@cloudflare/workers-types";
import type { RoomWorkerEnv } from "@sprintjam/types/env";
import { WorkerEntrypoint } from "cloudflare:workers";

import { handleRequest } from "./routes/router";
import { PlanningRoom } from "./durable-objects/planning-room";

export default class extends WorkerEntrypoint {
  async fetch(request: CfRequest): Promise<CfResponse> {
    const env = this.env as RoomWorkerEnv;
    return handleRequest(request, env);
  }
}

export { PlanningRoom };
