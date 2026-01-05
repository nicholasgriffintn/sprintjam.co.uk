import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

import { PageBackground } from "@/components/layout/PageBackground";
import { Button } from "@/components/ui/Button";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { Logo } from "@/components/Logo";
import { Footer } from "@/components/layout/Footer";
import { verifyMagicLink } from "@/lib/workspace-service";

type VerifyState = "verifying" | "success" | "error";

export default function VerifyScreen() {
  const [state, setState] = useState<VerifyState>("verifying");
  const [error, setError] = useState("");
  const verifyAttempted = useRef(false);

  useEffect(() => {
    if (verifyAttempted.current) {
      return;
    }
    verifyAttempted.current = true;

    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (!token) {
      setState("error");
      setError("No verification token provided");
      return;
    }

    verifyMagicLink(token)
      .then(() => {
        setState("success");
        setTimeout(() => {
          window.location.href = "/workspace";
        }, 1500);
      })
      .catch((err) => {
        setState("error");
        setError(err instanceof Error ? err.message : "Verification failed");
      });
  }, []);

  const handleRetryLogin = () => {
    window.location.href = "/auth/login";
  };

  const handleGoHome = () => {
    window.location.href = "/";
  };

  return (
    <PageBackground maxWidth="md">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-8"
      >
        <div className="flex justify-center">
          <Logo size="md" />
        </div>

        <SurfaceCard className="text-center">
          {state === "verifying" && (
            <>
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
            </>
          )}

          {state === "success" && (
            <>
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
            </>
          )}

          {state === "error" && (
            <>
              <div className="mb-6 flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                  <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
                </div>
              </div>

              <h1 className="mb-2 text-2xl font-semibold text-slate-900 dark:text-white">
                Verification failed
              </h1>

              <p className="mb-6 text-slate-600 dark:text-slate-300">{error}</p>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Button onClick={handleRetryLogin}>Try again</Button>
                <Button variant="secondary" onClick={handleGoHome}>
                  Go home
                </Button>
              </div>
            </>
          )}
        </SurfaceCard>
      </motion.div>
      <Footer displayRepoLink={false} fullWidth={false} priorityLinksOnly />
    </PageBackground>
  );
}
