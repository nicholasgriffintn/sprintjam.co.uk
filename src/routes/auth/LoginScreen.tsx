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

type LoginState = "input" | "sending" | "sent" | "error";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<LoginState>("input");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setState("sending");
    setError("");

    try {
      await requestMagicLink(email.trim().toLowerCase());
      setState("sent");
    } catch (err) {
      setState("error");
      setError(
        err instanceof Error ? err.message : "Failed to send magic link",
      );
    }
  };

  const handleBackToHome = () => {
    window.location.href = "/";
  };

  if (state === "sent") {
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
            <div className="mb-6 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                <CheckCircle className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>

            <h1 className="mb-2 text-2xl font-semibold text-slate-900 dark:text-white">
              Check your email
            </h1>

            <p className="mb-6 text-slate-600 dark:text-slate-300">
              We sent a magic link to{" "}
              <span className="font-medium text-slate-900 dark:text-white">
                {email}
              </span>
              . Click the link to sign in to your workspace.
            </p>

            <p className="text-sm text-slate-500 dark:text-slate-400">
              The link will expire in 15 minutes.
            </p>

            <div className="mt-8">
              <Button
                variant="secondary"
                onClick={handleBackToHome}
                icon={<ArrowLeft className="h-4 w-4" />}
              >
                Back to home
              </Button>
            </div>
          </SurfaceCard>
        </motion.div>
        <Footer displayRepoLink={false} fullWidth={false} priorityLinksOnly />
      </PageBackground>
    );
  }

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

        <SurfaceCard>
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
              Sign in to Workspaces
            </h1>
            <p className="mt-2 text-slate-600 dark:text-slate-300">
              Enter your work email to receive a magic link
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
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
              disabled={state === "sending"}
            />

            <Button
              type="submit"
              fullWidth
              size="lg"
              isLoading={state === "sending"}
            >
              {state === "sending" ? "Sending..." : "Send magic link"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Button
              variant="ghost"
              onClick={handleBackToHome}
              icon={<ArrowLeft className="h-4 w-4" />}
              className="text-slate-600 dark:text-slate-400"
            >
              Back to home
            </Button>
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
