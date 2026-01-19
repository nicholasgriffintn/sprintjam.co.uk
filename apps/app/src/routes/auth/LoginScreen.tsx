import { Suspense, lazy, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { Mail, CheckCircle, Loader2, KeyRound } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import {
  requestMagicLink,
  startMfaSetup,
  startMfaVerify,
  verifyCode,
  verifyMfa,
  verifyMfaSetup,
  type MfaMethod,
  type VerifyCodeResponse,
} from "@/lib/workspace-service";
import {
  buildAuthenticationOptions,
  buildRegistrationOptions,
  toWebAuthnCredential,
} from "@/lib/auth/webauthn";
import { usePageMeta } from "@/hooks/usePageMeta";
import { META_CONFIGS } from "@/config/meta";
import { useSessionActions } from "@/context/SessionContext";
import { useWorkspaceAuth } from "@/context/WorkspaceAuthContext";
import { BetaBadge } from "@/components/BetaBadge";
import { getReturnUrl, clearReturnUrl } from "@/config/routes";
import { AuthPage } from "@/routes/auth/components/AuthPage";
import { BackButton } from "@/routes/auth/components/BackButton";
import { ErrorMessage } from "@/routes/auth/components/ErrorMessage";
import { PasskeyCard } from "@/routes/auth/components/PasskeyCard";
import { TotpForm } from "@/routes/auth/components/TotpForm";
import { RecoveryCodesCard } from "@/routes/auth/components/RecoveryCodesCard";

const QRCodeSVG = lazy(() =>
  import("qrcode.react").then((module) => ({ default: module.QRCodeSVG })),
);

type LoginState =
  | "input"
  | "sending"
  | "code"
  | "verifying"
  | "mfa-choice"
  | "mfa-totp-setup"
  | "mfa-totp-verify"
  | "mfa-webauthn-setup"
  | "mfa-webauthn-verify"
  | "mfa-recovery-verify"
  | "mfa-recovery-codes"
  | "success"
  | "error";

type MfaFlowMode = "setup" | "verify";

export default function LoginScreen() {
  usePageMeta(META_CONFIGS.login);

  const { goToWorkspace } = useSessionActions();
  const { refreshAuth } = useWorkspaceAuth();

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [state, setState] = useState<LoginState>("input");
  const [error, setError] = useState("");
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [mfaMode, setMfaMode] = useState<MfaFlowMode | null>(null);
  const [mfaMethods, setMfaMethods] = useState<MfaMethod[]>([]);
  const [mfaCode, setMfaCode] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [totpSecret, setTotpSecret] = useState<string | null>(null);
  const [totpUrl, setTotpUrl] = useState<string | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [isMfaBusy, setIsMfaBusy] = useState(false);

  const buildRecoveryCodesText = (codes: string[]) => codes.join("\n");

  const handleCopyRecoveryCodes = async () => {
    const text = buildRecoveryCodesText(recoveryCodes);
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
  };

  const handleDownloadRecoveryCodes = () => {
    const text = buildRecoveryCodesText(recoveryCodes);
    if (!text) return;
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "sprintjam-recovery-codes.txt";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleEmailSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim()) return;

    setState("sending");
    setError("");

    try {
      await requestMagicLink(email.trim().toLowerCase());
      setState("code");
    } catch (err) {
      setState("error");
      setError(
        err instanceof Error ? err.message : "Failed to send verification code",
      );
    }
  };

  const completeRedirect = () => {
    setState("success");
    setTimeout(() => {
      const returnUrl = getReturnUrl();
      clearReturnUrl();

      if (returnUrl) {
        window.location.href = returnUrl;
      } else {
        goToWorkspace();
      }
    }, 1500);
  };

  const handleAuthenticated = async (result: VerifyCodeResponse) => {
    if (result.status !== "authenticated") {
      setChallengeToken(result.challengeToken);
      setMfaMode(result.mode);
      setMfaMethods(result.methods);
      setState("mfa-choice");
      return;
    }

    await refreshAuth();
    if (result.recoveryCodes && result.recoveryCodes.length > 0) {
      setRecoveryCodes(result.recoveryCodes);
      setState("mfa-recovery-codes");
      return;
    }
    completeRedirect();
  };

  const handleCodeSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!code.trim() || code.length !== 6) return;

    setState("verifying");
    setError("");

    try {
      const result = await verifyCode(email.trim().toLowerCase(), code.trim());
      await handleAuthenticated(result);
    } catch (err) {
      setState("code");
      setError(err instanceof Error ? err.message : "Invalid verification code");
    }
  };

  const handleTotpSetupStart = async () => {
    if (!challengeToken) return;
    setError("");
    setIsMfaBusy(true);
    try {
      const result = await startMfaSetup(challengeToken, "totp");
      if (result.method === "totp") {
        setTotpSecret(result.secret);
        setTotpUrl(result.otpauthUrl);
      }
      setState("mfa-totp-setup");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start TOTP setup");
    } finally {
      setIsMfaBusy(false);
    }
  };

  const handleTotpVerifyStart = () => {
    setError("");
    setState("mfa-totp-verify");
  };

  const handleWebAuthnSetup = async () => {
    if (!challengeToken) return;
    if (!window.PublicKeyCredential) {
      setError("Passkeys are not supported on this device");
      return;
    }
    setError("");
    setIsMfaBusy(true);
    try {
      const result = await startMfaSetup(challengeToken, "webauthn");
      if (result.method !== "webauthn") {
        throw new Error("Unexpected WebAuthn setup response");
      }
      const publicKey = buildRegistrationOptions(result.options);
      const credential = await navigator.credentials.create({ publicKey });
      if (!(credential instanceof PublicKeyCredential)) {
        throw new Error("Passkey setup was cancelled");
      }
      const payload = toWebAuthnCredential(credential);
      const verified = await verifyMfaSetup(challengeToken, "webauthn", {
        credential: payload,
      });
      await handleAuthenticated(verified);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to set up passkey");
      setState("mfa-webauthn-setup");
    } finally {
      setIsMfaBusy(false);
    }
  };

  const handleWebAuthnVerify = async () => {
    if (!challengeToken) return;
    if (!window.PublicKeyCredential) {
      setError("Passkeys are not supported on this device");
      return;
    }
    setError("");
    setIsMfaBusy(true);
    try {
      const result = await startMfaVerify(challengeToken, "webauthn");
      const publicKey = buildAuthenticationOptions(result.options);
      const credential = await navigator.credentials.get({ publicKey });
      if (!(credential instanceof PublicKeyCredential)) {
        throw new Error("Passkey verification was cancelled");
      }
      const payload = toWebAuthnCredential(credential);
      const verified = await verifyMfa(challengeToken, "webauthn", {
        credential: payload,
      });
      await handleAuthenticated(verified);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to verify passkey");
      setState("mfa-webauthn-verify");
    } finally {
      setIsMfaBusy(false);
    }
  };

  const handleTotpSubmit = async (event: FormEvent, mode: MfaFlowMode) => {
    event.preventDefault();
    if (!challengeToken || !mfaCode.trim()) return;
    setError("");
    setIsMfaBusy(true);
    try {
      const result =
        mode === "setup"
          ? await verifyMfaSetup(challengeToken, "totp", { code: mfaCode })
          : await verifyMfa(challengeToken, "totp", { code: mfaCode });
      await handleAuthenticated(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid authenticator code");
    } finally {
      setIsMfaBusy(false);
    }
  };

  const handleRecoverySubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!challengeToken || !recoveryCode.trim()) return;
    setError("");
    setIsMfaBusy(true);
    try {
      const result = await verifyMfa(challengeToken, "recovery", {
        code: recoveryCode,
      });
      await handleAuthenticated(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid recovery code");
    } finally {
      setIsMfaBusy(false);
    }
  };

  const handleStartOver = () => {
    setState("input");
    setEmail("");
    setCode("");
    setMfaCode("");
    setRecoveryCode("");
    setChallengeToken(null);
    setMfaMode(null);
    setMfaMethods([]);
    setTotpSecret(null);
    setTotpUrl(null);
    setRecoveryCodes([]);
    setIsMfaBusy(false);
    setError("");
  };

  if (state === "success") {
    return (
      <AuthPage>
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
      </AuthPage>
    );
  }

  if (state === "mfa-choice") {
    return (
      <AuthPage>
        <div className="space-y-3 text-left">
          <BackButton label="Use different email" onClick={handleStartOver} />
        </div>

        <SurfaceCard>
          <div className="space-y-6">
            <div className="text-center">
              <div className="mb-6 flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/30">
                  <KeyRound className="h-8 w-8 text-brand-600 dark:text-brand-400" />
                </div>
              </div>
              <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
                {mfaMode === "setup"
                  ? "Set up two-factor authentication"
                  : "Verify with two-factor authentication"}
              </h1>
              <p className="mt-2 text-slate-600 dark:text-slate-300">
                Choose a method to {mfaMode === "setup" ? "set up" : "continue"}.
              </p>
            </div>

              <div className="flex flex-col gap-3">
                {mfaMethods.includes("totp") && (
                  <Button
                    type="button"
                  fullWidth
                  size="lg"
                  onClick={
                    mfaMode === "setup"
                      ? handleTotpSetupStart
                      : handleTotpVerifyStart
                  }
                    disabled={isMfaBusy}
                  >
                    Use authenticator app
                  </Button>
                )}
                {mfaMethods.includes("webauthn") && (
                  <Button
                    type="button"
                  fullWidth
                  size="lg"
                  variant="secondary"
                  onClick={() => {
                    setState(
                      mfaMode === "setup"
                        ? "mfa-webauthn-setup"
                        : "mfa-webauthn-verify",
                    );
                    if (mfaMode === "setup") {
                      void handleWebAuthnSetup();
                    } else {
                      void handleWebAuthnVerify();
                    }
                  }}
                    disabled={isMfaBusy}
                  >
                    Use passkey
                  </Button>
                )}
                {mfaMode === "verify" && (
                  <Button
                    type="button"
                    fullWidth
                    size="md"
                    variant="secondary"
                    onClick={() => {
                      setError("");
                      setState("mfa-recovery-verify");
                    }}
                    disabled={isMfaBusy}
                  >
                    Use recovery code
                  </Button>
                )}
              </div>

            <ErrorMessage error={error} />
          </div>
        </SurfaceCard>
      </AuthPage>
    );
  }

  if (state === "mfa-totp-setup") {
    return (
      <AuthPage>
        <div className="space-y-3 text-left">
          <BackButton
            label="Choose another method"
            onClick={() => setState("mfa-choice")}
          />
        </div>

        <SurfaceCard>
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
                Set up your authenticator
              </h1>
              <p className="mt-2 text-slate-600 dark:text-slate-300">
                Scan the QR code or enter the secret manually.
              </p>
            </div>

            {totpUrl ? (
              <div className="flex justify-center">
                <Suspense
                  fallback={
                    <div className="h-40 w-40 rounded bg-slate-100 dark:bg-slate-800" />
                  }
                >
                  <QRCodeSVG
                    value={totpUrl}
                    size={160}
                    bgColor="transparent"
                    fgColor="#0f172a"
                    className="rounded bg-white p-2"
                  />
                </Suspense>
              </div>
            ) : null}

            {totpSecret ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 font-mono text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-200">
                {totpSecret}
              </div>
            ) : null}

            <TotpForm
              title="Confirm your authenticator"
              description="Enter the six-digit code shown in your app."
              code={mfaCode}
              onChange={setMfaCode}
              onSubmit={(event) => handleTotpSubmit(event, "setup")}
              submitLabel="Confirm authenticator"
              isBusy={isMfaBusy}
              error={error}
            />
          </div>
        </SurfaceCard>
      </AuthPage>
    );
  }

  if (state === "mfa-totp-verify") {
    return (
      <AuthPage>
        <div className="space-y-3 text-left">
          <BackButton
            label="Choose another method"
            onClick={() => setState("mfa-choice")}
          />
        </div>

        <SurfaceCard>
          <TotpForm
            title="Enter your authenticator code"
            description="Use the six-digit code from your authenticator app."
            code={mfaCode}
            onChange={setMfaCode}
            onSubmit={(event) => handleTotpSubmit(event, "verify")}
            submitLabel="Verify"
            isBusy={isMfaBusy}
            error={error}
            secondaryAction={{
              label: "Use recovery code",
              onClick: () => {
                setError("");
                setState("mfa-recovery-verify");
              },
            }}
          />
        </SurfaceCard>
      </AuthPage>
    );
  }

  if (state === "mfa-recovery-verify") {
    return (
      <AuthPage>
        <div className="space-y-3 text-left">
          <BackButton
            label="Choose another method"
            onClick={() => setState("mfa-choice")}
          />
        </div>

        <SurfaceCard>
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
                Enter a recovery code
              </h1>
              <p className="mt-2 text-slate-600 dark:text-slate-300">
                Each recovery code can only be used once.
              </p>
            </div>

            <motion.form
              onSubmit={handleRecoverySubmit}
              className="space-y-6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Input
                type="text"
                label="Recovery code"
                placeholder="XXXX-XXXX-XXXX"
                value={recoveryCode}
                onChange={(e) => setRecoveryCode(e.target.value)}
                error={error}
                fullWidth
                required
                autoFocus
                disabled={isMfaBusy}
                className="text-center text-lg tracking-widest"
              />

              <Button
                type="submit"
                fullWidth
                size="lg"
                isLoading={isMfaBusy}
                disabled={!recoveryCode.trim()}
              >
                Verify recovery code
              </Button>
            </motion.form>
          </div>
        </SurfaceCard>
      </AuthPage>
    );
  }

  if (state === "mfa-recovery-codes") {
    return (
      <AuthPage>
        <RecoveryCodesCard
          codes={recoveryCodes}
          onCopy={handleCopyRecoveryCodes}
          onDownload={handleDownloadRecoveryCodes}
          onContinue={completeRedirect}
        />
      </AuthPage>
    );
  }

  if (state === "mfa-webauthn-setup" || state === "mfa-webauthn-verify") {
    const isSetup = state === "mfa-webauthn-setup";
    return (
      <AuthPage>
        <div className="space-y-3 text-left">
          <BackButton
            label="Choose another method"
            onClick={() => setState("mfa-choice")}
          />
        </div>

        <PasskeyCard
          isSetup={isSetup}
          isBusy={isMfaBusy}
          error={error}
          onStart={() => {
            if (isSetup) {
              void handleWebAuthnSetup();
            } else {
              void handleWebAuthnVerify();
            }
          }}
          onUseRecoveryCode={
            isSetup
              ? undefined
              : () => {
                  setError("");
                  setState("mfa-recovery-verify");
                }
          }
        />
      </AuthPage>
    );
  }

  if (state === "code" || state === "verifying") {
    return (
      <AuthPage>
        <div className="space-y-3 text-left">
          <BackButton label="Use different email" onClick={handleStartOver} />
        </div>

        <SurfaceCard>
          <div className="space-y-6">
            <div className="mb-6 text-center">
              <div className="mb-6 flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/30">
                  {state === "verifying" ? (
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
                We sent a 6-digit code to{" "}
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
                  const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setCode(value);
                }}
                error={error}
                fullWidth
                required
                autoFocus
                disabled={state === "verifying"}
                autoComplete="one-time-code"
                className="text-center text-2xl tracking-widest"
              />

              <div className="flex flex-col gap-4">
                <Button
                  type="submit"
                  data-testid="verify-submit"
                  fullWidth
                  size="lg"
                  isLoading={state === "verifying"}
                  disabled={code.length !== 6}
                >
                  {state === "verifying" ? "Verifying..." : "Verify"}
                </Button>
              </div>

              <p className="text-center text-sm text-slate-500 dark:text-slate-400">
                The code will expire in 15 minutes.
              </p>
            </motion.form>
          </div>
        </SurfaceCard>
      </AuthPage>
    );
  }

  return (
    <AuthPage>
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
        Workspaces are available for authorised domains only. Contact your
        administrator if you need access.
      </p>
    </AuthPage>
  );
}
