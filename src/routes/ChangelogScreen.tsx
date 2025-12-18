import { motion } from 'framer-motion';
import { useMemo } from 'react';

import changelogMd from '@/content/changelog.md?raw';
import { Footer } from '@/components/layout/Footer';
import { Logo } from '@/components/Logo';
import { PageBackground } from '@/components/layout/PageBackground';
import { META_CONFIGS } from '@/config/meta';
import { usePageMeta } from '@/hooks/usePageMeta';
import { renderMarkdownToHtml } from '@/utils/markdown';

const ChangelogScreen = () => {
  usePageMeta(META_CONFIGS.changelog);

  const renderedChangelog = useMemo(
    () => renderMarkdownToHtml(changelogMd),
    []
  );

  return (
    <PageBackground variant="compact" maxWidth="lg">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-10"
      >
        <div className="flex justify-center">
          <a href="/" aria-label="SprintJam home" className="hover:opacity-80">
            <Logo size="lg" />
          </a>
        </div>

        <div className="space-y-5 rounded-3xl border border-slate-200/70 bg-white/80 p-6 text-left shadow-lg shadow-brand-500/5 backdrop-blur dark:border-white/10 dark:bg-white/5 dark:shadow-none sm:p-8 lg:p-10">
          <div className="flex items-start gap-4">
            <div className="space-y-1">
              <h1 className="text-3xl font-semibold leading-tight text-slate-900 dark:text-white sm:text-4xl">
                Changelog
              </h1>
              <p className="text-base text-slate-600 dark:text-slate-300">
                The latest updates to SprintJam.
              </p>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white/90 p-5 shadow-inner shadow-slate-200/70 dark:border-white/10 dark:bg-white/5 dark:shadow-none sm:p-6">
            <article
              className="prose prose-slate max-w-none text-slate-800 prose-headings:font-semibold prose-a:text-brand-600 prose-a:no-underline prose-a:hover:underline dark:prose-invert dark:text-slate-100"
              dangerouslySetInnerHTML={{
                __html:
                  renderedChangelog ||
                  '<p>The changelog is empty. Add your first entry in src/content/changelog.md.</p>',
              }}
            />
          </div>
        </div>

        <Footer />
      </motion.div>
    </PageBackground>
  );
};

export default ChangelogScreen;
