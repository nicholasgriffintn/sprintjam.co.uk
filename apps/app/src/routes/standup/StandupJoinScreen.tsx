import { useEffect, useMemo, useState, type FormEvent } from "react";
import { KeyRound, Lock, LogIn } from "lucide-react";

import { navigateTo } from "@/config/routes";
import { useSessionActions } from "@/context/SessionContext";
import { useWorkspaceData } from "@/hooks/useWorkspaceData";
import {
  getStoredUserAvatar,
  getStoredUserName,
  useUserPersistence,
} from "@/hooks/useUserPersistence";
import { joinStandup } from "@/lib/standup-api-service";
import { sanitiseAvatarValue } from "@/utils/avatars";
import {
  formatRoomKey,
  validateName,
  validatePasscode,
  validateRoomKey,
} from "@/utils/validators";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
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

    try {
      const response = await joinStandup(
        userName.trim(),
        standupKey.trim(),
        passcode.trim() || undefined,
        avatarValue,
      );

      setScreen("standupRoom");
      navigateTo("standupRoom", { standupKey: response.standup.key });
    } catch (submitError) {
      if (
        submitError instanceof Error &&
        submitError.message === "PASSCODE_REQUIRED"
      ) {
        setError("Passcode incorrect. Ask the facilitator to confirm it.");
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

  return (
    <PageSection maxWidth="md">
      <SurfaceCard className="space-y-6">
        <div className="space-y-2 text-left">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
            Join standup
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Enter your name and standup key to submit today&apos;s update.
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          {error ? <Alert variant="error">{error}</Alert> : null}

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
            helperText={nameValidation.ok ? undefined : nameValidation.error}
          />

          <Input
            id="standup-join-key"
            label="Standup key"
            value={standupKey}
            onChange={(event) => setStandupKey(formatRoomKey(event.target.value))}
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

          <div className="flex gap-3">
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
        </form>
      </SurfaceCard>
    </PageSection>
  );
}
