import { motion } from "framer-motion";
import { Columns3 } from "lucide-react";
import { Link } from "react-router";

import { BetaBadge } from "@/components/BetaBadge";
import { Footer } from "@/components/layout/Footer";
import { PageSection } from "@/components/layout/PageBackground";
import { RetroTemplateGrid } from "@/components/retro/RetroTemplateGrid";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { SITE_NAME } from "@/constants";
import { createMeta } from "@/utils/route-meta";

export const meta = createMeta("retroTemplates");

export default function RetroTemplatesRoute() {
  return (
    <PageSection maxWidth="xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="space-y-10 lg:space-y-12"
      >
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div className="space-y-4 text-left">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-600">
                Retro templates
              </p>
              <BetaBadge />
            </div>
            <h1 className="text-4xl font-semibold leading-tight text-slate-900 dark:text-white sm:text-5xl">
              Choose the right board for the conversation
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-300">
              {SITE_NAME} retros use the same template catalogue in marketing,
              room creation, and workspace defaults.
            </p>
          </div>
        </div>

        <RetroTemplateGrid />

        <SurfaceCard className="text-left">
          <div className="grid gap-4 md:grid-cols-[1.5fr_auto] md:items-center">
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-brand-600">
                Ready for the next retro?
              </p>
              <h3 className="text-2xl font-semibold text-slate-900 dark:text-white">
                Open a room and invite the team
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Team defaults come from workspace settings, so every retro
                starts with the right structure.
              </p>
            </div>
            <Link
              to="/retro/create"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-indigo-500 px-5 py-3 text-sm font-semibold text-white shadow-floating transition hover:from-brand-600 hover:to-indigo-600"
            >
              Create retro
              <Columns3 className="h-4 w-4" />
            </Link>
          </div>
        </SurfaceCard>

        <Footer priorityLinksOnly={false} />
      </motion.div>
    </PageSection>
  );
}
