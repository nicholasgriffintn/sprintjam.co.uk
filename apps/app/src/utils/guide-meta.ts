import { SITE_NAME } from "@/constants";
import { guides } from "@/content/guides";
import {
  generateArticleSchema,
  generateBreadcrumbSchema,
  generateSoftwareApplicationSchema,
} from "@/utils/structured-data";
import type { MetaTagConfig } from "@/utils/meta";

export function getGuidesIndexMeta(): MetaTagConfig {
  return {
    title: `Estimation Guides - ${SITE_NAME}`,
    description:
      "Learn planning poker fundamentals, Fibonacci estimation, session facilitation, and agile best practices. Free guides for Scrum teams.",
    keywords:
      "planning poker guide, agile estimation, story points, scrum estimation, sprint planning, fibonacci scale, estimation techniques",
    ogImage: "/og-image.png",
    jsonLd: {
      "@context": "https://schema.org",
      "@graph": [
        generateBreadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Guides", path: "/guides" },
        ]),
        generateSoftwareApplicationSchema(),
        {
          "@type": "CollectionPage",
          name: `Estimation Guides - ${SITE_NAME}`,
          description:
            "Learn planning poker fundamentals, facilitation techniques, and agile estimation best practices.",
          mainEntity: {
            "@type": "ItemList",
            itemListElement: guides.map((guide, index) => ({
              "@type": "ListItem",
              position: index + 1,
              url: `https://sprintjam.co.uk/guides/${guide.slug}`,
              name: guide.title,
            })),
          },
        },
      ],
    },
  };
}

export function getGuideArticleMeta(
  slug: string,
  datePublished: string,
  dateModified?: string,
): MetaTagConfig {
  const guide = guides.find((item) => item.slug === slug);
  if (!guide) {
    return {};
  }

  return {
    title: `${guide.title} - ${SITE_NAME}`,
    description: guide.description,
    keywords: `${guide.title.toLowerCase()}, planning poker, agile estimation, scrum, story points, ${guide.category}`,
    ogImage: "/og-image.png",
    jsonLd: {
      "@context": "https://schema.org",
      "@graph": [
        generateBreadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Guides", path: "/guides" },
          { name: guide.title, path: `/guides/${slug}` },
        ]),
        generateArticleSchema({
          headline: guide.title,
          description: guide.description,
          datePublished,
          dateModified,
          path: `/guides/${slug}`,
        }),
      ],
    },
  };
}
