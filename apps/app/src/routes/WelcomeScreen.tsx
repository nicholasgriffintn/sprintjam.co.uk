import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Plus,
  Github,
  Zap,
  Shield,
  Timer,
  BarChart3,
  Play,
  GitBranch,
  ArrowUpRight,
} from 'lucide-react';

import { useSessionActions } from '@/context/SessionContext';
import { PageBackground } from '@/components/layout/PageBackground';
import { Button } from '@/components/ui/Button';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { Logo } from '@/components/Logo';
import { Footer } from '@/components/layout/Footer';
import { usePageMeta } from '@/hooks/usePageMeta';
import { META_CONFIGS } from '@/config/meta';

const WelcomeScreen = () => {
  const [isDemoPlaying, setIsDemoPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const { startCreateFlow, startJoinFlow } = useSessionActions();
  usePageMeta(META_CONFIGS.welcome);
  const features = [
    {
      icon: <Zap className="w-5 h-5" />,
      title: 'Real-time Voting',
      description: 'Live collaboration with instant updates',
    },
    {
      icon: <BarChart3 className="w-5 h-5" />,
      title: 'Smart Consensus',
      description: 'Automated consensus detection and recommendations',
    },
    {
      icon: <Shield className="w-5 h-5" />,
      title: 'Privacy First',
      description: 'No ads, no tracking, open source',
    },
    {
      icon: <Timer className="w-5 h-5" />,
      title: 'Voting Options',
      description: 'Multi-criteria estimation systems',
    },
  ];

  return (
    <PageBackground maxWidth="xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-10 sm:space-y-14"
      >
        <div className="flex justify-center">
          <Logo size="lg" className="scale-95 sm:scale-100" />
        </div>
        <div className="space-y-6">
          <div className="space-y-4">
            <h1 className="text-3xl font-semibold leading-tight text-slate-900 dark:text-white sm:text-5xl lg:text-6xl">
              Effortless team estimations in a beautiful shared space.
            </h1>
            <p className="text-base text-slate-600 dark:text-slate-300 sm:text-lg">
              Plan sprints faster with real-time story point voting, instant
              consensus insights, and lightweight collaboration. No sign-ups
              required, no distractions.
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4">
          <Button
            data-testid="create-room-button"
            onClick={startCreateFlow}
            icon={<Plus className="h-4 w-4" />}
            size="lg"
            className="w-full sm:w-auto"
          >
            Create a room
          </Button>
          <Button
            variant="secondary"
            data-testid="join-room-button"
            onClick={startJoinFlow}
            icon={<Users className="h-4 w-4" />}
            size="lg"
            className="w-full sm:w-auto"
          >
            Join a session
          </Button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.97 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          viewport={{ once: true, amount: 0.4 }}
          className="relative mx-auto max-w-2xl px-4 sm:px-6"
        >
          <div className="pointer-events-none absolute inset-x-4 -top-10 -z-20 h-[120%] rounded-[5rem] bg-gradient-to-b from-brand-400/25 via-indigo-600/15 to-transparent opacity-70 blur-[150px] sm:inset-x-12" />
          <div className="rounded-[1.75rem] border border-white/10 bg-white/5 shadow-[0_30px_120px_rgba(8,10,24,0.55)] backdrop-blur-[14px] dark:border-white/5 dark:bg-slate-900/40">
            <div className="relative overflow-hidden rounded-[1.5rem] border border-white/8 bg-gradient-to-b from-white/10 via-white/5 to-white/0 dark:from-white/10 dark:via-white/5">
              {isDemoPlaying ? (
                <div className="relative block w-full overflow-hidden rounded-[1.25rem] focus-visible:ring-brand-400 focus-visible:ring-offset-4">
                  <video
                    ref={videoRef}
                    src="https://assets.nickgriffin.uk/sprintjam-demo.mp4"
                    className="block h-[220px] w-full origin-bottom transform-gpu rounded-[1.25rem] border border-white/10 object-cover object-top sm:h-[360px]"
                    controls
                    autoPlay
                    playsInline
                    poster="/images/screenshot.png"
                  >
                    Your browser does not support the video tag.
                  </video>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="unstyled"
                  aria-label="Play SprintJam demo video"
                  onClick={() => setIsDemoPlaying(true)}
                  className="group relative block w-full overflow-hidden rounded-[1.25rem] focus-visible:ring-brand-400 focus-visible:ring-offset-4"
                >
                  <img
                    src="/images/screenshot.png"
                    alt="SprintJam collaborative room preview"
                    className="block h-[220px] w-full origin-bottom transform-gpu rounded-[1.25rem] border border-white/10 object-cover object-top transition duration-700 group-hover:scale-[1.015] sm:h-[360px] sm:scale-[1.01]"
                    style={{
                      maskImage:
                        'linear-gradient(180deg, rgba(0,0,0,1) 94%, rgba(0,0,0,0))',
                      WebkitMaskImage:
                        'linear-gradient(180deg, rgba(0,0,0,1) 94%, rgba(0,0,0,0))',
                    }}
                    loading="lazy"
                  />
                  <div
                    className="pointer-events-none absolute inset-0 rounded-[1.25rem]"
                    style={{
                      background:
                        'radial-gradient(circle at 50% 40%, rgba(0,0,0,0) 60%, rgba(2,6,23,0.5) 95%)',
                      mixBlendMode: 'multiply',
                    }}
                  />
                  <div className="pointer-events-none absolute inset-0 rounded-[1.25rem] bg-gradient-to-b from-white/12 via-white/5 to-transparent opacity-30 mix-blend-screen" />
                  <div className="pointer-events-none absolute inset-0 rounded-[1.25rem] bg-gradient-to-b from-slate-900/10 via-slate-900/35 to-slate-900/65 opacity-80 transition duration-500 group-hover:opacity-100 dark:from-black/0 dark:via-black/35 dark:to-black/65" />
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-4 text-white">
                    <div className="rounded-full border border-white/30 bg-white/15 p-4 text-white shadow-lg shadow-black/40 backdrop-blur transition duration-300 group-hover:scale-110">
                      <Play className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="pointer-events-none absolute inset-x-6 bottom-6 flex items-center justify-between rounded-[1.6rem] border border-white/20 bg-slate-900/60 px-5 py-3 text-xs font-medium uppercase tracking-[0.3em] text-white/60 shadow-[0_15px_25px_rgba(6,9,20,0.35)] backdrop-blur-lg group-hover:border-white/40 group-hover:bg-slate-900/70">
                    <span>Quick demo</span>
                    <span>01:09</span>
                  </div>
                </Button>
              )}
              <div className="pointer-events-none absolute inset-x-12 -bottom-6 -z-10 h-8 rounded-[999px] bg-slate-900/45 blur-3xl dark:bg-black/70" />
              <div className="pointer-events-none absolute inset-x-16 -bottom-2 -z-20 h-5 rounded-[999px] bg-black/40 blur-2xl opacity-70" />
            </div>
          </div>
        </motion.div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 + index * 0.05 }}
            >
              <SurfaceCard className="h-full text-left">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500/15 to-indigo-500/20 text-brand-600">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  {feature.description}
                </p>
              </SurfaceCard>
            </motion.div>
          ))}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 + features.length * 0.05 }}
            className="sm:col-span-2 lg:col-span-4"
          >
            <SurfaceCard className="text-left">
              <div className="flex flex-col gap-6 md:flex-row md:items-center">
                <div className="flex-1 space-y-3 md:pr-4">
                  <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500/15 to-indigo-500/20 text-brand-600">
                    <GitBranch className="h-5 w-5" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                    Connect Jira, Linear, and GitHub to your rooms
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    Import issues, estimate together, and sync story points back
                    with room-scoped OAuth so your backlog stays in lockstep.
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    Pull titles, labels, and status into SprintJam while keeping
                    access scoped to the room so moderators stay in control.
                  </p>
                  <a
                    href="/integrations"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700 transition hover:translate-x-1 dark:text-brand-200"
                  >
                    Explore integrations
                    <ArrowUpRight className="h-4 w-4" />
                  </a>
                </div>
                <div className="relative flex-1 md:max-w-sm">
                  <div className="rounded-xl border border-white/10 bg-black/30 p-3">
                    <div className="flex items-center justify-between text-[11px] text-slate-200">
                      <span>Selected issues</span>
                      <span>Sync ready</span>
                    </div>
                    <div className="mt-2 space-y-2 text-xs">
                      <div className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                        <span>SPRT-142 Strudel toggle</span>
                        <span className="rounded-full bg-brand-500/30 px-2 py-0.5 font-semibold text-brand-100">
                          5 pts
                        </span>
                      </div>
                      <div className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                        <span>SPRT-143 Passcode rules</span>
                        <span className="rounded-full bg-brand-500/30 px-2 py-0.5 font-semibold text-brand-100">
                          3 pts
                        </span>
                      </div>
                      <div className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                        <span>SPRT-147 Queue edge cases</span>
                        <span className="rounded-full bg-brand-500/30 px-2 py-0.5 font-semibold text-brand-100">
                          8 pts
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </SurfaceCard>
          </motion.div>
        </div>

        <SurfaceCard variant="subtle" className="mx-auto max-w-2xl text-sm">
          <div className="flex flex-col items-center justify-between gap-4 text-slate-600 dark:text-slate-300 sm:flex-row sm:text-base">
            <div className="flex flex-col gap-1 text-center sm:text-left">
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Apache 2.0
              </span>
              <p className="font-semibold text-slate-900 dark:text-white">
                Built in the open for agile teams everywhere.
              </p>
            </div>
            <a
              href="https://github.com/nicholasgriffintn/sprintjam.co.uk"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/60 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:text-brand-600 dark:border-white/20 dark:text-white dark:hover:text-brand-200"
            >
              <Github className="h-4 w-4" />
              View source on GitHub
            </a>
          </div>
        </SurfaceCard>
      </motion.div>
      <Footer
        displayRepoLink={false}
        fullWidth={false}
        priorityLinksOnly={false}
      />
    </PageBackground>
  );
};

export default WelcomeScreen;
