import { useRef, useState } from "react";
import { motion } from "framer-motion";
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
  CircleDashed,
  MessageSquare,
  Sparkles,
} from "lucide-react";

import { useSessionActions } from "@/context/SessionContext";
import { PageSection } from "@/components/layout/PageBackground";
import { Button } from "@/components/ui/Button";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { Footer } from "@/components/layout/Footer";
import { BetaBadge } from "@/components/BetaBadge";
import { usePageMeta } from "@/hooks/usePageMeta";
import { META_CONFIGS } from "@/config/meta";
import { navigateTo, type AppScreen } from "@/config/routes";
import { SITE_NAME } from "@/constants";

const pokerFeatures = [
  {
    icon: <Zap className="w-4 h-4" />,
    title: "Real-time Voting",
    description: "Live story point voting with presence and instant reveals",
  },
  {
    icon: <BarChart3 className="w-4 h-4" />,
    title: "Smart Consensus",
    description: "Calculates median, spread, and outliers to guide agreement",
  },
  {
    icon: <Shield className="w-4 h-4" />,
    title: "Privacy First",
    description: "Room-scoped storage, no ads, no tracking, open source",
  },
  {
    icon: <Timer className="w-4 h-4" />,
    title: "Voting Options",
    description: "Classic planning poker plus structured scoring options",
  },
];

const sprintFlow = [
  {
    icon: <CircleDashed className="w-5 h-5" />,
    title: "Choose a facilitator",
    description:
      "Choose facilitators for your sessions or make quick decisions by spinning a wheel of names.",
    actionLabel: "Spin the wheel",
    testId: "homepage-flow-wheel",
    action: "wheel" as const,
    beta: true,
  },
  {
    icon: <Timer className="w-5 h-5" />,
    title: "Plan and estimate",
    description:
      "Kick off sprint planning with poker estimation, consensus support, and ticket queue controls.",
    actionLabel: "Start planning poker",
    testId: "homepage-flow-planning",
    action: "create" as const,
    beta: false,
  },
  {
    icon: <MessageSquare className="w-5 h-5" />,
    title: "Collaborate asynchronously",
    description:
      "Close the loop with a focused daily check-in flow that supports async prep and live facilitation.",
    actionLabel: "Run a standup",
    testId: "homepage-flow-standup",
    action: "standup" as const,
    beta: true,
  },
];

