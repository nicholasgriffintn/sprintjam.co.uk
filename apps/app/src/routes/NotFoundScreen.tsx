import { motion } from "framer-motion";

import { PageSection } from "@/components/layout/PageBackground";
import { Footer } from "@/components/layout/Footer";
import { usePageMeta } from "@/hooks/usePageMeta";
import { META_CONFIGS } from "@/config/meta";

const NotFoundScreen = () => {
  usePageMeta(META_CONFIGS.notFound);

  return (
    <PageSection maxWidth="xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-14"
      >
        <div className="space-y-6">
          <div className="space-y-4">
            <h1 className="text-4xl font-semibold leading-tight text-slate-900 dark:text-white sm:text-5xl lg:text-6xl">
              Page Not Found
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-300">
              The page you are looking for does not exist or has been moved.
            </p>
          </div>
        </div>
        <Footer fullWidth={false} />
      </motion.div>
    </PageSection>
  );
};

export default NotFoundScreen;
