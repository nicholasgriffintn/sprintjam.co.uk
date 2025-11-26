import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Sparkles,
  Trophy,
  GitBranch,
  ShieldCheck,
  Settings,
} from 'lucide-react';

import { PageBackground } from '@/components/layout/PageBackground';
import { Button } from '@/components/ui/Button';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { FixitRunSelector } from '@/components/fixits/FixitRunSelector';
import { FixitLeaderboardCard } from '@/components/fixits/FixitLeaderboardCard';
import { FixitEventFeed } from '@/components/fixits/FixitEventFeed';
import { FixitRunSummary } from '@/components/fixits/FixitRunSummary';
import { useFixitRuns } from '@/hooks/useFixitRuns';
import { useFixitEvents } from '@/hooks/useFixitEvents';
import { useFixitWebSocket } from '@/hooks/useFixitWebSocket';
import { useSession } from '@/context/SessionContext';
import { Footer } from '@/components/layout/Footer';
import { usePageMeta } from '@/hooks/usePageMeta';
import { META_CONFIGS } from '@/config/meta';
import type { FixitEvent } from '@/lib/fixits-service';
import { Logo } from '../components/Logo';

const fixitSteps = [
  {
    icon: <Sparkles className="h-5 w-5" />,
    title: 'Label Fixit Work',
    description:
      'Tag GitHub issues and pull requests with your fixit label (e.g., `fixit`) along with severity/story point labels.',
  },
  {
    icon: <GitBranch className="h-5 w-5" />,
    title: 'Connect via Webhook',
    description:
      'Use the provided GitHub Action/Webhook to send events to `/api/github/webhook` with your secret + fixit ID.',
  },
  {
    icon: <Trophy className="h-5 w-5" />,
    title: 'Watch the Leaderboard',
    description:
      'Merged PRs, closed bugs, and labeled tickets award points instantly—celebrate wins during your fixit run.',
  },
  {
    icon: <ShieldCheck className="h-5 w-5" />,
    title: 'Moderated Access',
    description:
      'Only SprintJam moderators can change the active run inside rooms, keeping competitions fair and scoped.',
  },
];

const FixitsScreen = () => {
  const { goHome, startFixitsAdminFlow } = useSession();
  const { runs, status, error } = useFixitRuns({ includeInactive: true });
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const {
    events,
    status: eventsStatus,
    setEvents,
  } = useFixitEvents(selectedRunId);
  const selectedRun = useMemo(
    () => runs.find((run) => run.fixitId === selectedRunId) ?? null,
    [runs, selectedRunId]
  );

  usePageMeta(META_CONFIGS.fixits);

  useEffect(() => {
    if (!selectedRunId && runs.length > 0) {
      const activeRun = runs.find((run) => run.isActive) ?? runs[0];
      setSelectedRunId(activeRun.fixitId);
    }
  }, [runs, selectedRunId]);

  useFixitWebSocket(
    selectedRunId,
    (message) => {
      if (!message || typeof message !== 'object') return;
      if ('type' in (message as any)) {
        const payload = message as {
          type: string;
          events?: FixitEvent[];
        };
        if (
          (payload.type === 'eventsUpdated' ||
            payload.type === 'eventsSnapshot') &&
          Array.isArray(payload.events)
        ) {
          setEvents(payload.events);
        }
      }
    },
    { enabled: Boolean(selectedRunId) }
  );

  return (
    <PageBackground maxWidth="xxl" variant="compact">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-12"
      >
        <div className="flex justify-center">
          <a href="/" aria-label="SprintJam home" className="hover:opacity-80">
            <Logo size="md" />
          </a>
        </div>
        <div className="space-y-6">
          <div className="space-y-4">
            <p className="text-xs uppercase tracking-[0.35em] text-brand-500">
              Fixits
            </p>
            <h1 className="text-2xl font-semibold leading-tight text-slate-900 dark:text-white sm:text-4xl lg:text-4xl">
              Track bug bashes in real time.
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-300">
              Choose a Fixit run to see its leaderboard and activity feed. When
              you need to add or edit runs, hop into the admin console.
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <div className="space-y-6">
            <SurfaceCard className="flex flex-col gap-4">
              <FixitRunSelector
                runs={runs}
                selectedRunId={selectedRunId}
                onSelect={setSelectedRunId}
                status={status}
                error={error}
              />
              <FixitRunSummary run={selectedRun} />
            </SurfaceCard>

            <SurfaceCard className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Recent events
                </h3>
                {eventsStatus === 'loading' && (
                  <span className="text-xs text-slate-500">Loading…</span>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                <FixitEventFeed events={events} />
              </div>
            </SurfaceCard>

            <Button
              variant="secondary"
              size="sm"
              onClick={startFixitsAdminFlow}
              icon={<Settings className="h-4 w-4" />}
              fullWidth
            >
              Manage runs
            </Button>
          </div>

          <div className="space-y-6">
            <SurfaceCard>
              <FixitLeaderboardCard fixitId={selectedRunId} />
            </SurfaceCard>

            <SurfaceCard className="space-y-4 text-left">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  How points work
                </h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  GitHub events earn base points with bonuses for bug labels,
                  severity tags, and story-point labels.
                </p>
              </div>
              <div className="grid gap-2">
                {fixitSteps.map((step) => (
                  <div
                    key={step.title}
                    className="flex gap-3 rounded-2xl border border-white/40 bg-white/70 px-3 py-2 text-sm shadow-sm dark:border-white/10 dark:bg-white/5"
                  >
                    <div className="h-8 w-8 rounded-2xl bg-brand-500/10 text-brand-600 dark:bg-brand-400/10 dark:text-brand-100 flex items-center justify-center">
                      {step.icon}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {step.title}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {step.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-1 rounded-2xl border border-white/40 bg-white/70 px-3 py-3 text-sm shadow-sm dark:border-white/10 dark:bg-white/5">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                  GitHub checklist
                </h4>
                <ol className="list-decimal space-y-1 pl-4 text-xs text-slate-500 dark:text-slate-400">
                  <li>
                    Webhook to <code>/api/github/webhook</code>
                  </li>
                  <li>
                    Send <code>X-Fixit-Id</code> header
                  </li>
                  <li>
                    Sign payloads with <code>GITHUB_WEBHOOK_SECRET</code>
                  </li>
                  <li>
                    Label fixes (<code>fixit</code>, <code>severity:high</code>,{' '}
                    <code>sp-3</code>)
                  </li>
                </ol>
              </div>
            </SurfaceCard>
          </div>
        </div>
      </motion.div>
      <Footer displayRepoLink={false} fullWidth={false} />
    </PageBackground>
  );
};

export default FixitsScreen;
