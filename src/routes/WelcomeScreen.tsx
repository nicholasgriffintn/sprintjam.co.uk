import type { FC } from 'react';
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
} from 'lucide-react';

import { PageBackground } from '../components/layout/PageBackground';
import { Button } from '../components/ui/Button';
import { SurfaceCard } from '../components/ui/SurfaceCard';
import { Logo } from '../components/Logo';

interface WelcomeScreenProps {
  onCreateRoom: () => void;
  onJoinRoom: () => void;
}

const WelcomeScreen: FC<WelcomeScreenProps> = ({
  onCreateRoom,
  onJoinRoom,
}) => {
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
              consensus insights, and lightweight collaboration. No sign-ups, no
              distractions.
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4">
          <Button
            onClick={onCreateRoom}
            icon={<Plus className="h-4 w-4" />}
            size="lg"
            className="w-full sm:w-auto"
          >
            Create a room
          </Button>
          <Button
            variant="secondary"
            onClick={onJoinRoom}
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
          <div className="rounded-[2.5rem] border border-white/10 bg-white/5 shadow-[0_40px_160px_rgba(8,10,24,0.65)] backdrop-blur-[14px] dark:border-white/5 dark:bg-slate-900/40">
            <div className="relative overflow-hidden rounded-[2rem] border border-white/5 bg-gradient-to-b from-white/10 via-white/5 to-white/0 dark:from-white/10 dark:via-white/5">
              <button
                type="button"
                aria-label="Play SprintJam demo video"
                onClick={() => alert('Video demo coming soon')}
                className="group relative block w-full overflow-hidden rounded-[1.75rem] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-400"
              >
                <img
                  src="/images/screenshot.png"
                  alt="SprintJam collaborative room preview"
                  className="block h-[220px] w-full origin-bottom transform-gpu rounded-[1.75rem] border border-white/10 object-cover object-top shadow-[0_40px_120px_-30px_rgba(0,0,0,0.45)] transition duration-700 group-hover:scale-[1.015] sm:h-[360px] sm:scale-[1.01] sm:rotate-[0.6deg]"
                  style={{
                    maskImage:
                      'linear-gradient(180deg, rgba(0,0,0,1) 94%, rgba(0,0,0,0))',
                    WebkitMaskImage:
                      'linear-gradient(180deg, rgba(0,0,0,1) 94%, rgba(0,0,0,0))',
                  }}
                  loading="lazy"
                />
                <div
                  className="pointer-events-none absolute inset-0 rounded-[1.75rem]"
                  style={{
                    background:
                      'radial-gradient(circle at 50% 40%, rgba(0,0,0,0) 60%, rgba(2,6,23,0.5) 95%)',
                    mixBlendMode: 'multiply',
                  }}
                />
                <div className="pointer-events-none absolute inset-0 rounded-[1.75rem] bg-gradient-to-b from-white/15 via-white/5 to-transparent opacity-30 mix-blend-screen" />
                <div className="pointer-events-none absolute inset-0 rounded-[1.75rem] bg-gradient-to-b from-slate-900/10 via-slate-900/40 to-slate-900/70 opacity-80 transition duration-500 group-hover:opacity-100 dark:from-black/0 dark:via-black/40 dark:to-black/70" />
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-4 text-white">
                  <div className="rounded-full border border-white/30 bg-white/15 p-4 text-white shadow-lg shadow-black/40 backdrop-blur transition duration-300 group-hover:scale-110">
                    <Play className="h-5 w-5" />
                  </div>
                </div>
                <div className="pointer-events-none absolute inset-x-6 bottom-6 flex items-center justify-between rounded-[1.6rem] border border-white/20 bg-slate-900/60 px-5 py-3 text-xs font-medium uppercase tracking-[0.3em] text-white/60 shadow-[0_15px_25px_rgba(6,9,20,0.35)] backdrop-blur-lg group-hover:border-white/40 group-hover:bg-slate-900/70">
                  <span>Live demo preview</span>
                  <span>00:42</span>
                </div>
              </button>
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
        </div>

        <SurfaceCard variant="subtle" className="mx-auto max-w-2xl text-sm">
          <div className="flex flex-col items-center justify-between gap-4 text-slate-600 dark:text-slate-300 sm:flex-row sm:text-base">
            <div className="flex flex-col gap-1 text-center sm:text-left">
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Fully transparent
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
    </PageBackground>
  );
};

export default WelcomeScreen; 
