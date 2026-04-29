import { useMemo } from "react";

import { CardPreview } from "@/components/guides/CardPreview";
import { GuideLayout } from "@/components/guides/GuideLayout";
import { cardDecks } from "@/content/guides/cardDecks";
import guideMarkdown from "@/content/guides/fibonacci-short.md?raw";
import { renderMarkdownToHtml } from "@/utils/markdown";
import { createMeta } from "../meta";
import { getGuideArticleMeta } from "./guide-meta";

export const meta = createMeta("guidesFibonacciShort", () =>
  getGuideArticleMeta("fibonacci-short", "2024-01-15", "2025-01-16"),
);

const FibonacciShortGuide = () => {
  const renderedGuide = useMemo(() => renderMarkdownToHtml(guideMarkdown), []);

  return (
    <GuideLayout
      slug="fibonacci-short"
      datePublished="2024-01-15"
      dateModified="2025-01-16"
      preview={<CardPreview options={cardDecks["fibonacci-short"].options} />}
      contentHtml={renderedGuide}
    />
  );
};

export default FibonacciShortGuide;
