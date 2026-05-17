import type { DispatchWorkerEnv } from "@sprintjam/types";

import { getSitemapEntries, renderSitemapXml } from "@/config/routes/sitemap";

const PRODUCTION_HOSTS = new Set(["sprintjam.co.uk", "www.sprintjam.co.uk"]);

export function shouldPreventSearchIndexing(
  env: Pick<DispatchWorkerEnv, "ENVIRONMENT">,
  url: URL,
): boolean {
  return env.ENVIRONMENT !== "production" || !PRODUCTION_HOSTS.has(url.hostname);
}

export function createRobotsTxtResponse(
  env: Pick<DispatchWorkerEnv, "ENVIRONMENT">,
  url: URL,
): Response {
  const preventIndexing = shouldPreventSearchIndexing(env, url);
  const robotsBody = preventIndexing
    ? "User-agent: *\nDisallow: /"
    : `User-agent: *\nAllow: /\nSitemap: ${url.origin}/sitemap.xml`;

  return new Response(robotsBody, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}

export function createSitemapXmlResponse(url: URL): Response {
  return new Response(renderSitemapXml(getSitemapEntries(url.origin)), {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
}
