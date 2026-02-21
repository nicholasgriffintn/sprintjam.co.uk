import { useMemo } from "react";

import { CardPreview } from "@/components/guides/CardPreview";
import { GuideLayout } from "@/components/guides/GuideLayout";
import { cardDecks } from "@/content/guides/cardDecks";
import guideMarkdown from "@/content/guides/tshirt-sizing.md?raw";
import { renderMarkdownToHtml } from "@/utils/markdown";

const TshirtSizingGuide = () => {
  const renderedGuide = useMemo(() => renderMarkdownToHtml(guideMarkdown), []);

  return (
    <GuideLayout
      slug="tshirt-sizing"
      datePublished="2024-01-15"
      dateModified="2025-01-16"
      preview={<CardPreview options={cardDecks.tshirt.options} />}
      contentHtml={renderedGuide}
    />
  );
};

export default TshirtSizingGuide;
