import { useMemo } from 'react';

import { GuideLayout } from '@/components/guides/GuideLayout';
import guideMarkdown from '@/content/guides/session-roles.md?raw';
import { renderMarkdownToHtml } from '@/utils/markdown';

const SessionRolesGuide = () => {
  const renderedGuide = useMemo(() => renderMarkdownToHtml(guideMarkdown), []);

  return (
    <GuideLayout
      slug="session-roles"
      datePublished="2024-01-15"
      dateModified="2025-01-16"
      contentHtml={renderedGuide}
    />
  );
};

export default SessionRolesGuide;
