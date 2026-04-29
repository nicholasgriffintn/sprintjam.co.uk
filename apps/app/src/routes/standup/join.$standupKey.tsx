import { motion } from "framer-motion";
import { useParams } from "react-router";

import { StandupJoinForm } from "@/components/standup/StandupJoinForm";
import { PageSection } from "@/components/layout/PageBackground";
import { Footer } from "@/components/layout/Footer";
import { createMeta } from "@/utils/route-meta";

export const meta = createMeta("standupJoin");

export default function StandupJoinKeyRoute() {
  const { standupKey } = useParams<{ standupKey: string }>();

  return (
    <PageSection align="start" maxWidth="sm">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="space-y-6"
      >
        <div className="space-y-3 text-left">
          <h1 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">
            Join standup
          </h1>
          <p className="text-base text-slate-600 dark:text-slate-300">
            Check in to the session your facilitator has set up.
          </p>
        </div>
        <StandupJoinForm initialStandupKey={standupKey} />
        <p className="text-center text-sm text-slate-500 dark:text-slate-400">
          Need help? Ask your facilitator to share the standup link again.
        </p>
      </motion.div>
      <Footer
        displayRepoLink={false}
        fullWidth={false}
        priorityLinksOnly={true}
      />
    </PageSection>
  );
}
