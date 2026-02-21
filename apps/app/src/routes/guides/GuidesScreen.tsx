import { motion } from "framer-motion";
import { ArrowUpRight, BookOpen, Clock, Users } from "lucide-react";
import { useMemo } from "react";

import { Footer } from "@/components/layout/Footer";
import { PageSection } from "@/components/layout/PageBackground";
import { SurfaceCard } from "@/components/ui";
import { usePageMeta } from "@/hooks/usePageMeta";
import { SITE_NAME } from "@/constants";
import {
  generateBreadcrumbSchema,
  generateSoftwareApplicationSchema,
} from "@/utils/structured-data";
import type { MetaTagConfig } from "@/utils/meta";
import { useSessionActions } from "@/context/SessionContext";
import { navigateTo, type AppScreen } from "@/config/routes";

export interface GuideInfo {
  slug: string;
  title: string;
  description: string;
  readTime: string;
  category: "fundamentals" | "facilitation" | "techniques" | "tools";
  featured?: boolean;
}

export const guides: GuideInfo[] = [
  {
    slug: "planning-poker",
    title: "What is Planning Poker?",
    description:
      "Learn the fundamentals of Planning Poker, why simultaneous voting reduces bias, and how teams use it to estimate work effectively.",
    readTime: "5 min",
    category: "fundamentals",
    featured: true,
  },
  {
    slug: "fibonacci-scale",
    title: "Understanding the Fibonacci Scale",
    description:
      "Why agile teams use Fibonacci numbers for estimation, how the growing gaps acknowledge uncertainty, and when to use alternatives.",
    readTime: "4 min",
    category: "fundamentals",
    featured: true,
  },
  {
    slug: "sprint-planning",
    title: "Estimation in Sprint Planning",
    description:
      "Where estimation fits in Scrum ceremonies, preparing your backlog, and balancing refinement with planning.",
    readTime: "6 min",
    category: "techniques",
  },
  {
    slug: "structured-voting",
    title: "Structured Voting Explained",
    description:
      "When to use weighted multi-factor scoring instead of single-number estimates. Complexity, confidence, volume, and unknowns.",
    readTime: "4 min",
    category: "techniques",
  },
  {
    slug: "fibonacci-short",
    title: "Fibonacci Short Scale",
    description:
      "A tighter Fibonacci deck for faster sprint planning: 1, 2, 3, 5, 8, 13, 21.",
    readTime: "3 min",
    category: "techniques",
  },
  {
    slug: "doubling-scale",
    title: "Doubling Scale Cards",
    description:
      "A coarse 2, 4, 8, 16, 32 scale for high uncertainty and quick alignment.",
    readTime: "3 min",
    category: "techniques",
  },
  {
    slug: "tshirt-sizing",
    title: "T-Shirt Sizing Cards",
    description:
      "XS to XL sizing for early discovery, roadmaps, and fast grouping.",
    readTime: "3 min",
    category: "techniques",
  },
  {
    slug: "planet-scale",
    title: "Planet Scale Cards",
    description:
      "A playful scale from Moon to Pluto for quick, relative sizing.",
    readTime: "3 min",
    category: "techniques",
  },
  {
    slug: "yes-no",
    title: "Yes/No Cards",
    description: "Binary decisions for readiness checks and go/no-go calls.",
    readTime: "2 min",
    category: "techniques",
  },
  {
    slug: "simple-scale",
    title: "Simple 1-8 Cards",
    description:
      "A straight 1-8 scale for teams that want a linear starting point.",
    readTime: "3 min",
    category: "techniques",
  },
  {
    slug: "hours-estimates",
    title: "Hours Cards",
    description:
      "Time-based estimates for operational work and short-term scheduling.",
    readTime: "3 min",
    category: "techniques",
  },
  {
    slug: "session-roles",
    title: "Estimation Session Roles",
    description:
      "Define clear roles for your estimation sessions: Facilitator, Scribe, Timekeeper, and participants. Keep sessions focused and productive.",
    readTime: "6 min",
    category: "facilitation",
    featured: true,
  },
  {
    slug: "remote-estimation",
    title: "Running Remote Estimation Sessions",
    description:
      "Best practices for distributed teams: async preparation, time zone considerations, and keeping remote participants engaged.",
    readTime: "7 min",
    category: "facilitation",
  },
  {
    slug: "story-points",
    title: "Story Points vs Hours",
    description:
      "Understand why relative estimation beats time-based estimates, how to calibrate your team, and avoid the hours trap.",
    readTime: "5 min",
    category: "fundamentals",
  },
  {
    slug: "consensus-building",
    title: "Handling Disagreement and Building Consensus",
    description:
      "Turn vote spread into productive discussion. Techniques for surfacing assumptions and reaching agreement.",
    readTime: "5 min",
    category: "facilitation",
  },
];

const categoryLabels: Record<GuideInfo["category"], string> = {
  fundamentals: "Fundamentals",
  facilitation: "Facilitation",
  techniques: "Techniques",
  tools: "Tools & Integrations",
};

const categoryDescriptions: Record<GuideInfo["category"], string> = {
  fundamentals: "Core concepts every team should know",
  facilitation: "Run better estimation sessions",
  techniques: "Advanced estimation methods",
  tools: "Get more from your tools",
};

