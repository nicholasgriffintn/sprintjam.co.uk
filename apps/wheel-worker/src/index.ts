import type {
  Request as CfRequest,
  Response as CfResponse,
} from '@cloudflare/workers-types';
import type { WheelWorkerEnv } from '@sprintjam/types';
import { WorkerEntrypoint } from 'cloudflare:workers';

import { handleRequest } from './routes/router';
import { WheelRoom } from './durable-objects/wheel-room';

export default class extends WorkerEntrypoint {
  async fetch(request: CfRequest): Promise<CfResponse> {
    const env = this.env as WheelWorkerEnv;
    return handleRequest(request, env);
  }
}

export { WheelRoom };
