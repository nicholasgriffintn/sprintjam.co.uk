import { motion } from "framer-motion";
import { Briefcase, Plus, Shield, Sunrise, Users, Zap } from "lucide-react";

import { useAppNavigation } from "@/hooks/useAppNavigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { PageSection } from "@/components/layout/PageBackground";
import { Footer } from "@/components/layout/Footer";
import { createMeta } from "./meta";

export const meta = createMeta("standup");

const features = [
  {
    icon: <Zap className="h-5 w-5" />,
    title: "Fresh each day",
    description:
      "Single-use rooms with a new join link every session. Nothing carries over.",
  },
  {
    icon: <Shield className="h-5 w-5" />,
    title: "Private by default",
    description:
      "Response content is visible to the moderator only. Participants see summaries, not each other's updates.",
  },
  {
    icon: <Briefcase className="h-5 w-5" />,
    title: "Workspace-aware",
    description:
      "Link Jira, Linear, or GitHub issues to your update and open them directly during the live walkthrough.",
  },
] as const;

export default function StandupRoute() {
  const navigateTo = useAppNavigation();

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
              variant="violet"
              className="rounded-full px-3 py-1 text-[11px] tracking-[0.25em] uppercase"
            >
              <Sunrise className="mr-1 h-3.5 w-3.5" />
              Standup facilitation
            </Badge>
            <h1 className="text-3xl font-semibold leading-tight text-slate-900 dark:text-white sm:text-5xl lg:text-6xl">
              Daily standups for distributed teams
            </h1>
            <p className="mx-auto max-w-[60ch] text-base text-slate-600 dark:text-slate-300 sm:text-lg">
              Collect updates async before the meeting, then walk through them
              live with full facilitator controls. No account required.
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4">
          <Button
            data-testid="create-standup-button"
            icon={<Plus className="h-4 w-4" />}
            size="lg"
            className="w-full sm:w-auto"
            onClick={() => navigateTo("standupCreate")}
          >
            Create a standup
          </Button>
          <Button
            variant="secondary"
            data-testid="join-standup-button"
            icon={<Users className="h-4 w-4" />}
            size="lg"
            className="w-full sm:w-auto"
            onClick={() => navigateTo("standupJoin")}
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
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-400/20 to-purple-500/20 text-violet-600">
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
      <Footer
        displayRepoLink={false}
        fullWidth={false}
        priorityLinksOnly={false}
      />
    </PageSection>
  );
}
