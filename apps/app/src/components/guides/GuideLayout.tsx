import { motion } from 'framer-motion';
import { ArrowLeft, ArrowUpRight, Clock } from 'lucide-react';
import type { ReactNode } from 'react';
import { useMemo } from 'react';

import { Footer } from '@/components/layout/Footer';
import { PageSection } from '@/components/layout/PageBackground';
import { SurfaceCard } from '@/components/ui';
import { usePageMeta } from '@/hooks/usePageMeta';
import { SITE_NAME } from '@/constants';
import {
  generateArticleSchema,
  generateBreadcrumbSchema,
} from '@/utils/structured-data';
import type { MetaTagConfig } from '@/utils/meta';
import { useSessionActions } from '@/context/SessionContext';
import { navigateTo, type AppScreen } from '@/config/routes';
import { guides, type GuideInfo } from '@/routes/guides/GuidesScreen';

interface GuideLayoutProps {
  slug: string;
  children?: ReactNode;
  datePublished: string;
  dateModified?: string;
  contentHtml?: string;
  preview?: ReactNode;
}

const categoryLabels: Record<GuideInfo['category'], string> = {
  fundamentals: 'Fundamentals',
  facilitation: 'Facilitation',
  techniques: 'Techniques',
  tools: 'Tools & Integrations',
};

export const GuideLayout = ({
  slug,
  children,
  datePublished,
  dateModified,
  contentHtml,
  preview,
}: GuideLayoutProps) => {
  const { startCreateFlow, setScreen } = useSessionActions();

  const guide = guides.find((g) => g.slug === slug);

  if (!guide) {
    return null;
  }

  const handleNavigate = (screen: AppScreen) => {
    setScreen(screen);
    navigateTo(screen);
  };

  const relatedGuides = guides
    .filter((g) => g.slug !== slug)
    .filter((g) => g.category === guide.category || g.featured)
    .slice(0, 3);

  const jsonLd = useMemo(
    () => ({
      '@context': 'https://schema.org',
      '@graph': [
        generateBreadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Guides', path: '/guides' },
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
    }),
    [guide, slug, datePublished, dateModified]
  );

  const metaConfig: MetaTagConfig = useMemo(
    () => ({
      title: `${guide.title} - ${SITE_NAME}`,
      description: guide.description,
      keywords: `${guide.title.toLowerCase()}, planning poker, agile estimation, scrum, story points, ${guide.category}`,
      ogImage: '/og-image.png',
      jsonLd,
    }),
    [guide, jsonLd]
  );

  usePageMeta(metaConfig);

  return (
    <PageSection maxWidth="xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="space-y-10 lg:space-y-12"
      >
        <div className="space-y-6 text-left">
          <button
            type="button"
            onClick={() => handleNavigate('guides' as AppScreen)}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-brand-700 dark:text-slate-400 dark:hover:text-brand-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to guides
          </button>

          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 ring-1 ring-brand-100 dark:bg-brand-500/10 dark:text-brand-200 dark:ring-brand-300/30">
                {categoryLabels[guide.category]}
              </span>
              <span className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                <Clock className="h-4 w-4" />
                {guide.readTime} read
              </span>
            </div>

            <h1 className="text-3xl font-semibold leading-tight text-slate-900 dark:text-white sm:text-4xl lg:text-5xl">
              {guide.title}
            </h1>

            <p className="text-lg text-slate-600 dark:text-slate-300">
              {guide.description}
            </p>
          </div>
        </div>

        {preview ? <div className="space-y-4">{preview}</div> : null}

        {contentHtml ? (
          <article
            className="prose prose-slate max-w-none dark:prose-invert prose-headings:font-semibold prose-headings:tracking-tight prose-h2:text-2xl prose-h3:text-xl prose-p:leading-relaxed prose-li:leading-relaxed prose-a:text-brand-600 prose-a:no-underline hover:prose-a:underline dark:prose-a:text-brand-300 text-left"
            dangerouslySetInnerHTML={{ __html: contentHtml }}
          />
        ) : (
          <article className="prose prose-slate max-w-none dark:prose-invert prose-headings:font-semibold prose-headings:tracking-tight prose-h2:text-2xl prose-h3:text-xl prose-p:leading-relaxed prose-li:leading-relaxed prose-a:text-brand-600 prose-a:no-underline hover:prose-a:underline dark:prose-a:text-brand-300 text-left">
            {children}
          </article>
        )}

        <SurfaceCard className="text-left">
          <div className="grid gap-4 md:grid-cols-[1.5fr_auto] md:items-center">
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-brand-600">
                Try it yourself
              </p>
              <h3 className="text-2xl font-semibold text-slate-900 dark:text-white">
                Put this into practice with a free {SITE_NAME} room
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                No signup required. Create a room and invite your team in
                seconds.
              </p>
            </div>
            <div>
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-indigo-500 px-5 py-3 text-sm font-semibold text-white shadow-floating transition hover:from-brand-600 hover:to-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                onClick={startCreateFlow}
              >
                Start a room
              </button>
            </div>
          </div>
        </SurfaceCard>

        {relatedGuides.length > 0 && (
          <section className="space-y-6">
            <div className="text-left">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-brand-600 mb-2">
                Keep learning
              </p>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
                Related guides
              </h2>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {relatedGuides.map((related) => (
                <SurfaceCard key={related.slug} className="h-full text-left">
                  <div className="flex flex-col h-full">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="inline-flex items-center rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700 ring-1 ring-brand-100 dark:bg-brand-500/10 dark:text-brand-200 dark:ring-brand-300/30">
                        {categoryLabels[related.category]}
                      </span>
                    </div>
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                      {related.title}
                    </h3>
                    <p className="mt-1 flex-1 text-sm text-slate-600 dark:text-slate-300 line-clamp-2">
                      {related.description}
                    </p>
                    <div className="mt-3">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 transition hover:translate-x-1 dark:text-brand-200"
                        onClick={() =>
                          handleNavigate(
                            `guides${related.slug.charAt(0).toUpperCase() + related.slug.slice(1).replace(/-([a-z])/g, (_, c) => c.toUpperCase())}` as AppScreen
                          )
                        }
                      >
                        Read
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </SurfaceCard>
              ))}
            </div>
          </section>
        )}

        <Footer priorityLinksOnly={false} />
      </motion.div>
    </PageSection>
  );
};

export default GuideLayout;
