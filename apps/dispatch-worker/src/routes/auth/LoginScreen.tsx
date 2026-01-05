import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";

import { PageBackground } from "@/components/layout/PageBackground";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { Logo } from "@/components/Logo";
import { Footer } from "@/components/layout/Footer";
import { requestMagicLink } from "@/lib/workspace-service";
import { usePageMeta } from '@/hooks/usePageMeta';
import { META_CONFIGS } from '@/config/meta';
import { useSessionActions } from '@/context/SessionContext';
import { BetaBadge } from '@/components/BetaBadge';

type LoginState = 'input' | 'sending' | 'sent' | 'error';

export default function LoginScreen() {
  usePageMeta(META_CONFIGS.login);

  const { goHome } = useSessionActions();

  const [email, setEmail] = useState('');
  const [state, setState] = useState<LoginState>('input');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setState('sending');
    setError('');

    try {
      await requestMagicLink(email.trim().toLowerCase());
      setState('sent');
    } catch (err) {
      setState('error');
      setError(
        err instanceof Error ? err.message : 'Failed to send magic link'
      );
    }
  };

  if (state === 'sent') {
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
                Check your email
              </h1>

              <p className="mb-6 text-slate-600 dark:text-slate-300">
                We sent a magic link to{' '}
                <span className="font-medium text-slate-900 dark:text-white">
                  {email}
                </span>
                . Click the link to sign in to your workspace.
              </p>

              <p className="text-sm text-slate-500 dark:text-slate-400">
                The link will expire in 15 minutes.
              </p>

              <div className="flex flex-col gap-4 sm:flex-row">
                <Button
                  type="submit"
                  variant="secondary"
                  data-testid="login-home"
                  className="sm:flex-1"
                  fullWidth
                  onClick={goHome}
                  icon={<ArrowLeft className="h-4 w-4" />}
                >
                  Back to home
                </Button>
              </div>
            </motion.div>
          </SurfaceCard>
        </motion.div>
        <Footer displayRepoLink={false} fullWidth={false} priorityLinksOnly />
      </PageBackground>
    );
  }

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

        <SurfaceCard>
          <div className="space-y-6">
            <div className="mb-6 text-center">
              <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
                Sign in to Workspaces <BetaBadge />
              </h1>
              <p className="mt-2 text-slate-600 dark:text-slate-300">
                Enter your work email to receive a magic link
              </p>
            </div>

            <motion.form
              onSubmit={handleSubmit}
              className="space-y-8"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Input
                type="email"
                label="Work email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={<Mail className="h-4 w-4" />}
                error={error}
                fullWidth
                required
                autoFocus
                disabled={state === 'sending'}
              />

              <div className="flex flex-col gap-4 sm:flex-row">
                <Button
                  type="submit"
                  data-testid="login-submit"
                  className="sm:flex-1"
                  fullWidth
                  size="lg"
                  isLoading={state === 'sending'}
                >
                  {state === 'sending' ? 'Sending...' : 'Send magic link'}
                </Button>
              </div>
            </motion.form>
          </div>
        </SurfaceCard>

        <p className="text-center text-sm text-slate-500 dark:text-slate-400">
          Workspaces are available for authorized domains only. Contact your
          administrator if you need access.
        </p>
      </motion.div>
      <Footer displayRepoLink={false} fullWidth={false} priorityLinksOnly />
    </PageBackground>
  );
}
