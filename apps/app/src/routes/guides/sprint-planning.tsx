import { useMemo } from "react";

import { GuideLayout } from "@/components/guides/GuideLayout";
import guideMarkdown from "@/content/guides/sprint-planning.md?raw";
import { renderMarkdownToHtml } from "@/utils/markdown";
import { createMeta } from "@/utils/route-meta";
import { getGuideArticleMeta } from "@/utils/guide-meta";

export const meta = createMeta("guidesSprintPlanning", () =>
  getGuideArticleMeta("sprint-planning", "2024-01-15", "2025-01-16"),
);

const SprintPlanningGuide = () => {
  const renderedGuide = useMemo(() => renderMarkdownToHtml(guideMarkdown), []);

  return (
    <GuideLayout
      slug="sprint-planning"
      datePublished="2024-01-15"
      dateModified="2025-01-16"
      contentHtml={renderedGuide}
    />
  );
};

export default SprintPlanningGuide;
