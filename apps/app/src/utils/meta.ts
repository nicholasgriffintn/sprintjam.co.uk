export interface MetaTagConfig {
  title?: string;
  description?: string;
  keywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogUrl?: string;
  twitterCard?: "summary" | "summary_large_image" | "app" | "player";
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  canonical?: string;
  jsonLd?: Record<string, unknown>;
}

export function updateMetaTags(config: MetaTagConfig): void {
  if (config.title) {
    document.title = config.title;
  }

  if (config.description) {
    updateMetaTag("name", "description", config.description);
  }

  if (config.keywords) {
    updateMetaTag("name", "keywords", config.keywords);
  }

  if (config.ogTitle) {
    updateMetaTag("property", "og:title", config.ogTitle);
  }
  if (config.ogDescription) {
    updateMetaTag("property", "og:description", config.ogDescription);
  }
  if (config.ogImage) {
    updateMetaTag("property", "og:image", config.ogImage);
  }
  if (config.ogUrl) {
    updateMetaTag("property", "og:url", config.ogUrl);
  }

  updateMetaTag("property", "og:type", "website");

  if (config.twitterCard) {
    updateMetaTag("name", "twitter:card", config.twitterCard);
  }
  if (config.twitterTitle) {
    updateMetaTag("name", "twitter:title", config.twitterTitle);
  }
  if (config.twitterDescription) {
    updateMetaTag("name", "twitter:description", config.twitterDescription);
  }
  if (config.twitterImage) {
    updateMetaTag("name", "twitter:image", config.twitterImage);
  }

  if (config.canonical) {
    updateCanonicalLink(config.canonical);
  }

  if (config.jsonLd) {
    updateJsonLd(config.jsonLd);
  }
}

function updateMetaTag(
  attributeName: "name" | "property",
  attributeValue: string,
  content: string,
): void {
  const selector = `meta[${attributeName}="${attributeValue}"]`;
  let element = document.querySelector(selector);

  if (element) {
    element.setAttribute("content", content);
  } else {
    const meta = document.createElement("meta");
    meta.setAttribute(attributeName, attributeValue);
    meta.setAttribute("content", content);
    document.head.appendChild(meta);
  }
}

function updateCanonicalLink(url: string): void {
  let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;

  if (link) {
    link.href = url;
  } else {
    link = document.createElement("link");
    link.rel = "canonical";
    link.href = url;
    document.head.appendChild(link);
  }
}

export function getAbsoluteUrl(path: string = ""): string {
  const baseUrl = window.location.origin;
  return `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

const JSON_LD_SCRIPT_ID = "sprintjam-json-ld";

function updateJsonLd(data: Record<string, unknown>): void {
  let script = document.getElementById(
    JSON_LD_SCRIPT_ID,
  ) as HTMLScriptElement | null;

  if (script) {
    script.textContent = JSON.stringify(data);
  } else {
    script = document.createElement("script");
    script.id = JSON_LD_SCRIPT_ID;
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(data);
    document.head.appendChild(script);
  }
}

export function removeJsonLd(): void {
  const script = document.getElementById(JSON_LD_SCRIPT_ID);
  if (script) {
    script.remove();
  }
}
