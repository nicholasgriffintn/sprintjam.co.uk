import { useMemo } from "react";

import { CardPreview } from "@/components/guides/CardPreview";
import { GuideLayout } from "@/components/guides/GuideLayout";
import { cardDecks } from "@/content/guides/cardDecks";
import guideMarkdown from "@/content/guides/doubling-scale.md?raw";
import { renderMarkdownToHtml } from "@/utils/markdown";
import { createMeta } from "../../utils/route-meta";
import { getGuideArticleMeta } from "@/utils/guide-meta";

export const meta = createMeta("guidesDoublingScale", () =>
  getGuideArticleMeta("doubling-scale", "2024-01-15", "2025-01-16"),
);

const DoublingScaleGuide = () => {
  const renderedGuide = useMemo(() => renderMarkdownToHtml(guideMarkdown), []);

  return (
    <GuideLayout
      slug="doubling-scale"
      datePublished="2024-01-15"
      dateModified="2025-01-16"
      preview={<CardPreview options={cardDecks.doubling.options} />}
      contentHtml={renderedGuide}
    />
  );
};

export default DoublingScaleGuide;
