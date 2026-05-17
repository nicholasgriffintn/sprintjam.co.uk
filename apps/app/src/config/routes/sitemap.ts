import { ROUTE_DEFINITIONS } from "./definitions";
import type { RouteSitemapConfig } from "./types";

export interface SitemapEntry extends RouteSitemapConfig {
  loc: string;
}

export function getSitemapEntries(origin: string): SitemapEntry[] {
  return ROUTE_DEFINITIONS.flatMap((route) => {
    const sitemap = "sitemap" in route ? route.sitemap : undefined;
    if (!sitemap) {
      return [];
    }
    const pathname = typeof route.path === "string" ? route.path : route.path({});

    return [
      {
        loc: new URL(pathname, origin).toString(),
        ...sitemap,
      },
    ];
  });
}

export function renderSitemapXml(entries: SitemapEntry[]): string {
  const urls = entries
    .map(
      (entry) => `  <url>
    <loc>${escapeXml(entry.loc)}</loc>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority.toFixed(1)}</priority>
  </url>`,
    )
    .join("\n\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
