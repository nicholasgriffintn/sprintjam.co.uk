import { useMemo } from "react";

import { CardPreview } from "@/components/guides/CardPreview";
import { GuideLayout } from "@/components/guides/GuideLayout";
import { cardDecks } from "@/content/guides/cardDecks";
import guideMarkdown from "@/content/guides/hours-estimates.md?raw";
import { renderMarkdownToHtml } from "@/utils/markdown";
import { createMeta } from "../meta";
import { getGuideArticleMeta } from "./guide-meta";

export const meta = createMeta("guidesHoursEstimates", () =>
  getGuideArticleMeta("hours-estimates", "2024-01-15", "2025-01-16"),
);

const HoursEstimatesGuide = () => {
  const renderedGuide = useMemo(() => renderMarkdownToHtml(guideMarkdown), []);

  return (
    <GuideLayout
      slug="hours-estimates"
      datePublished="2024-01-15"
      dateModified="2025-01-16"
      preview={<CardPreview options={cardDecks.hours.options} />}
      contentHtml={renderedGuide}
    />
  );
};

export default HoursEstimatesGuide;
