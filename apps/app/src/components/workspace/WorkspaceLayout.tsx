import { type ReactNode } from "react";
import { motion } from "framer-motion";
import { LogIn, RefreshCcw } from "lucide-react";

import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { BetaBadge } from "@/components/BetaBadge";

interface WorkspaceLayoutProps {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: unknown;
  error: string | null;
  onRefresh: () => void;
  onLogin: () => void;
  children: ReactNode;
}

export function WorkspaceLayout({
  isLoading,
  isAuthenticated,
  user,
  error,
  onRefresh,
  onLogin,
  children,
}: WorkspaceLayoutProps) {
  const showSignedOut = !isLoading && !user && !isAuthenticated;

  if (isLoading && !user) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <SurfaceCard className="flex items-center justify-center">
          <div className="flex items-center gap-3">
            <Spinner />
            <span className="text-slate-700 dark:text-slate-200">
              Loading workspace...
            </span>
          </div>
        </SurfaceCard>
      </div>
    );
  }

  if (showSignedOut) {
    return (
      <div className="mx-auto max-w-md px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="space-y-6"
        >
          <SurfaceCard className="text-left">
            <motion.div
              className="space-y-8"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <h1 className="mb-2 text-2xl font-semibold text-slate-900 dark:text-white">
                Sign in to manage your workspace <BetaBadge />
              </h1>

              <p className="text-base text-slate-600 dark:text-slate-300">
                Workspaces are designed to help teams organise and manage their
                planning rooms and sessions. To access your workspace, please
                sign in to your account.
              </p>

              <div className="flex flex-col gap-4 sm:flex-row">
                <Button
                  type="button"
                  variant="secondary"
                  data-testid="workspace-retry"
                  className="sm:w-auto sm:flex-shrink-0"
                  fullWidth
                  onClick={onRefresh}
                  icon={<RefreshCcw className="h-4 w-4" />}
                >
                  Retry
                </Button>
                <Button
                  type="button"
                  data-testid="workspace-login"
                  className="sm:flex-1"
                  fullWidth
                  onClick={onLogin}
                  icon={<LogIn className="h-4 w-4" />}
                >
                  Go to login
                </Button>
              </div>
            </motion.div>
          </SurfaceCard>

          <p className="text-center text-sm text-slate-500 dark:text-slate-400">
            Need help? Ask your workspace administrator for more information.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {error && (
        <Alert variant="error">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-medium">{error}</span>
            <Button
              variant="secondary"
              size="sm"
              onClick={onRefresh}
              icon={<RefreshCcw className="h-3.5 w-3.5" />}
            >
              Retry
            </Button>
          </div>
        </Alert>
      )}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className={error ? "mt-6 space-y-6" : "space-y-6"}
      >
        {children}
      </motion.div>
    </div>
  );
}
