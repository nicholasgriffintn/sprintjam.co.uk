import { motion } from "framer-motion";
import {
  ArrowUpRight,
  BadgeCheck,
  Database,
  Gauge,
  RefreshCcw,
  Lock,
  ShieldCheck,
  SlidersHorizontal,
  Zap,
} from "lucide-react";

import { useSessionActions } from '@/context/SessionContext';
import { Footer } from "@/components/layout/Footer";
import { PageSection } from "@/components/layout/PageBackground";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { META_CONFIGS } from "@/config/meta";
import { usePageMeta } from "@/hooks/usePageMeta";
import { navigateTo, type AppScreen } from '@/config/routes';
import { SITE_NAME } from "@/constants";

const featureCards = [
  {
    title: "Fast imports",
    description: `Grab Linear issues into ${SITE_NAME} in seconds with filters for teams, labels, or projects.`,
    icon: Zap,
  },
  {
    title: "Real-time context",
    description:
      "Status, labels, and assignees stay visible while you estimate so discussions stay grounded.",
    icon: Gauge,
  },
  {
    title: "Story point sync",
    description:
      "When you reach consensus, push points back to Linear to keep your roadmap aligned.",
    icon: SlidersHorizontal,
  },
  {
    title: "Scoped OAuth",
    description:
      "Moderators connect only for the current room; tokens are encrypted and short-lived.",
    icon: Lock,
  },
];

const steps = [
  {
    title: "Connect Linear",
    detail: `Authorize ${SITE_NAME} for this room with a quick OAuth flow.`,
  },
  {
    title: "Choose issues",
    detail:
      "Select the issues you want to size - filter by team, label, or project.",
  },
  {
    title: "Estimate and sync",
    detail: "Reveal, lock consensus, and send points straight back to Linear.",
  },
];

const securityHighlights = [
  {
    title: "Signed OAuth + room auth",
    detail:
      "Linear OAuth uses signed state + nonce, and every action is gated by a valid room session token.",
    icon: BadgeCheck,
  },
  {
    title: "Least-privilege scopes",
    detail:
      "We request Linear read/write for issues only—no admin or org-wide actions beyond what sizing requires.",
    icon: ShieldCheck,
  },
  {
    title: "Encrypted, room-scoped storage",
    detail:
      "Tokens never live in the browser; they are AES-GCM encrypted with a worker secret and bound to a single room.",
    icon: Database,
  },
  {
    title: "Controlled egress + rotation",
    detail:
      "All calls flow through the room worker; refreshes persist server-side, and stale tokens force a reconnect.",
    icon: RefreshCcw,
  },
  {
    title: "User control & cleanup",
    detail:
      "Moderators can revoke at any time; we revoke from Linear and delete room-side tokens to keep dormant connections closed.",
    icon: BadgeCheck,
  },
  {
    title: "Data handling & privacy",
    detail:
      "GDPR rights, retention, and contacts are documented in our Privacy Policy; integrations follow the same standards.",
    icon: BadgeCheck,
    cta: {
      label: "View Privacy Policy",
      screen: "privacy" as const,
    },
  },
];

