import { motion } from "framer-motion";
import { Briefcase, Plus, Shield, Sunrise, Users, Zap } from "lucide-react";

import { navigateTo } from "@/config/routes";
import { useSessionActions } from "@/context/SessionContext";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { PageSection } from "@/components/layout/PageBackground";

const features = [
  {
    icon: <Zap className="h-5 w-5" />,
    title: "Fresh each day",
    description: "Every standup is a single-use room with a clean join link.",
  },
  {
    icon: <Shield className="h-5 w-5" />,
    title: "Private by default",
    description:
      "Participants do not receive each other&apos;s response content over the socket.",
  },
  {
    icon: <Briefcase className="h-5 w-5" />,
    title: "Workspace-aware",
    description:
      "Team standups can link provider tickets and appear in workspace history.",
  },
] as const;

export default function StandupScreen() {
  const { setScreen } = useSessionActions();

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
            <Badge
              variant="warning"
              className="rounded-full px-3 py-1 text-[11px] tracking-[0.25em] uppercase"
            >
              <Sunrise className="mr-1 h-3.5 w-3.5" />
              Standup facilitation
            </Badge>
            <h1 className="text-3xl font-semibold leading-tight text-slate-900 dark:text-white sm:text-5xl lg:text-6xl">
              Collaborative daily standup rooms for distributed teams
            </h1>
            <p className="text-base text-slate-600 dark:text-slate-300 sm:text-lg">
              Run check-ins asynchronously or live, keep updates focused, and
              move smoothly from written prep into facilitator-led presentation.
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4">
          <Button
            data-testid="create-standup-button"
            icon={<Plus className="h-4 w-4" />}
            size="lg"
            className="w-full sm:w-auto"
            onClick={() => {
              setScreen("standupCreate");
              navigateTo("standupCreate");
            }}
          >
            Create a standup
          </Button>
          <Button
            variant="secondary"
            data-testid="join-standup-button"
            icon={<Users className="h-4 w-4" />}
            size="lg"
            className="w-full sm:w-auto"
            onClick={() => {
              setScreen("standupJoin");
              navigateTo("standupJoin");
            }}
          >
            Join a session
          </Button>
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-1 lg:grid-cols-3">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 + index * 0.05 }}
            >
              <SurfaceCard className="h-full text-left">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500/15 to-sky-500/20 text-brand-600">
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
      </motion.div>
    </PageSection>
  );
}
