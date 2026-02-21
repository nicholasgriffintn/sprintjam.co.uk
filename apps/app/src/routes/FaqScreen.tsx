import { motion } from "framer-motion";
import { useMemo } from "react";

import { Footer } from "@/components/layout/Footer";
import { PageSection } from "@/components/layout/PageBackground";
import { usePageMeta } from "@/hooks/usePageMeta";
import { SurfaceCard } from "@/components/ui";
import { SITE_NAME } from "@/constants";
import { generateFAQSchema } from "@/utils/structured-data";
import type { MetaTagConfig } from "@/utils/meta";
import {
  quickStart,
  basicsFaqs,
  sprintjamFaqs,
  scrumFaqs,
  cardsFaqs,
  facilitationFaqs,
  alternativesFaqs,
  allFaqs,
  type FAQItem,
} from "@/content/faqs";

const FaqScreen = () => {
  const faqSchema = useMemo(
    () =>
      generateFAQSchema(
        allFaqs.map((faq) => ({
          question: faq.question,
          answer: faq.plainText,
        })),
      ),
    [],
  );

  const metaConfig: MetaTagConfig = useMemo(
    () => ({
      title: `FAQ & Planning Guide - ${SITE_NAME}`,
      description: `Answers to common ${SITE_NAME} questions plus a quick guide to running effective Scrum planning poker sessions.`,
      keywords:
        "faq, sprintjam help, planning poker guide, scrum estimation, story points, agile estimation, sprint planning",
      ogImage: "/og-image.png",
      jsonLd: faqSchema,
    }),
    [faqSchema],
  );

  usePageMeta(metaConfig);

  const renderFaqCard = ({ question, answer }: FAQItem) => (
    <details
      key={question}
      className="group rounded-2xl border border-slate-200/80 bg-white/80 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md open:border-brand-200 open:bg-white dark:border-white/10 dark:bg-white/5 dark:open:border-brand-300/40 [&_summary::-webkit-details-marker]:hidden"
    >
      <summary className="flex cursor-pointer items-center justify-between gap-3 text-left text-base font-semibold text-slate-900 transition group-open:text-brand-700 dark:text-white dark:group-open:text-brand-200">
        <span>{question}</span>
        <span className="text-sm text-brand-600 transition group-open:rotate-180">
          v
        </span>
      </summary>
      <div className="mt-3 space-y-2 text-sm leading-relaxed text-slate-700 dark:text-slate-200 text-left">
        {answer}
      </div>
    </details>
  );

  return (
    <PageSection maxWidth="xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="space-y-14 lg:space-y-16"
      >
        <div className="space-y-8">
          <div className="space-y-3 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-600">
              FAQ & Planning Guide
            </p>
            <h1 className="text-4xl font-semibold leading-tight text-slate-900 dark:text-white sm:text-5xl lg:text-6xl">
              Run confident estimation sessions with {SITE_NAME}
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-300">
              A quick walkthrough of how {SITE_NAME} works and a refresher on
              running effective planning poker for Scrum teams.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {quickStart.map(({ title, description, icon: Icon }) => (
              <div
                key={title}
                className="flex flex-col gap-2 rounded-2xl border border-slate-200/70 bg-white/80 p-5 text-left shadow-sm dark:border-white/10 dark:bg-white/5"
              >
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-700 ring-1 ring-brand-100 dark:bg-brand-500/10 dark:text-brand-200 dark:ring-brand-300/40">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {title}
                </h2>
                <p className="text-sm text-slate-700 dark:text-slate-200">
                  {description}
                </p>
              </div>
            ))}
          </div>

          <section className="space-y-4">
            <div className="text-left">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-brand-600 mb-2">
                Planning poker 101
              </p>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
                Foundations
              </h2>
            </div>
            <div className="grid gap-4">{basicsFaqs.map(renderFaqCard)}</div>
          </section>

          <section className="space-y-4">
            <div className="text-left">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-brand-600 mb-2">
                Using {SITE_NAME}
              </p>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
                Product questions
              </h2>
            </div>
            <div className="grid gap-4">{sprintjamFaqs.map(renderFaqCard)}</div>
          </section>

          <section className="space-y-4">
            <div className="text-left">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-brand-600 mb-2">
                Scrum planning
              </p>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
                Estimation practices
              </h2>
            </div>
            <div className="grid gap-4">{scrumFaqs.map(renderFaqCard)}</div>
          </section>

          <section className="space-y-4">
            <div className="text-left">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-brand-600 mb-2">
                Cards and scales
              </p>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
                Making the numbers useful
              </h2>
            </div>
            <div className="grid gap-4">{cardsFaqs.map(renderFaqCard)}</div>
          </section>

          <section className="space-y-4">
            <div className="text-left">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-brand-600 mb-2">
                Facilitation
              </p>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
                Keep sessions focused
              </h2>
            </div>
            <div className="grid gap-4">
              {facilitationFaqs.map(renderFaqCard)}
            </div>
          </section>

          <section className="space-y-4">
            <div className="text-left">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-brand-600 mb-2">
                Alternatives
              </p>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
                When to try something else
              </h2>
            </div>
            <div className="grid gap-4">
              {alternativesFaqs.map(renderFaqCard)}
            </div>
          </section>

          <SurfaceCard variant="subtle" className="text-left">
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-brand-600">
                  Go deeper
                </p>
                <h3 className="text-2xl font-semibold text-slate-900 dark:text-white">
                  Explore our estimation guides
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  In-depth articles on Planning Poker, Fibonacci scales, session
                  facilitation, and more.
                </p>
              </div>
              <a
                href="/guides"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200/70 bg-white px-5 py-3 text-sm font-semibold text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:text-brand-700 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:border-brand-300/60"
              >
                Browse guides
              </a>
            </div>
          </SurfaceCard>

          <SurfaceCard className="text-left">
            <div className="grid gap-4 md:grid-cols-[1.5fr_auto] md:items-center">
              <div className="space-y-2">
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-brand-600">
                  Ready to start planning?
                </p>
                <h3 className="text-2xl font-semibold text-slate-900 dark:text-white">
                  Put your knowledge into practice with our free {SITE_NAME}{" "}
                  room.
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Spin up a fresh room, pick Classic or Structured voting, and
                  invite your team with a single link.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 md:justify-end">
                <a
                  href="/create"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-indigo-500 px-5 py-3 text-sm font-semibold text-white shadow-floating transition hover:from-brand-600 hover:to-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                >
                  Start a room
                </a>
                <a
                  href="/join"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200/70 bg-white px-5 py-3 text-sm font-semibold text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:text-brand-700 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:border-brand-300/60"
                >
                  Join with code
                </a>
              </div>
            </div>
          </SurfaceCard>

          <Footer priorityLinksOnly={false} />
        </div>
      </motion.div>
    </PageSection>
  );
};

export default FaqScreen;
