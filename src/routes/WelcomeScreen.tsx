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
        className="space-y-14"
      >
        <div className="flex justify-center">
          <Logo size="lg" />
        </div>
        <div className="space-y-6">
          <div className="space-y-4">
            <h1 className="text-4xl font-semibold leading-tight text-slate-900 dark:text-white sm:text-5xl lg:text-6xl">
              Effortless team estimations in a beautiful shared space.
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-300">
              Plan sprints faster with real-time story point voting, instant
              consensus insights, and lightweight collaboration. No sign-ups, no
              distractions.
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Button
            onClick={onCreateRoom}
            icon={<Plus className="h-4 w-4" />}
            size="lg"
          >
            Create a room
          </Button>
          <Button
            variant="secondary"
            onClick={onJoinRoom}
            icon={<Users className="h-4 w-4" />}
            size="lg"
          >
            Join a session
          </Button>
        </div>

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
