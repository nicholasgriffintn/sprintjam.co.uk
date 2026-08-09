import { AuthFlow, useAuth } from "@ngriffin_uk/auth-react";
import { useState } from "react";
import { CheckCircle2 } from "lucide-react";

import { BackButton } from "@/components/auth/BackButton";
import { MfaResetRequestPanel } from "@/components/auth/MfaResetRequestPanel";
import { BetaBadge } from "@/components/BetaBadge";
import { Button } from "@/components/ui/Button";
import { SurfaceCard } from "@/components/ui/SurfaceCard";

export function WorkspaceAuthFlow() {
  const { navigate, returnToChallengeSelection, state } = useAuth();
  const [resetViewChallengeToken, setResetViewChallengeToken] = useState<
    string | null
  >(null);
  const [requestedChallengeToken, setRequestedChallengeToken] = useState<
    string | null
  >(null);
  const challengeKind =
    state.view === "challenge" ? state.challenge?.kind : undefined;
  const canUseDifferentEmail =
    challengeKind === "email_otp" || challengeKind === "mfa_selection";
  const canChooseAnotherMethod =
    challengeKind === "mfa_setup" ||
    (challengeKind === "webauthn" &&
      state.challenge?.parameters?.ceremony === "registration");
  const challengeToken =
    state.view === "challenge" ? state.challenge?.continuationToken : undefined;
  const canRequestReset =
    challengeKind === "mfa_selection" &&
    state.challenge?.parameters?.mode === "verify" &&
    Boolean(challengeToken);
  const resetRequested =
    Boolean(challengeToken) && requestedChallengeToken === challengeToken;
  const showResetRequest =
    canRequestReset && resetViewChallengeToken === challengeToken;

  return (
    <>
      {canUseDifferentEmail ? (
        <div className="space-y-3 text-left">
          <BackButton
            label="Use different email"
            onClick={() => navigate("sign_in")}
          />
        </div>
      ) : null}
      {canChooseAnotherMethod ? (
        <div className="space-y-3 text-left">
          <BackButton
            label="Choose another method"
            onClick={returnToChallengeSelection}
          />
        </div>
      ) : null}
      {resetRequested ? (
        <SurfaceCard className="space-y-4 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
            <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              Reset request sent
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              A workspace admin can now review your request. Once approved, sign
              in again to set up a new authenticator or passkey.
            </p>
          </div>
        </SurfaceCard>
      ) : showResetRequest && challengeToken ? (
        <SurfaceCard>
          <MfaResetRequestPanel
            challengeToken={challengeToken}
            onCancel={() => setResetViewChallengeToken(null)}
            onRequested={() => setRequestedChallengeToken(challengeToken)}
          />
        </SurfaceCard>
      ) : (
        <SurfaceCard>
          <AuthFlow signInTitleAccessory={<BetaBadge />} />
          {canRequestReset && challengeToken ? (
            <Button
              type="button"
              variant="unstyled"
              className="mt-4 w-full p-0 text-center text-sm font-medium text-slate-500 underline-offset-4 hover:text-brand-700 hover:underline dark:text-slate-400 dark:hover:text-brand-300"
              onClick={() => setResetViewChallengeToken(challengeToken)}
            >
              Lost access to every method?
            </Button>
          ) : null}
        </SurfaceCard>
      )}
      {state.view === "sign_in" ? (
        <p className="text-center text-sm text-slate-500 dark:text-slate-400">
          Workspaces are available for authorised domains only. Contact your
          administrator if you need access.
        </p>
      ) : null}
    </>
  );
}
