import type { MetaFunction } from "react-router";

import { getMetaConfig } from "@/config/meta";
import type { AppScreen } from "@/config/routes";
import type { MetaTagConfig } from "@/utils/meta";

const SITE_ORIGIN = "https://sprintjam.co.uk";
const SITE_NAME = "SprintJam";
const DEFAULT_SOCIAL_IMAGE_PATH = "/og-image.png";
const DEFAULT_SOCIAL_IMAGE_WIDTH = 1200;
const DEFAULT_SOCIAL_IMAGE_HEIGHT = 630;
const TWITTER_HANDLE = "@sprintjam";

function getAbsoluteUrl(path: string): string {
  return new URL(path, SITE_ORIGIN).toString();
}

function getRouteMeta(config: MetaTagConfig, pathname: string) {
  const title = config.title ?? config.ogTitle ?? SITE_NAME;
  const description = config.description ?? config.ogDescription ?? "";
  const canonicalUrl = config.canonical ?? getAbsoluteUrl(pathname);
  const socialImageUrl = getAbsoluteUrl(
    config.ogImage ?? DEFAULT_SOCIAL_IMAGE_PATH,
  );

  return [
    { title },
    { name: "description", content: description },
    ...(config.keywords
      ? [{ name: "keywords", content: config.keywords }]
      : []),
    { tagName: "link", rel: "canonical", href: canonicalUrl },
    { property: "og:title", content: config.ogTitle ?? title },
    {
      property: "og:description",
      content: config.ogDescription ?? description,
    },
    { property: "og:url", content: config.ogUrl ?? canonicalUrl },
    { property: "og:type", content: "website" },
    { property: "og:locale", content: "en_GB" },
    { property: "og:site_name", content: SITE_NAME },
    { property: "og:image", content: socialImageUrl },
    { property: "og:image:width", content: String(DEFAULT_SOCIAL_IMAGE_WIDTH) },
    {
      property: "og:image:height",
      content: String(DEFAULT_SOCIAL_IMAGE_HEIGHT),
    },
    { property: "og:image:alt", content: `${SITE_NAME} website preview` },
    {
      name: "twitter:card",
      content: config.twitterCard ?? "summary_large_image",
    },
    { name: "twitter:title", content: config.twitterTitle ?? title },
    {
      name: "twitter:description",
      content: config.twitterDescription ?? description,
    },
    { name: "twitter:creator", content: TWITTER_HANDLE },
    { name: "twitter:site", content: TWITTER_HANDLE },
    { name: "twitter:image", content: config.twitterImage ?? socialImageUrl },
    { name: "robots", content: "index, follow, max-image-preview:large" },
    { name: "application-name", content: SITE_NAME },
    ...(config.jsonLd ? [{ "script:ld+json": config.jsonLd }] : []),
  ];
}

export function createMeta(
  screen: AppScreen,
  getOverrides?: () => MetaTagConfig,
): MetaFunction {
  return ({ location }) =>
    getRouteMeta(
      {
        ...getMetaConfig(screen),
        ...getOverrides?.(),
      },
      location.pathname,
    );
}
