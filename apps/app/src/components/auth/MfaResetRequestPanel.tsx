import { useState } from "react";
import { KeyRound } from "lucide-react";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { requestMfaReset } from "@/lib/workspace-service";

interface MfaResetRequestPanelProps {
  challengeToken: string;
  onRequested: () => void;
}

export function MfaResetRequestPanel({
  challengeToken,
  onRequested,
}: MfaResetRequestPanelProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRequest = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await requestMfaReset(challengeToken);
      onRequested();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to request an authentication reset",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white/65 p-4 text-left dark:border-white/10 dark:bg-slate-900/35">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
          <KeyRound className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-900 dark:text-white">
            Lost access to every method?
          </p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Ask a workspace admin to reset your authenticator, recovery codes,
            and passkeys. You’ll need to set up two-factor authentication again.
          </p>
          {error ? (
            <div className="mt-3">
              <Alert variant="error">{error}</Alert>
            </div>
          ) : null}
          <Button
            className="mt-4"
            variant="secondary"
            size="sm"
            isLoading={isSubmitting}
            onClick={() => void handleRequest()}
          >
            Ask workspace admin to reset
          </Button>
        </div>
      </div>
    </div>
  );
}
