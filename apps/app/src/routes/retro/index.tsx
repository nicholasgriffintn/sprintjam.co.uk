import { motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  Columns3,
  LayoutTemplate,
  ListChecks,
  Vote,
} from "lucide-react";
import { Link } from "react-router";

import { BetaBadge } from "@/components/BetaBadge";
import { Footer } from "@/components/layout/Footer";
import { PageSection } from "@/components/layout/PageBackground";
import { MarketingCardHeading } from "@/components/marketing/MarketingCardHeading";
import { RetroTemplateGrid } from "@/components/retro/RetroTemplateGrid";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { SITE_NAME } from "@/constants";
import { createMeta } from "@/utils/route-meta";

export const meta = createMeta("retro");

const capabilities = [
  {
    icon: LayoutTemplate,
    title: "Template-led rooms",
    description:
      "Start with a familiar board format instead of asking the team to build structure from scratch.",
  },
  {
    icon: Vote,
    title: "Vote into focus",
    description:
      "Collect cards first, then use votes to choose the conversations that deserve room time.",
  },
  {
    icon: ListChecks,
    title: "Actions in workspace history",
    description:
      "Completed retros are saved beside planning, standups, and wheel sessions for the same team.",
  },
  {
    icon: CheckCircle2,
    title: "Team defaults",
    description:
      "Set the default template, timer, anonymity, and vote count once from team settings.",
  },
] as const;

const steps = [
  {
    title: "Choose a template",
    detail:
      "Pick the retro shape that fits the team conversation before the room opens.",
  },
  {
    title: "Gather and vote",
    detail:
      "Let everyone add cards, review the board together, and vote on the strongest signals.",
  },
  {
    title: "Close with actions",
    detail:
      "Capture follow-ups and keep the session linked to the team workspace.",
  },
] as const;

export default function RetroIndexRoute() {
  return (
    <PageSection maxWidth="xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="space-y-14 lg:space-y-16"
      >
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-4 text-left">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-600">
                Retrospectives
              </p>
              <BetaBadge />
            </div>
            <h1 className="text-4xl font-semibold leading-tight text-slate-900 dark:text-white sm:text-5xl">
              Retros that stay connected to delivery
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-300">
              Run template-led retro rooms, focus the discussion with votes, and
              keep actions visible in {SITE_NAME} workspace history.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/retro/create"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-indigo-500 px-5 py-3 text-sm font-semibold text-white shadow-floating transition hover:from-brand-600 hover:to-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
              >
                Create retro
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/retro/templates"
                className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700 transition hover:translate-x-1 dark:text-brand-200"
              >
                Browse templates
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="pointer-events-none absolute inset-[-18px] -z-10 rounded-[1.9rem] bg-gradient-to-br from-brand-500/20 via-indigo-500/18 to-blue-500/18 blur-3xl" />
            <div className="relative space-y-3 overflow-hidden rounded-2xl border border-slate-300/60 bg-slate-900 p-6 text-left text-white shadow-lg ring-1 ring-black/5 dark:border-white/10 dark:ring-white/5">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-brand-200">
                Room flow
              </p>
              <div className="grid grid-cols-3 gap-2 text-center text-xs font-semibold text-slate-300">
                {["Input", "Review", "Focus"].map((phase) => (
                  <div
                    key={phase}
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                  >
                    {phase}
                  </div>
                ))}
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {["Start", "Stop", "Continue"].map((column, index) => (
                  <div
                    key={column}
                    className="rounded-xl border border-white/10 bg-black/30 p-3"
                  >
                    <p className="text-sm font-semibold">{column}</p>
                    <div className="mt-3 space-y-2">
                      <div className="h-12 rounded-lg bg-white/10" />
                      {index !== 1 ? (
                        <div className="h-10 rounded-lg bg-white/10" />
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <section className="space-y-4">
          <div className="text-left">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-brand-600">
              Key capabilities
            </p>
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
              Built for facilitated team learning
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {capabilities.map(({ title, description, icon: Icon }) => (
              <SurfaceCard key={title} className="h-full text-left">
                <MarketingCardHeading icon={<Icon />} size="lg">
                  {title}
                </MarketingCardHeading>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  {description}
                </p>
              </SurfaceCard>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="text-left">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-brand-600">
              How it works
            </p>
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
              Three steps from feedback to follow-up
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {steps.map(({ title, detail }, index) => (
              <SurfaceCard key={title} className="h-full text-left">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-700 ring-1 ring-brand-100 dark:bg-brand-500/10 dark:text-brand-200 dark:ring-brand-300/30">
                    {index + 1}
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                    {title}
                  </h3>
                </div>
                <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                  {detail}
                </p>
              </SurfaceCard>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex flex-col gap-3 text-left sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-brand-600">
                Templates
              </p>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
                Start from a proven retro format
              </h2>
            </div>
            <Link
              to="/retro/templates"
              className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700 transition hover:translate-x-1 dark:text-brand-200"
            >
              View all templates
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <RetroTemplateGrid limit={3} />
        </section>

        <SurfaceCard className="text-left">
          <div className="grid gap-4 md:grid-cols-[1.5fr_auto] md:items-center">
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-brand-600">
                Ready for the next retro?
              </p>
              <h3 className="text-2xl font-semibold text-slate-900 dark:text-white">
                Open a room and invite the team
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Team defaults come from workspace settings, so every retro
                starts with the right structure.
              </p>
            </div>
            <Link
              to="/retro/create"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-indigo-500 px-5 py-3 text-sm font-semibold text-white shadow-floating transition hover:from-brand-600 hover:to-indigo-600"
            >
              Create retro
              <Columns3 className="h-4 w-4" />
            </Link>
          </div>
        </SurfaceCard>

        <Footer priorityLinksOnly={false} />
      </motion.div>
    </PageSection>
  );
}
