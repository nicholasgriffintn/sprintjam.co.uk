import { useMemo } from 'react';

import { CardPreview } from '@/components/guides/CardPreview';
import { GuideLayout } from '@/components/guides/GuideLayout';
import { cardDecks } from '@/content/guides/cardDecks';
import guideMarkdown from '@/content/guides/simple-scale.md?raw';
import { renderMarkdownToHtml } from '@/utils/markdown';

const SimpleScaleGuide = () => {
  const renderedGuide = useMemo(() => renderMarkdownToHtml(guideMarkdown), []);

  return (
    <GuideLayout
      slug="simple-scale"
      datePublished="2024-01-15"
      dateModified="2025-01-16"
      preview={<CardPreview options={cardDecks.simple.options} />}
      contentHtml={renderedGuide}
    />
  );
};

export default SimpleScaleGuide;
