import { motion } from "framer-motion";
import { useMemo } from "react";

import changelogMd from "@/content/changelog.md?raw";
import { Footer } from "@/components/layout/Footer";
import { PageSection } from "@/components/layout/PageBackground";
import { META_CONFIGS } from "@/config/meta";
import { usePageMeta } from "@/hooks/usePageMeta";
import { renderMarkdownToHtml } from "@/utils/markdown";

const ChangelogScreen = () => {
  usePageMeta(META_CONFIGS.changelog);

  const renderedChangelog = useMemo(
    () => renderMarkdownToHtml(changelogMd),
    [],
  );

  return (
    <PageSection maxWidth="xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-14 lg:space-y-16"
      >
        <div className="space-y-8">
          <div className="space-y-4">
            <div className="space-y-2">
              <h1 className="text-4xl font-semibold leading-tight text-slate-900 dark:text-white sm:text-5xl lg:text-6xl">
                Changelog
              </h1>
              <p className="text-lg text-slate-600 dark:text-slate-300">
                The latest updates to SprintJam.
              </p>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white/90 p-5 shadow-inner shadow-slate-200/70 dark:border-white/10 dark:bg-white/5 dark:shadow-none sm:p-6">
            <article
              className="text-left prose prose-slate max-w-none text-slate-800 prose-headings:font-semibold prose-a:text-brand-600 prose-a:no-underline prose-a:hover:underline dark:prose-invert dark:text-slate-100"
              dangerouslySetInnerHTML={{
                __html:
                  renderedChangelog ||
                  "<p>The changelog is empty. Add your first entry in src/content/changelog.md.</p>",
              }}
            />
          </div>
        </div>

        <Footer priorityLinksOnly={false} />
      </motion.div>
    </PageSection>
  );
};

export default ChangelogScreen;