const LinearIntegrationScreen = () => {
  usePageMeta(META_CONFIGS.integrationsLinear);
  const { startCreateFlow, startJoinFlow, setScreen } = useSessionActions();

  const handleNavigate = (screen: AppScreen) => {
    setScreen(screen);
    navigateTo(screen);
  };

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
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-600">
              Linear integration
            </p>
            <h1 className="text-4xl font-semibold leading-tight text-slate-900 dark:text-white sm:text-5xl">
              Keep Linear and {SITE_NAME} perfectly in sync
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-300">
              Pull Linear issues into your room, size them together, and push
              story points back without breaking your flow.
            </p>
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
                className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700 transition hover:translate-x-1 dark:text-brand-200"
                onClick={() => handleNavigate('integrations')}
              >
                View all integrations
                <ArrowUpRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="relative">
            <div className="pointer-events-none absolute inset-[-18px] -z-10 rounded-[1.9rem] bg-gradient-to-br from-brand-500/20 via-indigo-500/18 to-blue-500/18 blur-3xl" />
            <div className="relative space-y-3 overflow-hidden rounded-2xl border border-slate-300/60 bg-slate-900 p-6 text-left text-white shadow-lg ring-1 ring-black/5 dark:border-white/10 dark:ring-white/5">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-brand-200">
                Example
              </p>
              <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                <div className="flex items-center justify-between text-xs text-slate-200">
                  <span>Team: Platform</span>
                  <span>Sync ready</span>
                </div>
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                    <span className="flex items-center gap-2">
                      <span
                        className="inline-block h-2 w-2 rounded-full bg-emerald-400"
                        aria-hidden="true"
                      />
                      Improve ticket queue UX
                    </span>
                    <span className="rounded-full bg-brand-500/30 px-2 py-0.5 text-xs font-semibold text-brand-100">
                      5 pts
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                    <span className="flex items-center gap-2">
                      <span
                        className="inline-block h-2 w-2 rounded-full bg-amber-400"
                        aria-hidden="true"
                      />
                      Structured voting defaults
                    </span>
                    <span className="rounded-full bg-brand-500/30 px-2 py-0.5 text-xs font-semibold text-brand-100">
                      3 pts
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                    <span className="flex items-center gap-2">
                      <span
                        className="inline-block h-2 w-2 rounded-full bg-sky-400"
                        aria-hidden="true"
                      />
                      WS resilience checks
                    </span>
                    <span className="rounded-full bg-brand-500/30 px-2 py-0.5 text-xs font-semibold text-brand-100">
                      8 pts
                    </span>
                  </div>
                </div>
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
              Built for fast, focused teams
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {featureCards.map(({ title, description, icon: Icon }) => (
              <SurfaceCard key={title} className="h-full text-left">
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100 dark:bg-brand-500/10 dark:text-brand-200 dark:ring-brand-300/30">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {title}
                </h3>
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
              Bring Linear issues into every reveal
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
          <div className="text-left">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-brand-600">
              Security for Linear
            </p>
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
              Room-scoped OAuth with encrypted storage
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              We follow the same secure patterns as our Jira flow: signed OAuth
              state, session validation, least-privilege scopes, and encrypted
              room-side tokens that can be revoked at any time.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {securityHighlights.map(({ title, detail, icon: Icon, cta }) => (
              <SurfaceCard key={title} className="h-full text-left">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100 dark:bg-brand-500/10 dark:text-brand-200 dark:ring-brand-300/30">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                    {title}
                  </h3>
                </div>
                <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                  {detail}
                </p>
                {cta ? (
                  <button
                    type="button"
                    className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-brand-700 transition hover:translate-x-1 dark:text-brand-200"
                    onClick={() => handleNavigate(cta.screen)}
                  >
                    {cta.label}
                    <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                ) : null}
              </SurfaceCard>
            ))}
          </div>
        </section>

        <SurfaceCard className="text-left">
          <div className="grid gap-4 md:grid-cols-[1.5fr_auto] md:items-center">
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-brand-600">
                Ready to connect Linear?
              </p>
              <h3 className="text-2xl font-semibold text-slate-900 dark:text-white">
                Start a {SITE_NAME} room with your Linear backlog
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Keep estimates flowing to your roadmap with zero context
                switching.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 md:justify-end">
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-indigo-500 px-5 py-3 text-sm font-semibold text-white shadow-floating transition hover:from-brand-600 hover:to-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                onClick={startCreateFlow}
              >
                Start a room
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200/70 bg-white px-5 py-3 text-sm font-semibold text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:text-brand-700 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:border-brand-300/60"
                onClick={startJoinFlow}
              >
                Join with code
              </button>
            </div>
          </div>
        </SurfaceCard>

        <Footer priorityLinksOnly={false} />
      </motion.div>
    </PageSection>
  );
};

export default LinearIntegrationScreen;
