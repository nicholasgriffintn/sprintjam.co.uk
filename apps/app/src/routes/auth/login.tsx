import { AuthProvider, type AuthProviderConfig } from "@ngriffin_uk/auth-react";
import { useCallback, useMemo } from "react";
import { useNavigate } from "react-router";

import { AuthPage } from "@/components/auth/AuthPage";
import { WorkspaceAuthFlow } from "@/components/auth/WorkspaceAuthFlow";
import { clearReturnUrl, getReturnUrl } from "@/config/routes";
import { useSessionActions } from "@/context/SessionContext";
import { useWorkspaceAuth } from "@/context/WorkspaceAuthContext";
import { API_BASE_URL } from "@/constants";
import { createMeta } from "@/utils/route-meta";

export const meta = createMeta("login");

export default function LoginRoute() {
  const { goToWorkspace } = useSessionActions();
  const { refreshAuth } = useWorkspaceAuth();
  const navigate = useNavigate();

  const completeRedirect = useCallback(async () => {
    await refreshAuth();
    const returnUrl = getReturnUrl();
    clearReturnUrl();
    if (returnUrl) {
      navigate(returnUrl, { replace: true });
    } else {
      goToWorkspace();
    }
  }, [goToWorkspace, navigate, refreshAuth]);

  const config = useMemo<AuthProviderConfig>(
    () => ({
      endpoint: `${API_BASE_URL}/auth`,
      capabilities: {
        magicLink: true,
        password: false,
        passkeys: false,
        recovery: false,
        signUp: false,
      },
      copy: {
        signInTitle: "Sign in to Workspaces",
        signInDescription:
          "Enter your work email to receive a verification code",
        magicLinkSubmit: "Continue",
        codeLabel: "Verification code",
      },
      signInFields: [
        {
          name: "email",
          label: "Work email",
          type: "email",
          autoComplete: "email",
          inputMode: "email",
          placeholder: "you@company.com",
          required: true,
        },
      ],
      classNames: {
        actions: "flex flex-col gap-3",
        button:
          "inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-brand-500 to-indigo-500 px-6 py-4 text-base font-semibold tracking-tight text-white shadow-floating transition-all duration-200 hover:from-brand-600 hover:to-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent disabled:cursor-not-allowed disabled:opacity-60",
        challenge:
          "space-y-6 [&_[name=code]]:text-center [&_[name=code]]:text-2xl [&_[name=code]]:tracking-widest [&_[data-auth-totp-secret]]:font-mono [&_[data-auth-totp-secret]]:text-sm [&_[data-auth-recovery-reset]]:rounded-lg [&_[data-auth-recovery-reset]]:border [&_[data-auth-recovery-reset]]:border-amber-300 [&_[data-auth-recovery-reset]]:bg-amber-50 [&_[data-auth-recovery-reset]]:p-4 [&_[data-auth-recovery-reset]]:text-sm [&_[data-auth-recovery-reset]]:text-amber-900 dark:[&_[data-auth-recovery-reset]]:border-amber-800 dark:[&_[data-auth-recovery-reset]]:bg-amber-950/30 dark:[&_[data-auth-recovery-reset]]:text-amber-100",
        challengeIcon:
          "mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400 [&>svg]:h-8 [&>svg]:w-8",
        description:
          "text-center text-slate-600 dark:text-slate-300 [&>strong]:font-medium [&>strong]:text-slate-900 dark:[&>strong]:text-white",
        error:
          "rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300",
        field: "flex w-full flex-col gap-1 text-left",
        form: "space-y-8",
        header: "mb-6 text-center [&>p]:mt-2",
        input:
          "w-full rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-base text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-200 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:border-white/10 dark:bg-slate-900/60 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-brand-400 dark:focus:ring-brand-900 dark:disabled:bg-slate-800 dark:disabled:text-slate-400",
        inputContainer: "relative [&>input]:pl-12",
        inputIcon:
          "pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500",
        label: "text-sm font-semibold text-slate-700 dark:text-slate-200",
        linkButton:
          "text-sm font-medium text-violet-700 hover:underline dark:text-violet-300",
        magicLinkButton:
          "inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-brand-500 to-indigo-500 px-6 py-4 text-base font-semibold tracking-tight text-white shadow-floating transition-all duration-200 hover:from-brand-600 hover:to-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent disabled:cursor-not-allowed disabled:opacity-60 [&>svg]:hidden",
        panel: "space-y-5",
        providerButton:
          "inline-flex w-full items-center justify-center rounded-2xl border border-slate-200/60 bg-white/90 px-5 py-3 text-sm font-semibold tracking-tight text-brand-700 transition-all duration-200 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent dark:border-white/10 dark:bg-slate-900/60 dark:text-white dark:hover:bg-slate-900",
        providerList: "space-y-3",
        recoveryCodes:
          "grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-4 font-mono text-sm dark:bg-slate-950",
        recoveryCodesActions: "mt-4 flex flex-col gap-3",
        signIn: "space-y-6",
        status:
          "rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
        title:
          "flex items-center justify-center gap-2 text-center text-2xl font-semibold text-slate-900 dark:text-white",
        totpQrCode: "mx-auto rounded bg-white p-2",
      },
      mapError: (error: unknown) =>
        error instanceof Error
          ? error.message
          : "Authentication could not be completed.",
      onAuthenticated: async () => {
        await completeRedirect();
      },
    }),
    [completeRedirect],
  );

  return (
    <AuthPage>
      <AuthProvider config={config}>
        <WorkspaceAuthFlow />
      </AuthProvider>
    </AuthPage>
  );
}