const GuidesScreen = () => {
  const { startCreateFlow, startJoinFlow, setScreen } = useSessionActions();

  const handleNavigate = (screen: AppScreen) => {
    setScreen(screen);
    navigateTo(screen);
  };

  const jsonLd = useMemo(
    () => ({
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
    }),
    [],
  );

  const metaConfig: MetaTagConfig = useMemo(
    () => ({
      title: `Estimation Guides - ${SITE_NAME}`,
      description:
        "Learn planning poker fundamentals, Fibonacci estimation, session facilitation, and agile best practices. Free guides for Scrum teams.",
      keywords:
        "planning poker guide, agile estimation, story points, scrum estimation, sprint planning, fibonacci scale, estimation techniques",
      ogImage: "/og-image.png",
      jsonLd,
    }),
    [jsonLd],
  );

  usePageMeta(metaConfig);

  const featuredGuides = guides.filter((g) => g.featured);
  const guidesByCategory = guides.reduce(
    (acc, guide) => {
      if (!acc[guide.category]) {
        acc[guide.category] = [];
      }
      acc[guide.category].push(guide);
      return acc;
    },
    {} as Record<GuideInfo["category"], GuideInfo[]>,
  );

  const renderGuideCard = (guide: GuideInfo, featured = false) => (
    <SurfaceCard
      key={guide.slug}
      className={`h-full text-left ${featured ? "" : ""}`}
    >
      <div className="flex flex-col h-full">
        <div className="mb-3 flex items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700 ring-1 ring-brand-100 dark:bg-brand-500/10 dark:text-brand-200 dark:ring-brand-300/30">
            {categoryLabels[guide.category]}
          </span>
          <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
            <Clock className="h-3 w-3" />
            {guide.readTime}
          </span>
        </div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
          {guide.title}
        </h3>
        <p className="mt-2 flex-1 text-sm text-slate-600 dark:text-slate-300">
          {guide.description}
        </p>
        <div className="mt-4">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 transition hover:translate-x-1 dark:text-brand-200"
            onClick={() =>
              handleNavigate(
                `guides${guide.slug.charAt(0).toUpperCase() + guide.slug.slice(1).replace(/-([a-z])/g, (_, c) => c.toUpperCase())}` as AppScreen,
              )
            }
          >
            Read guide
            <ArrowUpRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </SurfaceCard>
  );

  return (
    <PageSection maxWidth="xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="space-y-14 lg:space-y-16"
      >
        <div className="space-y-10">
          <div className="space-y-3 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-600">
              Estimation Guides
            </p>
            <h1 className="text-4xl font-semibold leading-tight text-slate-900 dark:text-white sm:text-5xl lg:text-6xl">
              Learn agile estimation from first principles
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-300">
              Planning poker fundamentals, facilitation techniques, and
              practical advice for Scrum teams of all sizes.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex flex-col gap-2 rounded-2xl border border-slate-200/70 bg-white/80 p-5 text-left shadow-sm dark:border-white/10 dark:bg-white/5">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-700 ring-1 ring-brand-100 dark:bg-brand-500/10 dark:text-brand-200 dark:ring-brand-300/40">
                <BookOpen className="h-5 w-5" aria-hidden="true" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Comprehensive Guides
              </h2>
              <p className="text-sm text-slate-700 dark:text-slate-200">
                From basics to advanced techniques, covering estimation
                end-to-end.
              </p>
            </div>
            <div className="flex flex-col gap-2 rounded-2xl border border-slate-200/70 bg-white/80 p-5 text-left shadow-sm dark:border-white/10 dark:bg-white/5">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-700 ring-1 ring-brand-100 dark:bg-brand-500/10 dark:text-brand-200 dark:ring-brand-300/40">
                <Clock className="h-5 w-5" aria-hidden="true" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Quick reads
              </h2>
              <p className="text-sm text-slate-700 dark:text-slate-200">
                Each guide takes 4-7 minutes. Learn during a coffee break.
              </p>
            </div>
            <div className="flex flex-col gap-2 rounded-2xl border border-slate-200/70 bg-white/80 p-5 text-left shadow-sm dark:border-white/10 dark:bg-white/5">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-700 ring-1 ring-brand-100 dark:bg-brand-500/10 dark:text-brand-200 dark:ring-brand-300/40">
                <Users className="h-5 w-5" aria-hidden="true" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Team-ready
              </h2>
              <p className="text-sm text-slate-700 dark:text-slate-200">
                Share with your team to align on estimation practices.
              </p>
            </div>
          </div>
        </div>

        <section className="space-y-6">
          <div className="text-left">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-brand-600 mb-2">
              Start here
            </p>
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
              Featured guides
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {featuredGuides.map((guide) => renderGuideCard(guide, true))}
          </div>
        </section>

        {(Object.keys(guidesByCategory) as GuideInfo["category"][]).map(
          (category) => (
            <section key={category} className="space-y-6">
              <div className="text-left">
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-brand-600 mb-2">
                  {categoryLabels[category]}
                </p>
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
                  {categoryDescriptions[category]}
                </h2>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {guidesByCategory[category].map((guide) =>
                  renderGuideCard(guide),
                )}
              </div>
            </section>
          ),
        )}

        <SurfaceCard variant="subtle" className="space-y-4 text-left">
          <div className="space-y-1">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-brand-600">
              Put it into practice
            </p>
            <h3 className="text-2xl font-semibold text-slate-900 dark:text-white">
              Ready to run your first session?
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Create a room in seconds. No signup required for guests.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-indigo-500 px-5 py-3 text-sm font-semibold text-white shadow-floating transition hover:from-brand-600 hover:to-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
              onClick={startCreateFlow}
            >
              Create a room
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200/70 bg-white px-5 py-3 text-sm font-semibold text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:text-brand-700 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:border-brand-300/60"
              onClick={startJoinFlow}
            >
              Join with a code
            </button>
          </div>
        </SurfaceCard>

        <Footer priorityLinksOnly={false} />
      </motion.div>
    </PageSection>
  );
};

export default GuidesScreen;
