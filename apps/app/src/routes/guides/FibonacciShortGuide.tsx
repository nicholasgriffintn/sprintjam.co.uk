import { useMemo } from 'react';

import { CardPreview } from '@/components/guides/CardPreview';
import { GuideLayout } from '@/components/guides/GuideLayout';
import { SITE_NAME } from '@/constants';
import { cardDecks } from '@/content/guides/cardDecks';
import guideMarkdown from '@/content/guides/fibonacci-short.md?raw';
import { renderMarkdownToHtml } from '@/utils/markdown';

const FibonacciShortGuide = () => {
  const renderedGuide = useMemo(
    () =>
      renderMarkdownToHtml(guideMarkdown.replaceAll('{{SITE_NAME}}', SITE_NAME)),
    []
  );

  return (
    <GuideLayout
      slug="fibonacci-short"
      datePublished="2024-01-15"
      dateModified="2025-01-16"
      preview={<CardPreview options={cardDecks['fibonacci-short'].options} />}
      contentHtml={renderedGuide}
    />
  );
};

export default FibonacciShortGuide;
