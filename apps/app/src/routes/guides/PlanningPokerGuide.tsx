import { useMemo } from "react";

import { GuideLayout } from "@/components/guides/GuideLayout";
import guideMarkdown from "@/content/guides/planning-poker.md?raw";
import { renderMarkdownToHtml } from "@/utils/markdown";

const PlanningPokerGuide = () => {
  const renderedGuide = useMemo(() => renderMarkdownToHtml(guideMarkdown), []);

  return (
    <GuideLayout
      slug="planning-poker"
      datePublished="2024-01-15"
      dateModified="2025-01-16"
      contentHtml={renderedGuide}
    />
  );
};

export default PlanningPokerGuide;
