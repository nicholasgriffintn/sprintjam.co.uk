import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Info } from 'lucide-react';

import { safeLocalStorage } from '../utils/storage';

const CONFIDENCE_INFO_STORAGE_KEY = 'structuredVotingConfidenceInfoSeen';

export function StructuredVotingUpdateNotification() {
  const [showConfidenceInfo, setShowConfidenceInfo] = useState(false);

  useEffect(() => {
    const hasSeen = safeLocalStorage.get(CONFIDENCE_INFO_STORAGE_KEY);
    setShowConfidenceInfo(!hasSeen);
  }, []);

  const handleDismissConfidenceInfo = () => {
    setShowConfidenceInfo(false);
    safeLocalStorage.set(CONFIDENCE_INFO_STORAGE_KEY, 'true');
  };

  return (
    <AnimatePresence>
      {showConfidenceInfo && (
        <motion.div
          key="confidence-info"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className="rounded-2xl border border-blue-200 bg-blue-50/95 p-4 text-sm text-blue-900 shadow-lg dark:border-blue-700/60 dark:bg-blue-900/40 dark:text-blue-100"
          data-testid="confidence-info-toast"
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:gap-4 md:flex-nowrap">
              <div className="flex gap-3 flex-1">
              <Info
                size={20}
                className="mt-0.5 flex-shrink-0 text-blue-600 dark:text-blue-200"
              />
              <div className="space-y-1 text-sm text-blue-900 dark:text-blue-100">
                <p className="font-semibold">
                  Individual Confidence scoring update
                </p>
                <p className="text-slate-700 dark:text-blue-100">
                  Confidence buttons still go from 0 → 4, but 4 now means you&apos;re very confident. The backend automatically inverts the score so higher confidence lowers the weighted contribution.
                </p>
                <p className="text-xs text-slate-600 dark:text-blue-200">
                  Pick 0 when you&apos;re unsure and 4 when you&apos;re very confident, no more mental gymnastics needed.
                </p>
              </div>
            </div>
            <div className="flex justify-end md:ml-auto md:mt-0 flex-shrink-0 w-full md:w-auto">
              <button
                type="button"
                onClick={handleDismissConfidenceInfo}
                className="rounded-full bg-blue-600 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-white shadow hover:bg-blue-700 focus:outline-none focus-visible:ring focus-visible:ring-blue-400"
              >
                Got it
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
