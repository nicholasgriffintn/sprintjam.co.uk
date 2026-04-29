import { motion } from "framer-motion";

import { StandupJoinForm } from "@/components/standup/StandupJoinForm";
import { PageSection } from "@/components/layout/PageBackground";
import { Footer } from "@/components/layout/Footer";
import { createMeta } from "@/utils/route-meta";

export const meta = createMeta("standupJoin");

export default function StandupJoinRoute() {
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
            Enter the key shared by your facilitator and check in.
          </p>
        </div>
        <StandupJoinForm />
        <p className="text-center text-sm text-slate-500 dark:text-slate-400">
          Need the key? Ask your facilitator to share the standup link.
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
