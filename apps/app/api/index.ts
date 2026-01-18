import type {
  ExportedHandler,
  Request as CfRequest,
  Response as CfResponse,
} from '@cloudflare/workers-types';
import type { DispatchWorkerEnv } from '@sprintjam/types';

function handleRobotsTxt(env: DispatchWorkerEnv): CfResponse {
  const isStaging = env.ENVIRONMENT === 'staging';
  const robotsBody = isStaging
    ? 'User-agent: *\nDisallow: /'
    : 'User-agent: *\nAllow: / Sitemap: https://sprintjam.co.uk/sitemap.xml';

  return new Response(robotsBody, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      ...(isStaging ? { 'X-Robots-Tag': 'noindex, nofollow' } : {}),
    },
  }) as unknown as CfResponse;
}

async function handleRequest(
  request: CfRequest,
  env: DispatchWorkerEnv
): Promise<CfResponse> {
  try {
    const url = new URL(request.url);

    if (url.pathname === '/robots.txt') {
      return handleRobotsTxt(env);
    }

    if (url.pathname.startsWith('/api/')) {
      const path = url.pathname.substring(5); // Remove '/api/'

      if (
        path.startsWith('auth/') ||
        path === 'teams' ||
        path.startsWith('teams/') ||
        path.startsWith('workspace/') ||
        path === 'sessions/complete'
      ) {
        return await env.AUTH_WORKER.fetch(request);
      }

      if (path.startsWith('stats/')) {
        return await env.STATS_WORKER.fetch(request);
      }

      return await env.ROOM_WORKER.fetch(request);
    }

    if (url.pathname === '/ws') {
      return await env.ROOM_WORKER.fetch(request);
    }

    return env.ASSETS.fetch(request);
  } catch (error) {
    console.error('[main] Internal Server Error', error);
    return new Response(
      JSON.stringify({ error: '[main] handleRequest errored' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    ) as unknown as CfResponse;
  }
}

export default {
  async fetch(request: CfRequest, env: DispatchWorkerEnv): Promise<CfResponse> {
    return handleRequest(request, env);
  },
} satisfies ExportedHandler<DispatchWorkerEnv>;
