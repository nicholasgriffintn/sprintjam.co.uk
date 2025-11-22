import { useEffect } from 'react';
import { updateMetaTags, getAbsoluteUrl, type MetaTagConfig } from '../utils/meta';

/**
 * Hook to manage page meta tags for SEO
 * Updates meta tags when the component mounts and cleans up on unmount
 *
 * @example
 * usePageMeta({
 *   title: 'SprintJam - Create Room',
 *   description: 'Create a new estimation room for your team',
 * });
 */
export function usePageMeta(config: MetaTagConfig): void {
  useEffect(() => {
    // Create full config with absolute URLs where needed
    const fullConfig: MetaTagConfig = {
      ...config,
      // Use provided canonical or generate from current path
      canonical: config.canonical || getAbsoluteUrl(window.location.pathname),
      // Use ogUrl if provided, otherwise use canonical
      ogUrl: config.ogUrl || config.canonical || getAbsoluteUrl(window.location.pathname),
      // Default to summary_large_image for Twitter cards if not specified
      twitterCard: config.twitterCard || 'summary_large_image',
      // Mirror title to og and twitter if not explicitly set
      ogTitle: config.ogTitle || config.title,
      twitterTitle: config.twitterTitle || config.title,
      // Mirror description to og and twitter if not explicitly set
      ogDescription: config.ogDescription || config.description,
      twitterDescription: config.twitterDescription || config.description,
      // Mirror image to twitter if og is set but twitter is not
      twitterImage: config.twitterImage || config.ogImage,
    };

    updateMetaTags(fullConfig);
  }, [config]);
}
