import { useMemo } from 'react';

import { GuideLayout } from '@/components/guides/GuideLayout';
import { SITE_NAME } from '@/constants';
import guideMarkdown from '@/content/guides/consensus-building.md?raw';
import { renderMarkdownToHtml } from '@/utils/markdown';

const ConsensusBuildingGuide = () => {
  const renderedGuide = useMemo(
    () => renderMarkdownToHtml(guideMarkdown.replaceAll('{{SITE_NAME}}', SITE_NAME)),
    []
  );

  return (
    <GuideLayout
      slug="consensus-building"
      datePublished="2024-01-15"
      dateModified="2025-01-16"
      contentHtml={renderedGuide}
    />
  );
};

export default ConsensusBuildingGuide;
