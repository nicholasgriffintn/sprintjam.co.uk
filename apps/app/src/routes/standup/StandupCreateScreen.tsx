import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Building2, Lock, Plus } from "lucide-react";
import { motion } from "framer-motion";

import { navigateTo } from "@/config/routes";
import { useSessionActions } from "@/context/SessionContext";
import { useWorkspaceData } from "@/hooks/useWorkspaceData";
import {
  getStoredUserAvatar,
  getStoredUserName,
  useUserPersistence,
} from "@/hooks/useUserPersistence";
import { sanitiseAvatarValue } from "@/utils/avatars";
import { validateName, validatePasscode } from "@/utils/validators";
import { createStandup } from "@/lib/standup-api-service";
import { createTeamSession } from "@/lib/workspace-service";
import { setStandupNotice } from "@/lib/standup-notice";
import { getRecoveryPasskeyStorageKey } from "@/constants";
import { safeLocalStorage } from "@/utils/storage";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { PageSection } from "@/components/layout/PageBackground";

function buildStandupSessionName(): string {
  return `Standup ${new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date())}`;
}

export default function StandupCreateScreen() {
  const { setScreen } = useSessionActions();
  const { user, teams, selectedTeamId, setSelectedTeamId, isAuthenticated } =
    useWorkspaceData();
  const storedAvatar = useMemo(() => getStoredUserAvatar(), []);
  const workspaceName = user?.name?.trim() ?? "";
  const workspaceAvatar = sanitiseAvatarValue(user?.avatar);
  const [userName, setUserName] = useState(() =>
    validateName(workspaceName).ok ? workspaceName : getStoredUserName(),
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

  const selectedTeam = teams.find((team) => team.id === selectedTeamId) ?? null;
  const nameValidation = validateName(userName);
  const passcodeValidation = validatePasscode(passcode);
  const isFormValid = nameValidation.ok && passcodeValidation.ok;
  const avatarValue = workspaceAvatar ?? storedAvatar ?? undefined;
  const teamIdForCreate = selectedTeam?.canAccess ? selectedTeam.id : undefined;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isFormValid) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await createStandup(
        userName.trim(),
        passcode.trim() || undefined,
        avatarValue,
        teamIdForCreate,
      );

      if (teamIdForCreate) {
        try {
          await createTeamSession(
            teamIdForCreate,
            buildStandupSessionName(),
            response.standup.key,
            { type: "standup" },
          );
        } catch (workspaceError) {
          const warning =
            workspaceError instanceof Error
              ? `${workspaceError.message} The standup room is live, but it was not linked into workspace history.`
              : "The standup room is live, but it was not linked into workspace history.";
          setStandupNotice(response.standup.key, warning);
        }
      }

      if (response.recoveryPasskey) {
        safeLocalStorage.set(
          getRecoveryPasskeyStorageKey(
            "standup",
            response.standup.key,
            userName.trim(),
          ),
          response.recoveryPasskey,
        );
      }

      setScreen("standupRoom");
      navigateTo("standupRoom", { standupKey: response.standup.key });
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to create this standup.",
      );
    } finally {
      setIsSubmitting(false);
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
              Create standup
            </h1>
            <p className="text-base text-slate-600 dark:text-slate-300">
              Start a fresh standup room for today. And share with your team.
            </p>
          </div>
        </div>

        <SurfaceCard className="space-y-6">
          <motion.form
            onSubmit={handleSubmit}
            className="space-y-8"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {error && <Alert variant="error">{error}</Alert>}

            <div className="space-y-6">
              <Input
                id="standup-create-name"
                label="Your name"
                value={userName}
                onChange={(event) => setUserName(event.target.value)}
                placeholder="Facilitator name"
                fullWidth
                required
                showValidation
                isValid={nameValidation.ok}
                helperText={
                  nameValidation.ok ? undefined : nameValidation.error
                }
              />

              <Input
                id="standup-create-passcode"
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
                placeholder="Add a passcode for today's room"
                fullWidth
                icon={<Lock className="h-4 w-4" />}
                helperText={
                  passcodeValidation.ok ? undefined : passcodeValidation.error
                }
              />

              {isAuthenticated && teams.length > 0 ? (
                <div className="space-y-2">
                  <label
                    htmlFor="standup-team-select"
                    className="text-sm font-semibold text-slate-700 dark:text-slate-200"
                  >
                    Workspace team
                  </label>
                  <Select
                    id="standup-team-select"
                    value={selectedTeamId ? String(selectedTeamId) : "none"}
                    onValueChange={(value) => {
                      if (value === "none") {
                        setSelectedTeamId(null);
                        return;
                      }

                      const parsed = Number.parseInt(value, 10);
                      if (!Number.isNaN(parsed)) {
                        setSelectedTeamId(parsed);
                      }
                    }}
                    options={[
                      { label: "Personal standup (no team)", value: "none" },
                      ...teams.map((team) => ({
                        label: team.canAccess
                          ? team.name
                          : team.currentUserStatus === "pending"
                            ? `${team.name} (Access pending)`
                            : `${team.name} (Restricted)`,
                        value: String(team.id),
                      })),
                    ]}
                  />
                  <div className="flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <Building2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>
                      {selectedTeam
                        ? selectedTeam.canAccess
                          ? "Workspace mode saves this standup to team history and unlocks ticket linking."
                          : "You need team access before saving standups into this workspace team."
                        : "Leave this as personal if you only need a standalone standup room."}
                    </span>
                  </div>
                </div>
              ) : null}
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
                icon={<Plus className="h-4 w-4" />}
              >
                Create standup
              </Button>
            </div>
          </motion.form>
        </SurfaceCard>

        <p className="text-center text-sm text-slate-500 dark:text-slate-400">
          After creating the standup, share the room key with your team so they
          can join in.
        </p>
      </motion.div>
    </PageSection>
  );
}
