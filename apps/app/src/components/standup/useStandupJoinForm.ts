import { useEffect, useMemo, useState, type FormEvent } from "react";

import { getRecoveryPasskeyStorageKey } from "@/constants";
import { HttpError } from "@/lib/errors";
import { joinStandup, recoverStandupSession } from "@/lib/standup-api-service";
import { safeLocalStorage } from "@/utils/storage";
import { sanitiseAvatarValue } from "@/utils/avatars";
import {
  formatRoomKey,
  validateName,
  validatePasscode,
  validateRoomKey,
} from "@/utils/validators";
import { useAppNavigation } from "@/hooks/useAppNavigation";
import {
  getStoredUserAvatar,
  getStoredUserName,
  persistUserName,
  useUserPersistence,
} from "@/hooks/useUserPersistence";
import { useWorkspaceData } from "@/hooks/useWorkspaceData";

interface UseStandupJoinFormOptions {
  initialStandupKey?: string;
}

export function useStandupJoinForm({
  initialStandupKey,
}: UseStandupJoinFormOptions) {
  const { user } = useWorkspaceData();
  const navigateTo = useAppNavigation();
  const workspaceName = user?.name?.trim() ?? "";
  const workspaceAvatar = sanitiseAvatarValue(user?.avatar);
  const storedAvatar = useMemo(() => getStoredUserAvatar(), []);

  const [userName, setUserName] = useState(() =>
    validateName(workspaceName).ok ? workspaceName : getStoredUserName(),
  );
  const [standupKey, setStandupKey] = useState(() =>
    formatRoomKey(initialStandupKey ?? ""),
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

  const nameValidation = validateName(userName);
  const standupKeyValidation = validateRoomKey(standupKey);
  const passcodeValidation = validatePasscode(passcode);
  const isFormValid =
    nameValidation.ok && standupKeyValidation.ok && passcodeValidation.ok;
  const avatarValue = workspaceAvatar ?? storedAvatar ?? undefined;

  const storeRecoveryPasskey = (
    nextStandupKey: string,
    normalizedUserName: string,
    recoveryPasskey?: string,
  ) => {
    if (!recoveryPasskey) {
      return;
    }

    safeLocalStorage.set(
      getRecoveryPasskeyStorageKey(
        "standup",
        nextStandupKey,
        normalizedUserName,
      ),
      recoveryPasskey,
    );
  };

  const joinAndNavigate = async (normalizedUserName: string) => {
    const response = await joinStandup(
      normalizedUserName,
      standupKey.trim(),
      passcode.trim() || undefined,
      avatarValue,
    );

    storeRecoveryPasskey(
      response.standup.key,
      normalizedUserName,
      response.recoveryPasskey,
    );
    persistUserName(normalizedUserName);
    navigateTo("standupRoom", { standupKey: response.standup.key });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isFormValid) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setIsConflict(false);

    try {
      await joinAndNavigate(userName.trim());
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
    if (!recoveryPasskeyInput.trim() || !standupKey || !userName) {
      return;
    }

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
      await joinAndNavigate(normalizedUserName);
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

  return {
    error,
    handleRecover,
    handleSubmit,
    isConflict,
    isFormValid,
    isRecovering,
    isSubmitting,
    nameValidation,
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
    navigateBack: () => navigateTo("standup"),
  };
}
