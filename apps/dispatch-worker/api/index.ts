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
    : 'User-agent: *\nAllow: /';

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
  const url = new URL(request.url);

  if (url.pathname === '/robots.txt') {
    return handleRobotsTxt(env);
  }

  if (url.pathname.startsWith('/api/')) {
    const path = url.pathname.substring(5); // Remove '/api/'

    if (
      path.startsWith('auth/') ||
      path.startsWith('teams/') ||
      path.startsWith('workspace/')
    ) {
      return await env.AUTH_WORKER.fetch(request);
    }

    if (
      path.startsWith('rooms/') ||
      path === 'rooms' ||
      path === 'defaults' ||
      path === 'feedback' ||
      path.startsWith('jira/') ||
      path.startsWith('linear/') ||
      path.startsWith('github/')
    ) {
      return await env.ROOM_WORKER.fetch(request);
    }

    return new Response('Not Found', { status: 404 }) as unknown as CfResponse;
  }

  if (url.pathname === '/ws') {
    return await env.ROOM_WORKER.fetch(request);
  }

  return env.ASSETS.fetch(request);
}

export default {
  async fetch(request: CfRequest, env: DispatchWorkerEnv): Promise<CfResponse> {
    return handleRequest(request, env);
  },
} satisfies ExportedHandler<DispatchWorkerEnv>;
