import { useMemo } from "react";

import { GuideLayout } from "@/components/guides/GuideLayout";
import guideMarkdown from "@/content/guides/story-points.md?raw";
import { renderMarkdownToHtml } from "@/utils/markdown";
import { createMeta } from "../meta";
import { getGuideArticleMeta } from "@/utils/guide-meta";

export const meta = createMeta("guidesStoryPoints", () =>
  getGuideArticleMeta("story-points", "2024-01-15", "2025-01-16"),
);

const StoryPointsGuide = () => {
  const renderedGuide = useMemo(() => renderMarkdownToHtml(guideMarkdown), []);

  return (
    <GuideLayout
      slug="story-points"
      datePublished="2024-01-15"
      dateModified="2025-01-16"
      contentHtml={renderedGuide}
    />
  );
};

export default StoryPointsGuide;
