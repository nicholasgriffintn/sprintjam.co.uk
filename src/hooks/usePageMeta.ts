import { useEffect } from 'react';

import {
  updateMetaTags,
  getAbsoluteUrl,
  type MetaTagConfig,
} from '../utils/meta';

export function usePageMeta(config: MetaTagConfig): void {
  useEffect(() => {
    const fullConfig: MetaTagConfig = {
      ...config,
      canonical: config.canonical || getAbsoluteUrl(window.location.pathname),
      ogUrl:
        config.ogUrl ||
        config.canonical ||
        getAbsoluteUrl(window.location.pathname),
      twitterCard: config.twitterCard || 'summary_large_image',
      ogTitle: config.ogTitle || config.title,
      twitterTitle: config.twitterTitle || config.title,
      ogDescription: config.ogDescription || config.description,
      twitterDescription: config.twitterDescription || config.description,
      twitterImage: config.twitterImage || config.ogImage,
    };

    updateMetaTags(fullConfig);
  }, [config]);
}
