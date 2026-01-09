import { motion } from 'framer-motion';
import {
  ArrowUpRight,
  BadgeCheck,
  Database,
  Lock,
  RefreshCcw,
  RefreshCw,
  Table2,
  Upload,
} from 'lucide-react';

import { Footer } from '@/components/layout/Footer';
import { Logo } from '@/components/Logo';
import { PageBackground } from '@/components/layout/PageBackground';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { META_CONFIGS } from '@/config/meta';
import { usePageMeta } from '@/hooks/usePageMeta';

const featureCards = [
  {
    title: 'One-click import',
    description:
      'Pull Jira issues straight into your SprintJam room without CSVs or copy-paste.',
    icon: Upload,
  },
  {
    title: 'Auto sync back',
    description:
      'Lock a consensus and push story points to Jira so the board stays current.',
    icon: RefreshCw,
  },
  {
    title: 'Project and sprint filters',
    description:
      'Target the right backlog by filtering projects, boards, or sprints before importing.',
    icon: Table2,
  },
  {
    title: 'Secure OAuth',
    description:
      'Room-scoped OAuth keeps access limited to what the moderator connects.',
    icon: Lock,
  },
];

const steps = [
  {
    title: 'Connect Jira',
    detail: 'Use OAuth 2.0 to authorize SprintJam for this room.',
  },
  {
    title: 'Pick issues',
    detail:
      'Choose issues from your projects or sprints with filters that match your workflow.',
  },
  {
    title: 'Estimate together',
    detail: 'Reveal, decide, and sync points back without leaving SprintJam.',
  },
];

const securityHighlights = [
  {
    title: 'Signed OAuth + room auth',
    detail:
      'OAuth 2.0 with Atlassian is wrapped in a signed state + nonce, and every action is gated by a valid room session token.',
    icon: BadgeCheck,
  },
  {
    title: 'Least-privilege scopes',
    detail:
      'Scopes are pinned to Jira issue/board read, sprint read, and story point writes; no broader Jira access or identity changes.',
    icon: Lock,
  },
  {
    title: 'Encrypted, room-scoped storage',
    detail:
      'Tokens never live in the browser: they are AES-GCM encrypted with a worker secret, scoped to a single room, and cleared on revoke.',
    icon: Database,
  },
  {
    title: 'Controlled egress + rotation',
    detail:
      'All calls flow through the room worker to Atlassian APIs, refreshes persist server-side, and expired/invalid tokens force a reconnect.',
    icon: RefreshCcw,
  },
  {
    title: 'User control & cleanup',
    detail:
      'Moderators can revoke at any time; we revoke at Atlassian and delete room-side tokens to keep dormant connections closed.',
    icon: BadgeCheck,
  },
  {
    title: 'Data handling & privacy',
    detail:
      'GDPR rights, retention, and contacts are documented in our Privacy Policy; integrations follow the same data handling standards.',
    icon: BadgeCheck,
    cta: {
      label: 'View Privacy Policy',
      href: '/privacy',
    },
  },
];

const JiraIntegrationScreen = () => {
  usePageMeta(META_CONFIGS.integrationsJira);

  return (
    <PageBackground variant="compact" maxWidth="xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="space-y-14 lg:space-y-16"
      >
        <div className="flex justify-center">
          <a href="/" aria-label="SprintJam home" className="hover:opacity-80">
            <Logo size="lg" />
          </a>
        </div>

        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-4 text-left">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-600">
              Jira integration
            </p>
            <h1 className="text-4xl font-semibold leading-tight text-slate-900 dark:text-white sm:text-5xl">
              Seamless Jira planning inside SprintJam
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-300">
              Import issues, keep labels and status visible, estimate with your
              team, and sync story points back when you lock the vote.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="/create"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-indigo-500 px-5 py-3 text-sm font-semibold text-white shadow-floating transition hover:from-brand-600 hover:to-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
              >
                Create a room
              </a>
              <a
                href="/integrations"
                className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700 transition hover:translate-x-1 dark:text-brand-200"
              >
                View all integrations
                <ArrowUpRight className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div className="relative">
            <div className="pointer-events-none absolute inset-[-18px] -z-10 rounded-[1.9rem] bg-gradient-to-br from-brand-500/20 via-indigo-500/18 to-blue-500/18 blur-3xl" />
            <SurfaceCard className="relative overflow-hidden text-left border-none bg-transparent p-0 shadow-none">
              <div className="relative space-y-3 rounded-2xl border border-white/15 bg-slate-900/80 p-6 text-white shadow-inner shadow-slate-200/60 dark:border-white/10">
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-brand-200">
                  Demo glimpse
                </p>
                <p className="text-lg font-semibold">SprintJam + Jira</p>
                <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                  <div className="flex items-center justify-between text-xs text-slate-200">
                    <span>Selected issues</span>
                    <span>Sync ready</span>
                  </div>
                  <div className="mt-3 space-y-2 text-sm">
                    <div className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                      <span>SPRT-142 Add Strudel music toggle</span>
                      <span className="rounded-full bg-brand-500/30 px-2 py-0.5 text-xs font-semibold text-brand-100">
                        5 pts
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                      <span>SPRT-143 Enforce passcode rules</span>
                      <span className="rounded-full bg-brand-500/30 px-2 py-0.5 text-xs font-semibold text-brand-100">
                        3 pts
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                      <span>SPRT-147 Ticket queue edge cases</span>
                      <span className="rounded-full bg-brand-500/30 px-2 py-0.5 text-xs font-semibold text-brand-100">
                        8 pts
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-slate-200">
                  Room-scoped connection. No tracking, just the fields you need to
                  estimate.
                </p>
              </div>
            </SurfaceCard>
          </div>
        </div>

        <section className="space-y-4">
          <div className="text-left">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-brand-600">
              Key capabilities
            </p>
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
              Everything you need for Jira-backed estimation
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
              Three steps from backlog to decision
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
              Security for Jira
            </p>
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
              Built to match Atlassian Forge security expectations
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              We follow Atlassian&apos;s guidance on authentication, data isolation,
              and least privilege so rooms stay locked to the people and scopes you
              approve. No Jira credentials are stored on the client; tokens are
              encrypted inside the room worker and removed when access is revoked.
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
                  <a
                    href={cta.href}
                    className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-brand-700 transition hover:translate-x-1 dark:text-brand-200"
                  >
                    {cta.label}
                    <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                  </a>
                ) : null}
              </SurfaceCard>
            ))}
          </div>
        </section>

        <SurfaceCard className="text-left">
          <div className="grid gap-4 md:grid-cols-[1.5fr_auto] md:items-center">
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-brand-600">
                Ready to connect Jira?
              </p>
              <h3 className="text-2xl font-semibold text-slate-900 dark:text-white">
                Create a SprintJam room and link your project
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Keep estimation fast, transparent, and synchronized with your
                Atlassian stack.
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
      </motion.div>
    </PageBackground>
  );
};

export default JiraIntegrationScreen;
