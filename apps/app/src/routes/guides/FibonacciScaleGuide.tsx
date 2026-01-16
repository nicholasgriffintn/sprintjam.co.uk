import { useMemo } from 'react';

import { GuideLayout } from '@/components/guides/GuideLayout';
import { CardPreview } from '@/components/guides/CardPreview';
import { SITE_NAME } from '@/constants';
import { cardDecks } from '@/content/guides/cardDecks';
import guideMarkdown from '@/content/guides/fibonacci-scale.md?raw';
import { renderMarkdownToHtml } from '@/utils/markdown';

const FibonacciScaleGuide = () => {
  const renderedGuide = useMemo(
    () => renderMarkdownToHtml(guideMarkdown.replaceAll('{{SITE_NAME}}', SITE_NAME)),
    []
  );

  return (
    <GuideLayout
      slug="fibonacci-scale"
      datePublished="2024-01-15"
      dateModified="2025-01-16"
      preview={<CardPreview options={cardDecks.fibonacci.options} />}
      contentHtml={renderedGuide}
    />
  );
};

export default FibonacciScaleGuide;
