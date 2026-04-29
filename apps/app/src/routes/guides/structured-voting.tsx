import { useMemo } from "react";

import { GuideLayout } from "@/components/guides/GuideLayout";
import guideMarkdown from "@/content/guides/structured-voting.md?raw";
import { renderMarkdownToHtml } from "@/utils/markdown";
import { createMeta } from "../meta";
import { getGuideArticleMeta } from "@/utils/guide-meta";

export const meta = createMeta("guidesStructuredVoting", () =>
  getGuideArticleMeta("structured-voting", "2024-01-15", "2025-01-16"),
);

const StructuredVotingGuide = () => {
  const renderedGuide = useMemo(() => renderMarkdownToHtml(guideMarkdown), []);

  return (
    <GuideLayout
      slug="structured-voting"
      datePublished="2024-01-15"
      dateModified="2025-01-16"
      contentHtml={renderedGuide}
    />
  );
};

export default StructuredVotingGuide;
