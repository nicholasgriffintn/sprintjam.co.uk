import { useEffect, useMemo, useState, type FormEvent } from "react";
import { KeyRound, Lock, LogIn } from "lucide-react";
import { motion } from "framer-motion";

import { navigateTo } from "@/config/routes";
import { useSessionActions } from "@/context/SessionContext";
import { useWorkspaceData } from "@/hooks/useWorkspaceData";
import {
  getStoredUserAvatar,
  getStoredUserName,
  persistUserName,
  useUserPersistence,
} from "@/hooks/useUserPersistence";
import { joinStandup, recoverStandupSession } from "@/lib/standup-api-service";
import { HttpError } from "@/lib/errors";
import { getRecoveryPasskeyStorageKey } from "@/constants";
import { safeLocalStorage } from "@/utils/storage";
import { Input } from "@/components/ui/Input";
import { sanitiseAvatarValue } from "@/utils/avatars";
import {
  formatRoomKey,
  validateName,
  validatePasscode,
  validateRoomKey,
} from "@/utils/validators";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { PageSection } from "@/components/layout/PageBackground";

function getStandupKeyFromJoinPath(pathname: string): string {
  const match = pathname.match(/^\/standup\/join\/([A-Z0-9]+)$/i);
  return formatRoomKey(match?.[1] ?? "");
}

export default function StandupJoinScreen() {
  const { user } = useWorkspaceData();
  const { setScreen } = useSessionActions();
  const workspaceName = user?.name?.trim() ?? "";
  const workspaceAvatar = sanitiseAvatarValue(user?.avatar);
  const storedAvatar = useMemo(() => getStoredUserAvatar(), []);

  const [userName, setUserName] = useState(() =>
    validateName(workspaceName).ok ? workspaceName : getStoredUserName(),
  );
  const [standupKey, setStandupKey] = useState(() =>
    getStandupKeyFromJoinPath(window.location.pathname),
  );
  const [passcode, setPasscode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConflict, setIsConflict] = useState(false);
  const [recoveryPasskeyInput, setRecoveryPasskeyInput] = useState("");
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);

  useUserPersistence({
    name: userName,
    avatar: storedAvatar,
  });

  useEffect(() => {
    if (!validateName(userName).ok && validateName(workspaceName).ok) {
      setUserName(workspaceName);
    }
  }, [userName, workspaceName]);

  useEffect(() => {
    const handlePopState = () => {
      setStandupKey(getStandupKeyFromJoinPath(window.location.pathname));
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const nameValidation = validateName(userName);
  const standupKeyValidation = validateRoomKey(standupKey);
  const passcodeValidation = validatePasscode(passcode);
  const isFormValid =
    nameValidation.ok && standupKeyValidation.ok && passcodeValidation.ok;
  const avatarValue = workspaceAvatar ?? storedAvatar ?? undefined;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isFormValid) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setIsConflict(false);

    try {
      const normalizedUserName = userName.trim();
      const response = await joinStandup(
        normalizedUserName,
        standupKey.trim(),
        passcode.trim() || undefined,
        avatarValue,
      );

      if (response.recoveryPasskey) {
        safeLocalStorage.set(
          getRecoveryPasskeyStorageKey(
            "standup",
            response.standup.key,
            normalizedUserName,
          ),
          response.recoveryPasskey,
        );
      }

      persistUserName(normalizedUserName);
      setScreen("standupRoom");
      navigateTo("standupRoom", { standupKey: response.standup.key });
    } catch (submitError) {
      if (
        submitError instanceof Error &&
        submitError.message === "PASSCODE_REQUIRED"
      ) {
        setError(
          passcode.trim()
            ? "Incorrect passcode. Ask the facilitator to confirm it."
            : "This standup requires a passcode. Ask the facilitator for it.",
        );
      } else if (
        submitError instanceof HttpError &&
        submitError.status === 409
      ) {
        setIsConflict(true);
      } else {
        setError(
          submitError instanceof Error
            ? submitError.message
            : "Unable to join this standup.",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecover = async () => {
    if (!recoveryPasskeyInput.trim() || !standupKey || !userName) return;
    setIsRecovering(true);
    setRecoveryError(null);
    try {
      const normalizedUserName = userName.trim();
      await recoverStandupSession(
        normalizedUserName,
        standupKey.trim(),
        recoveryPasskeyInput.trim().toUpperCase(),
      );
      setIsConflict(false);
      const response = await joinStandup(
        normalizedUserName,
        standupKey.trim(),
        passcode.trim() || undefined,
        avatarValue,
      );
      if (response.recoveryPasskey) {
        safeLocalStorage.set(
          getRecoveryPasskeyStorageKey(
            "standup",
            response.standup.key,
            normalizedUserName,
          ),
          response.recoveryPasskey,
        );
      }
      persistUserName(normalizedUserName);
      setScreen("standupRoom");
      navigateTo("standupRoom", { standupKey: response.standup.key });
    } catch (err) {
      setRecoveryError(
        err instanceof HttpError && err.status === 401
          ? "Invalid recovery passkey. Check it and try again."
          : "Recovery failed. Please try again.",
      );
    } finally {
      setIsRecovering(false);
    }
  };

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
                  onChange={(e) =>
                    setRecoveryPasskeyInput(e.target.value.toUpperCase())
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
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setScreen("standup");
                  navigateTo("standup");
                }}
              >
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
    </PageSection>
  );
}
