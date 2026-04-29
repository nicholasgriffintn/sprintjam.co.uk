import { useMemo } from "react";

import { CardPreview } from "@/components/guides/CardPreview";
import { GuideLayout } from "@/components/guides/GuideLayout";
import { cardDecks } from "@/content/guides/cardDecks";
import guideMarkdown from "@/content/guides/planet-scale.md?raw";
import { renderMarkdownToHtml } from "@/utils/markdown";
import { createMeta } from "../meta";
import { getGuideArticleMeta } from "./guide-meta";

export const meta = createMeta("guidesPlanetScale", () =>
  getGuideArticleMeta("planet-scale", "2024-01-15", "2025-01-16"),
);

const PlanetScaleGuide = () => {
  const renderedGuide = useMemo(() => renderMarkdownToHtml(guideMarkdown), []);

  return (
    <GuideLayout
      slug="planet-scale"
      datePublished="2024-01-15"
      dateModified="2025-01-16"
      preview={<CardPreview options={cardDecks["planet-scale"].options} />}
      contentHtml={renderedGuide}
    />
  );
};

export default PlanetScaleGuide;
