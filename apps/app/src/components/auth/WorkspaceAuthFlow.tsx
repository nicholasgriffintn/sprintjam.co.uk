import { AuthFlow, useAuth } from "@ngriffin_uk/auth-react";

import { BackButton } from "@/components/auth/BackButton";
import { BetaBadge } from "@/components/BetaBadge";
import { SurfaceCard } from "@/components/ui/SurfaceCard";

export function WorkspaceAuthFlow() {
  const { navigate, returnToChallengeSelection, state } = useAuth();
  const challengeKind =
    state.view === "challenge" ? state.challenge?.kind : undefined;
  const canUseDifferentEmail =
    challengeKind === "email_otp" || challengeKind === "mfa_selection";
  const canChooseAnotherMethod =
    challengeKind === "mfa_setup" ||
    (challengeKind === "webauthn" &&
      state.challenge?.parameters?.ceremony === "registration");

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
      <SurfaceCard>
        <AuthFlow signInTitleAccessory={<BetaBadge />} />
      </SurfaceCard>
      {state.view === "sign_in" ? (
        <p className="text-center text-sm text-slate-500 dark:text-slate-400">
          Workspaces are available for authorised domains only. Contact your
          administrator if you need access.
        </p>
      ) : null}
    </>
  );
}
