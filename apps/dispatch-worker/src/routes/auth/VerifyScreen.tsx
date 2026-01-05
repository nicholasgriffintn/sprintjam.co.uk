import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle,
  XCircle,
  Loader2,
  ArrowLeft,
  RefreshCcw,
} from 'lucide-react';

import { PageBackground } from '@/components/layout/PageBackground';
import { Button } from '@/components/ui/Button';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { Logo } from '@/components/Logo';
import { Footer } from '@/components/layout/Footer';
import { verifyMagicLink } from '@/lib/workspace-service';
import { usePageMeta } from '@/hooks/usePageMeta';
import { META_CONFIGS } from '@/config/meta';
import { useSessionActions } from '@/context/SessionContext';

type VerifyState = 'verifying' | 'success' | 'error';

export default function VerifyScreen() {
  usePageMeta(META_CONFIGS.verify);

  const { goHome, goToLogin, goToWorkspace } = useSessionActions();

  const [state, setState] = useState<VerifyState>('verifying');
  const [error, setError] = useState('');
  const verifyAttempted = useRef(false);

  useEffect(() => {
    if (verifyAttempted.current) {
      return;
    }
    verifyAttempted.current = true;

    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (!token) {
      setState('error');
      setError('No verification token provided');
      return;
    }

    verifyMagicLink(token)
      .then(() => {
        setState('success');
        setTimeout(() => {
          goToWorkspace();
        }, 1500);
      })
      .catch((err) => {
        setState('error');
        setError(err instanceof Error ? err.message : 'Verification failed');
      });
  }, []);

  return (
    <PageBackground align="start" maxWidth="sm" variant="compact">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="space-y-6"
      >
        <div className="flex justify-center">
          <Logo size="md" />
        </div>

        <div className="space-y-3 text-left">
          <Button
            type="button"
            variant="unstyled"
            onClick={goHome}
            icon={<ArrowLeft className="h-4 w-4" />}
            className="p-0 text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            Back to home
          </Button>
        </div>

        <SurfaceCard className="text-center">
          {state === 'verifying' && (
            <motion.div
              className="space-y-8"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="mb-6 flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/30">
                  <Loader2 className="h-8 w-8 animate-spin text-brand-600 dark:text-brand-400" />
                </div>
              </div>

              <h1 className="mb-2 text-2xl font-semibold text-slate-900 dark:text-white">
                Verifying your link
              </h1>

              <p className="text-slate-600 dark:text-slate-300">
                Please wait while we sign you in...
              </p>
            </motion.div>
          )}

          {state === 'success' && (
            <motion.div
              className="space-y-8"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="mb-6 flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                  <CheckCircle className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>

              <h1 className="mb-2 text-2xl font-semibold text-slate-900 dark:text-white">
                You are signed in
              </h1>

              <p className="text-slate-600 dark:text-slate-300">
                Redirecting you to your workspace...
              </p>
            </motion.div>
          )}

          {state === 'error' && (
            <motion.div
              className="space-y-8"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="mb-6 flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                  <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
                </div>
              </div>

              <h1 className="mb-2 text-2xl font-semibold text-slate-900 dark:text-white">
                Verification failed
              </h1>

              <p className="mb-6 text-slate-600 dark:text-slate-300">{error}</p>

              <div className="flex flex-col gap-4 sm:flex-row">
                <Button
                  type="button"
                  variant="secondary"
                  data-testid="verify-retry"
                  className="sm:w-auto sm:flex-shrink-0"
                  fullWidth
                  onClick={goToLogin}
                  icon={<RefreshCcw className="h-4 w-4" />}
                >
                  Try again
                </Button>
                <Button
                  type="button"
                  data-testid="workspace-login"
                  className="sm:flex-1"
                  fullWidth
                  onClick={goHome}
                >
                  Go home
                </Button>
              </div>
            </motion.div>
          )}
        </SurfaceCard>
      </motion.div>
      <Footer displayRepoLink={false} fullWidth={false} priorityLinksOnly />
    </PageBackground>
  );
}
