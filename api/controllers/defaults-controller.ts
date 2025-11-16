import type { Response as CfResponse } from '@cloudflare/workers-types';

import { getServerDefaults } from '../utils/defaults';

export function getDefaultsController(): CfResponse {
  const defaultsPayload = getServerDefaults();

  return new Response(JSON.stringify(defaultsPayload), {
    headers: { 'Content-Type': 'application/json' },
  }) as unknown as CfResponse;
}