const WelcomeScreen = () => {
  const [isDemoPlaying, setIsDemoPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const { startCreateFlow, startJoinFlow, setScreen } = useSessionActions();

  const handleNavigate = (screen: AppScreen) => {
    setScreen(screen);
    navigateTo(screen);
  };

  const handleSprintFlowAction = (
    action: (typeof sprintFlow)[number]["action"],
  ) => {
    if (action === "create") {
      startCreateFlow();
      return;
    }
    handleNavigate(action);
  };

  usePageMeta(META_CONFIGS.welcome);

  return (
    <PageSection maxWidth="xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-10 sm:space-y-14"
      >
        <div className="space-y-6">
          <div className="space-y-4">
            <h1 className="text-3xl font-semibold leading-tight text-slate-900 dark:text-white sm:text-5xl lg:text-6xl">
              Fast, real-time planning poker for distributed teams
            </h1>
            <p className="mx-auto max-w-[60ch] text-base text-slate-600 dark:text-slate-300 sm:text-lg">
              Estimate stories in minutes with live voting and smart consensus
              insights, pick a facilitator, run your stand-up. All from one
              workspace, no sign-ups required.
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4">
          <Button
            data-testid="create-room-button"
            onClick={() => startCreateFlow()}
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
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          viewport={{ once: true, amount: 0.2 }}
          className="space-y-6"
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[1.6fr_1fr]">
            <SurfaceCard className="flex flex-col gap-5 text-left">
              <div className="space-y-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500/15 to-indigo-500/20 text-brand-600">
                  {sprintFlow[1].icon}
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {sprintFlow[1].title}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {sprintFlow[1].description}
                </p>
              </div>
              <div className="overflow-hidden rounded-xl border border-slate-200/60 dark:border-white/10">
                {isDemoPlaying ? (
                  <video
                    ref={videoRef}
                    src="https://assets.nickgriffin.uk/sprintjam-demo.mp4"
                    className="block h-[250px] w-full rounded-xl object-cover object-top"
                    controls
                    autoPlay
                    playsInline
                    poster="/images/screenshot.png"
                  >
                    Your browser does not support the video tag.
                  </video>
                ) : (
                  <Button
                    type="button"
                    variant="unstyled"
                    aria-label={`Play the ${SITE_NAME} demo video`}
                    onClick={() => setIsDemoPlaying(true)}
                    className="group relative block w-full overflow-hidden rounded-xl focus-visible:ring-brand-400 focus-visible:ring-offset-4"
                  >
                    <img
                      src="/images/screenshot.png"
                      alt={`${SITE_NAME} collaborative room preview`}
                      className="block h-[250px] w-full origin-bottom transform-gpu rounded-xl object-cover object-top transition duration-700 group-hover:scale-[1.015]"
                      style={{
                        maskImage:
                          "linear-gradient(180deg, rgba(0,0,0,1) 80%, rgba(0,0,0,0))",
                        WebkitMaskImage:
                          "linear-gradient(180deg, rgba(0,0,0,1) 80%, rgba(0,0,0,0))",
                      }}
                      loading="lazy"
                    />
                    <div className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-b from-slate-900/10 via-slate-900/30 to-slate-900/60 opacity-70 transition duration-500 group-hover:opacity-90 dark:from-black/0 dark:via-black/30 dark:to-black/60" />
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <div className="rounded-full border border-white/30 bg-white/15 p-3 text-white shadow-lg shadow-black/40 backdrop-blur transition duration-300 group-hover:scale-110">
                        <Play className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="pointer-events-none absolute inset-x-4 bottom-4 flex items-center justify-between rounded-2xl border border-white/20 bg-slate-900/60 px-4 py-2 text-xs font-medium uppercase tracking-[0.3em] text-white/60 backdrop-blur-lg group-hover:border-white/40 group-hover:bg-slate-900/70">
                      <span>Quick demo</span>
                      <span>01:09</span>
                    </div>
                  </Button>
                )}
              </div>
            </SurfaceCard>

            <div className="grid grid-cols-2 grid-rows-2 gap-4 h-full">
              {pokerFeatures.map((feature) => (
                <SurfaceCard key={feature.title} className="h-full text-left">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500/15 to-indigo-500/20 text-brand-600">
                    {feature.icon}
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                    {feature.title}
                  </h3>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    {feature.description}
                  </p>
                </SurfaceCard>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/70 bg-white/80 p-5 text-left dark:border-white/10 dark:bg-slate-900/40">
              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400/20 to-pink-500/20 text-orange-500">
                  {sprintFlow[0].icon}
                </div>
                <BetaBadge />
              </div>
              <div className="flex-1 space-y-2">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  {sprintFlow[0].title}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {sprintFlow[0].description}
                </p>
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700 transition hover:translate-x-1 dark:text-brand-200"
                onClick={() => handleSprintFlowAction(sprintFlow[0].action)}
                data-testid={sprintFlow[0].testId}
              >
                {sprintFlow[0].actionLabel}
                <ArrowUpRight className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/70 bg-white/80 p-5 text-left dark:border-white/10 dark:bg-slate-900/40">
              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-400/20 to-purple-500/20 text-violet-600">
                  {sprintFlow[2].icon}
                </div>
                <BetaBadge />
              </div>
              <div className="flex-1 space-y-2">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  {sprintFlow[2].title}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {sprintFlow[2].description}
                </p>
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700 transition hover:translate-x-1 dark:text-brand-200"
                onClick={() => handleSprintFlowAction(sprintFlow[2].action)}
                data-testid={sprintFlow[2].testId}
              >
                {sprintFlow[2].actionLabel}
                <ArrowUpRight className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-col gap-4 rounded-2xl border border-dashed border-slate-300/60 bg-white/40 p-5 text-left dark:border-white/10 dark:bg-slate-900/20">
              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-500/10 to-slate-500/15 text-slate-400 dark:text-slate-500">
                  <Sparkles className="h-5 w-5" />
                </div>
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                  Coming soon
                </span>
              </div>
              <div className="flex-1 space-y-2">
                <h3 className="text-base font-semibold text-slate-400 dark:text-slate-500">
                  More to come
                </h3>
                <p className="text-sm text-slate-400 dark:text-slate-600">
                  We&apos;re building more tools to enhance your sprint rituals.
                  Stay tuned.
                </p>
              </div>
            </div>
          </div>
          <SurfaceCard className="text-left">
            <div className="flex flex-col gap-6 md:flex-row md:items-center">
              <div className="flex-1 space-y-3 md:pr-4">
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400/20 to-teal-500/20 text-emerald-600">
                  <GitBranch className="h-4 w-4" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                  Bring your backlog into the room
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Set up integrations once in your workspace team settings and
                  every room created under that team inherits the connection
                  automatically.
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Pull titles, labels, and status into {SITE_NAME} while keeping
                  access managed at the team level so admins stay in control.
                </p>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700 transition hover:translate-x-1 dark:text-brand-200"
                  onClick={() => handleNavigate("integrations")}
                >
                  Explore integrations
                  <ArrowUpRight className="h-4 w-4" />
                </button>
              </div>
              <div className="relative flex-1 md:max-w-sm">
                <div className="rounded-xl border border-slate-300/60 bg-slate-900 p-3 text-white shadow-lg ring-1 ring-black/5 dark:border-white/10 dark:bg-black/30 dark:shadow-none dark:ring-white/5">
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
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:border-brand-200 hover:text-brand-600 dark:border-white/20 dark:bg-transparent dark:text-white dark:shadow-none dark:hover:border-brand-300/60 dark:hover:text-brand-200"
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
    </PageSection>
  );
};

export default WelcomeScreen;
