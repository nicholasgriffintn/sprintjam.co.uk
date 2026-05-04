import { KeyRound, Lock, LogIn } from "lucide-react";
import { motion } from "framer-motion";

import { Footer } from "@/components/layout/Footer";
import { PageSection } from "@/components/layout/PageBackground";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { formatRoomKey } from "@/utils/validators";

import { useStandupJoinForm } from "./useStandupJoinForm";

interface StandupJoinScreenProps {
  initialStandupKey?: string;
}

export function StandupJoinScreen({
  initialStandupKey,
}: StandupJoinScreenProps) {
  const {
    error,
    handleRecover,
    handleSubmit,
    isConflict,
    isRecovering,
    isSubmitting,
    nameValidation,
    navigateBack,
    passcode,
    passcodeValidation,
    recoveryError,
    recoveryPasskeyInput,
    setPasscode,
    setRecoveryPasskeyInput,
    setStandupKey,
    setUserName,
    standupKey,
    standupKeyValidation,
    userName,
  } = useStandupJoinForm({ initialStandupKey });

  return (
    <PageSection align="start" maxWidth="sm">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="space-y-6"
      >
        <div className="space-y-3 text-left">
          <div>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">
              Join standup
            </h1>
            <p className="text-base text-slate-600 dark:text-slate-300">
              Enter your name and standup key to submit today&apos;s update.
            </p>
          </div>
        </div>

        <SurfaceCard>
          <motion.form
            onSubmit={handleSubmit}
            className="space-y-8"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {error && <Alert variant="error">{error}</Alert>}

            {isConflict && (
              <div className="space-y-3 rounded-2xl border border-yellow-200/50 bg-yellow-50/50 p-4 dark:border-yellow-900/30 dark:bg-yellow-950/15">
                <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-300">
                  This name is already connected
                </p>
                <p className="text-sm text-yellow-800 dark:text-yellow-400">
                  If this is you on another device, enter your recovery passkey
                  to reclaim the session.
                </p>
                <Input
                  id="standup-recovery-passkey"
                  label={
                    <span className="flex items-center gap-2">
                      <KeyRound className="h-4 w-4" />
                      Recovery passkey
                    </span>
                  }
                  type="text"
                  value={recoveryPasskeyInput}
                  onChange={(event) =>
                    setRecoveryPasskeyInput(event.target.value.toUpperCase())
                  }
                  placeholder="XXXX-XXXX"
                  fullWidth
                  className="font-mono tracking-[0.25em]"
                  error={recoveryError ?? undefined}
                />
                <Button
                  type="button"
                  onClick={handleRecover}
                  disabled={!recoveryPasskeyInput.trim() || isRecovering}
                  isLoading={isRecovering}
                  fullWidth
                  icon={<KeyRound className="h-4 w-4" />}
                >
                  Recover session
                </Button>
              </div>
            )}

            <div className="space-y-6">
              <Input
                id="standup-join-name"
                label="Your name"
                value={userName}
                onChange={(event) => setUserName(event.target.value)}
                placeholder="Team member name"
                fullWidth
                required
                showValidation
                isValid={nameValidation.ok}
                helperText={
                  nameValidation.ok ? undefined : nameValidation.error
                }
              />

              <Input
                id="standup-join-key"
                label="Standup key"
                value={standupKey}
                onChange={(event) =>
                  setStandupKey(formatRoomKey(event.target.value))
                }
                placeholder="ABC123"
                fullWidth
                required
                showValidation
                isValid={standupKeyValidation.ok}
                helperText={
                  standupKeyValidation.ok
                    ? "Ask the facilitator for the room key."
                    : standupKeyValidation.error
                }
                maxLength={6}
                className="font-mono tracking-[0.35em]"
                icon={<KeyRound className="h-4 w-4" />}
              />

              <Input
                id="standup-join-passcode"
                label={
                  <span className="flex items-center gap-2">
                    Passcode
                    <span className="text-xs font-normal text-slate-400">
                      optional
                    </span>
                  </span>
                }
                value={passcode}
                onChange={(event) => setPasscode(event.target.value)}
                placeholder="Enter passcode if required"
                fullWidth
                icon={<Lock className="h-4 w-4" />}
                helperText={
                  passcodeValidation.ok ? undefined : passcodeValidation.error
                }
              />
            </div>

            <div className="flex flex-col gap-4 sm:flex-row">
              <Button type="button" variant="secondary" onClick={navigateBack}>
                Back
              </Button>
              <Button
                type="submit"
                isLoading={isSubmitting}
                fullWidth
                icon={<LogIn className="h-4 w-4" />}
              >
                Join standup
              </Button>
            </div>
          </motion.form>
        </SurfaceCard>
      </motion.div>
      <Footer
        displayRepoLink={false}
        fullWidth={false}
        priorityLinksOnly={true}
      />
    </PageSection>
  );
}
