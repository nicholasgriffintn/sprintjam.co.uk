export interface MetaTagConfig {
  title?: string;
  description?: string;
  keywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogUrl?: string;
  twitterCard?: 'summary' | 'summary_large_image' | 'app' | 'player';
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  canonical?: string;
}

/**
 * Updates the document meta tags with the provided configuration
 * This function handles title, description, Open Graph, Twitter Card, and canonical tags
 */
export function updateMetaTags(config: MetaTagConfig): void {
  // Update document title
  if (config.title) {
    document.title = config.title;
  }

  // Update or create meta description
  if (config.description) {
    updateMetaTag('name', 'description', config.description);
  }

  // Update or create meta keywords
  if (config.keywords) {
    updateMetaTag('name', 'keywords', config.keywords);
  }

  // Open Graph tags
  if (config.ogTitle) {
    updateMetaTag('property', 'og:title', config.ogTitle);
  }
  if (config.ogDescription) {
    updateMetaTag('property', 'og:description', config.ogDescription);
  }
  if (config.ogImage) {
    updateMetaTag('property', 'og:image', config.ogImage);
  }
  if (config.ogUrl) {
    updateMetaTag('property', 'og:url', config.ogUrl);
  }

  // Always set og:type for proper Open Graph compliance
  updateMetaTag('property', 'og:type', 'website');

  // Twitter Card tags
  if (config.twitterCard) {
    updateMetaTag('name', 'twitter:card', config.twitterCard);
  }
  if (config.twitterTitle) {
    updateMetaTag('name', 'twitter:title', config.twitterTitle);
  }
  if (config.twitterDescription) {
    updateMetaTag('name', 'twitter:description', config.twitterDescription);
  }
  if (config.twitterImage) {
    updateMetaTag('name', 'twitter:image', config.twitterImage);
  }

  // Canonical URL
  if (config.canonical) {
    updateCanonicalLink(config.canonical);
  }
}

/**
 * Updates or creates a meta tag in the document head
 */
function updateMetaTag(
  attributeName: 'name' | 'property',
  attributeValue: string,
  content: string
): void {
  const selector = `meta[${attributeName}="${attributeValue}"]`;
  let element = document.querySelector(selector);

  if (element) {
    element.setAttribute('content', content);
  } else {
    const meta = document.createElement('meta');
    meta.setAttribute(attributeName, attributeValue);
    meta.setAttribute('content', content);
    document.head.appendChild(meta);
  }
}

/**
 * Updates or creates the canonical link tag
 */
function updateCanonicalLink(url: string): void {
  let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;

  if (link) {
    link.href = url;
  } else {
    link = document.createElement('link');
    link.rel = 'canonical';
    link.href = url;
    document.head.appendChild(link);
  }
}

/**
 * Gets the current absolute URL for the given path
 */
export function getAbsoluteUrl(path: string = ''): string {
  const baseUrl = window.location.origin;
  return `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
}
