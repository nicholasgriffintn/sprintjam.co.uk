import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { Button } from "@/components/ui/Button";
import { ErrorMessage } from "@/routes/auth/components/ErrorMessage";

type PasskeyCardProps = {
  isSetup: boolean;
  isBusy: boolean;
  error: string;
  onStart: () => void;
  onUseRecoveryCode?: () => void;
};

export function PasskeyCard({
  isSetup,
  isBusy,
  error,
  onStart,
  onUseRecoveryCode,
}: PasskeyCardProps) {
  return (
    <SurfaceCard>
      <div className="space-y-6 text-center">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
            {isSetup ? "Set up a passkey" : "Verify with a passkey"}
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-300">
            {isSetup
              ? "Use Face ID, Touch ID, or a security key."
              : "Use your passkey to continue."}
          </p>
        </div>

        <Button
          type="button"
          fullWidth
          size="lg"
          onClick={onStart}
          isLoading={isBusy}
          disabled={isBusy}
        >
          {isSetup ? "Create passkey" : "Use passkey"}
        </Button>

        {!isSetup && onUseRecoveryCode ? (
          <Button
            type="button"
            fullWidth
            size="md"
            variant="secondary"
            onClick={onUseRecoveryCode}
            disabled={isBusy}
          >
            Use recovery code
          </Button>
        ) : null}

        <ErrorMessage error={error} />
      </div>
    </SurfaceCard>
  );
}
