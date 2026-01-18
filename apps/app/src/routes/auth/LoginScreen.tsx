import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, ArrowLeft, CheckCircle, Loader2 } from "lucide-react";

import { PageSection } from '@/components/layout/PageBackground';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { Footer } from "@/components/layout/Footer";
import { requestMagicLink, verifyCode } from "@/lib/workspace-service";
import { usePageMeta } from "@/hooks/usePageMeta";
import { META_CONFIGS } from "@/config/meta";
import { useSessionActions } from "@/context/SessionContext";
import { useWorkspaceAuth } from "@/context/WorkspaceAuthContext";
import { BetaBadge } from "@/components/BetaBadge";
import { getReturnUrl, clearReturnUrl } from '@/config/routes';

type LoginState =
  | "input"
  | "sending"
  | "code"
  | "verifying"
  | "success"
  | "error";

export default function LoginScreen() {
  usePageMeta(META_CONFIGS.login);

  const { goToWorkspace } = useSessionActions();
  const { refreshAuth } = useWorkspaceAuth();

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [state, setState] = useState<LoginState>('input');
  const [error, setError] = useState('');

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setState('sending');
    setError('');

    try {
      await requestMagicLink(email.trim().toLowerCase());
      setState('code');
    } catch (err) {
      setState('error');
      setError(
        err instanceof Error ? err.message : 'Failed to send verification code'
      );
    }
  };

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || code.length !== 6) return;

    setState('verifying');
    setError('');

    try {
      await verifyCode(email.trim().toLowerCase(), code.trim());
      await refreshAuth();
      setState('success');
      setTimeout(() => {
        const returnUrl = getReturnUrl();
        clearReturnUrl();

        if (returnUrl) {
          window.location.href = returnUrl;
        } else {
          goToWorkspace();
        }
      }, 1500);
    } catch (err) {
      setState('code');
      setError(
        err instanceof Error ? err.message : 'Invalid verification code'
      );
    }
  };

  const handleStartOver = () => {
    setState('input');
    setEmail('');
    setCode('');
    setError('');
  };

  if (state === 'success') {
    return (
      <PageSection align="start" maxWidth="sm">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="space-y-6"
        >
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
                You are signed in
              </h1>

              <p className="text-slate-600 dark:text-slate-300">
                Redirecting you to your workspace...
              </p>
            </motion.div>
          </SurfaceCard>
        </motion.div>
        <Footer displayRepoLink={false} fullWidth={false} priorityLinksOnly />
      </PageSection>
    );
  }

  if (state === 'code' || state === 'verifying') {
    return (
      <PageSection align="start" maxWidth="sm">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="space-y-6"
        >
          <div className="space-y-3 text-left">
            <Button
              type="button"
              variant="unstyled"
              onClick={handleStartOver}
              icon={<ArrowLeft className="h-4 w-4" />}
              className="p-0 text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            >
              Use different email
            </Button>
          </div>

          <SurfaceCard>
            <div className="space-y-6">
              <div className="mb-6 text-center">
                <div className="mb-6 flex justify-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/30">
                    {state === 'verifying' ? (
                      <Loader2 className="h-8 w-8 animate-spin text-brand-600 dark:text-brand-400" />
                    ) : (
                      <Mail className="h-8 w-8 text-brand-600 dark:text-brand-400" />
                    )}
                  </div>
                </div>
                <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
                  Enter verification code
                </h1>
                <p className="mt-2 text-slate-600 dark:text-slate-300">
                  We sent a 6-digit code to{' '}
                  <span className="font-medium text-slate-900 dark:text-white">
                    {email}
                  </span>
                </p>
              </div>

              <motion.form
                onSubmit={handleCodeSubmit}
                className="space-y-8"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  label="Verification code"
                  placeholder="000000"
                  value={code}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setCode(value);
                  }}
                  error={error}
                  fullWidth
                  required
                  autoFocus
                  disabled={state === 'verifying'}
                  autoComplete="one-time-code"
                  className="text-center text-2xl tracking-widest"
                />

                <div className="flex flex-col gap-4">
                  <Button
                    type="submit"
                    data-testid="verify-submit"
                    fullWidth
                    size="lg"
                    isLoading={state === 'verifying'}
                    disabled={code.length !== 6}
                  >
                    {state === 'verifying' ? 'Verifying...' : 'Verify'}
                  </Button>
                </div>

                <p className="text-center text-sm text-slate-500 dark:text-slate-400">
                  The code will expire in 15 minutes.
                </p>
              </motion.form>
            </div>
          </SurfaceCard>
        </motion.div>
        <Footer displayRepoLink={false} fullWidth={false} priorityLinksOnly />
      </PageSection>
    );
  }

  return (
    <PageSection align="start" maxWidth="sm">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="space-y-6"
      >
        <SurfaceCard>
          <div className="space-y-6">
            <div className="mb-6 text-center">
              <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
                Sign in to Workspaces <BetaBadge />
              </h1>
              <p className="mt-2 text-slate-600 dark:text-slate-300">
                Enter your work email to receive a verification code
              </p>
            </div>

            <motion.form
              onSubmit={handleEmailSubmit}
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
                  {state === 'sending' ? 'Sending...' : 'Continue'}
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
    </PageSection>
  );
}
