import { useState } from "react";
import { KeyRound } from "lucide-react";

import { BackButton } from "@/components/auth/BackButton";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { requestMfaReset } from "@/lib/workspace-service";

interface MfaResetRequestPanelProps {
  challengeToken: string;
  onCancel: () => void;
  onRequested: () => void;
}

export function MfaResetRequestPanel({
  challengeToken,
  onCancel,
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
    <section aria-labelledby="mfa-reset-title">
      <BackButton
        disabled={isSubmitting}
        label="Back to verification methods"
        onClick={onCancel}
      />
      <div className="mt-5 space-y-6 text-center">
        <header>
          <span className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
            <KeyRound className="h-8 w-8" aria-hidden="true" />
          </span>
          <h2
            className="text-2xl font-semibold text-slate-900 dark:text-white"
            id="mfa-reset-title"
          >
            Lost access to every method?
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Ask a workspace admin to reset your authenticator, recovery codes,
            and passkeys. You’ll need to set up two-factor authentication again.
          </p>
        </header>
        {error ? <Alert variant="error">{error}</Alert> : null}
        <Button
          fullWidth
          variant="secondary"
          size="lg"
          isLoading={isSubmitting}
          onClick={() => void handleRequest()}
        >
          Ask workspace admin to reset
        </Button>
      </div>
    </section>
  );
}
