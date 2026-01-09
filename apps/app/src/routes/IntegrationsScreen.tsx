import { motion } from 'framer-motion';
import {
  ArrowUpRight,
  GitBranch,
  LayoutTemplate,
  ShieldCheck,
  Sparkles,
  Workflow,
} from 'lucide-react';

import { useSessionActions, type AppScreen } from '@/context/SessionContext';
import { Footer } from '@/components/layout/Footer';
import { Logo } from '@/components/Logo';
import { PageBackground } from '@/components/layout/PageBackground';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { META_CONFIGS } from '@/config/meta';
import { usePageMeta } from '@/hooks/usePageMeta';
import { navigateTo } from '@/utils/navigation';

const providers = [
  {
    name: 'Jira',
    description:
      'Import issues, estimate together, and sync story points back to Jira when you lock consensus.',
    screen: 'integrationsJira',
    badge: 'Atlassian friendly',
  },
  {
    name: 'Linear',
    description:
      'Connect Linear to pull issues, capture estimates, and keep your roadmap aligned without copy-paste.',
    screen: 'integrationsLinear',
    badge: 'Fast and focused',
  },
  {
    name: 'GitHub',
    description:
      'Estimate GitHub issues with the team and keep repos in sync with story points and decisions.',
    screen: 'integrationsGithub',
    badge: 'Built for OSS and teams',
  },
];

const highlights = [
  {
    title: 'Per-room OAuth',
    description:
      'Moderators connect providers only for the room they host; tokens stay scoped.',
    icon: ShieldCheck,
  },
  {
    title: 'Two-way context',
    description:
      'Bring titles, labels, and status in; send estimates back so your backlog reflects reality.',
    icon: Workflow,
  },
  {
    title: 'Team-ready defaults',
    description:
      'Structured voting, passcodes, and The Judge help keep distributed sessions on track.',
    icon: Sparkles,
  },
  {
    title: 'No vendor lock-in',
    description:
      'SprintJam is Apache 2.0 licensed - self host and connect your own providers.',
    icon: GitBranch,
  },
  {
    title: 'Quick start',
    description:
      'Spin up a room, pick a provider, and invite the team with one shareable link.',
    icon: LayoutTemplate,
  },
];

const IntegrationsScreen = () => {
  usePageMeta(META_CONFIGS.integrations);
  const { goHome, startCreateFlow, startJoinFlow, setScreen } =
    useSessionActions();

  const handleNavigate = (screen: AppScreen) => {
    setScreen(screen);
    navigateTo(screen);
  };

  return (
    <PageBackground variant="compact" maxWidth="xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="space-y-14 lg:space-y-16"
      >
        <div className="flex justify-center">
          <button
            type="button"
            aria-label="SprintJam home"
            className="hover:opacity-80"
            onClick={goHome}
          >
            <Logo size="lg" />
          </button>
        </div>

        <div className="space-y-10">
          <div className="space-y-3 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-600">
              Integrations
            </p>
            <h1 className="text-4xl font-semibold leading-tight text-slate-900 dark:text-white sm:text-5xl lg:text-6xl">
              Bring your backlog into every SprintJam session
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-300">
              Connect Jira, Linear, or GitHub per room. Keep estimates in sync,
              avoid duplicate work, and stay privacy-first.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {providers.map(({ name, description, screen, badge }) => (
              <SurfaceCard key={name} className="h-full text-left">
                <div className="mb-3 inline-flex items-center rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 ring-1 ring-brand-100 dark:bg-brand-500/10 dark:text-brand-200 dark:ring-brand-300/30">
                  {badge}
                </div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                  {name} integration
                </h2>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  {description}
                </p>
                <div className="mt-6">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700 transition hover:translate-x-1 dark:text-brand-200"
                    onClick={() => handleNavigate(screen as AppScreen)}
                  >
                    Explore {name}
                    <ArrowUpRight className="h-4 w-4" />
                  </button>
                </div>
              </SurfaceCard>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="text-left">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-brand-600">
              Why teams connect
            </p>
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
              Built to keep estimation in sync
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {highlights.map(({ title, description, icon: Icon }) => (
              <SurfaceCard key={title} className="h-full text-left">
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100 dark:bg-brand-500/10 dark:text-brand-200 dark:ring-brand-300/30">
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
        </div>

        <SurfaceCard variant="subtle" className="space-y-4 text-left">
          <div className="space-y-1">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-brand-600">
              Start with a provider
            </p>
            <h3 className="text-2xl font-semibold text-slate-900 dark:text-white">
              Create a room and link the tools your team uses
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Moderate the session, reveal together, and keep your source of
              truth updated automatically.
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
    </PageBackground>
  );
};

export default IntegrationsScreen;
