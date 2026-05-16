import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ArrowRight, Building2, Lock } from "lucide-react";
import type { RetroSettings } from "@sprintjam/types";
import { DEFAULT_RETRO_SETTINGS } from "@sprintjam/types";
import { normaliseRetroSettings } from "@sprintjam/utils";
import { motion } from "framer-motion";

import { useAppNavigation } from "@/hooks/useAppNavigation";
import { useWorkspaceData } from "@/hooks/useWorkspaceData";
import {
  getStoredUserAvatar,
  getStoredUserName,
  persistUserName,
  useUserPersistence,
} from "@/hooks/useUserPersistence";
import { createRetro } from "@/lib/retro-api-service";
import { getTeamRetroSettings } from "@/lib/workspace-service";
import { sanitiseAvatarValue } from "@/utils/avatars";
import { validateName, validatePasscode } from "@/utils/validators";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { PageSection } from "@/components/layout/PageBackground";
import { Footer } from "@/components/layout/Footer";
import { BetaBadge } from "@/components/BetaBadge";
import { RetroTemplateSelect } from "./RetroTemplateSelect";
import { useWorkspaceRetroSession } from "./useWorkspaceRetroSession";

export function RetroCreateScreen() {
  const navigateTo = useAppNavigation();
  const { user, teams, selectedTeamId, setSelectedTeamId, isAuthenticated } =
    useWorkspaceData();
  const storedAvatar = useMemo(() => getStoredUserAvatar(), []);
  const workspaceName = user?.name?.trim() ?? "";
  const workspaceAvatar = sanitiseAvatarValue(user?.avatar);
  const [userName, setUserName] = useState(() =>
    validateName(workspaceName).ok ? workspaceName : getStoredUserName(),
  );
  const [passcode, setPasscode] = useState("");
  const [settings, setSettings] = useState<RetroSettings>(
    DEFAULT_RETRO_SETTINGS,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accessibleTeams = teams.filter((team) => team.canAccess);
  const selectedTeam =
    accessibleTeams.find((team) => team.id === selectedTeamId) ?? null;
  const ensureWorkspaceRetroSession = useWorkspaceRetroSession(
    selectedTeam ? { id: selectedTeam.id, slug: selectedTeam.slug } : undefined,
  );
  const avatarValue = workspaceAvatar ?? storedAvatar ?? undefined;

  useUserPersistence({ name: userName, avatar: storedAvatar });

  useEffect(() => {
    if (!selectedTeam?.slug) {
      setSettings(DEFAULT_RETRO_SETTINGS);
      return;
    }
    let cancelled = false;
    getTeamRetroSettings(selectedTeam.slug)
      .then((teamSettings) => {
        if (!cancelled) {
          setSettings(normaliseRetroSettings(teamSettings));
        }
      })
      .catch((loadError) => {
        console.error("Failed to load retro settings", loadError);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedTeam?.slug]);

  const nameValidation = validateName(userName);
  const passcodeValidation = validatePasscode(passcode);
  const isFormValid = nameValidation.ok && passcodeValidation.ok;

  const updateSettings = (patch: Partial<RetroSettings>) => {
    setSettings((current) => normaliseRetroSettings(current, patch));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isFormValid) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const normalizedName = userName.trim();
      const response = await createRetro(
        normalizedName,
        passcode.trim() || undefined,
        settings,
        avatarValue,
      );

      try {
        await ensureWorkspaceRetroSession(
          response.retro.key,
          response.retro.template,
        );
      } catch (linkError) {
        console.warn("Retro created without workspace session link", {
          linkError,
        });
        toast.error(
          "The retro is live, but it was not linked into workspace history.",
        );
      }

      persistUserName(normalizedName);
      navigateTo("retroRoom", { retroKey: response.retro.key });
    } catch (submitError) {
      setIsSubmitting(false);
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to create this retro.",
      );
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
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm uppercase tracking-[0.35em] text-brand-500">
              Retros
            </p>
            <BetaBadge />
          </div>
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">
            Create Retro
          </h1>
          <p className="text-base text-slate-600 dark:text-slate-300">
            Pick a template, link a team, and use the saved retro defaults from
            workspace settings.
          </p>
        </div>

        <SurfaceCard>
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              id="retro-create-name"
              label="Your name"
              value={userName}
              onChange={(event) => setUserName(event.target.value)}
              error={nameValidation.ok ? undefined : nameValidation.error}
              fullWidth
            />
            <Input
              id="retro-create-passcode"
              label={
                <span className="flex items-center gap-2">
                  Passcode
                  <span className="text-xs font-normal text-slate-400">
                    optional
                  </span>
                </span>
              }
              type="password"
              value={passcode}
              onChange={(event) => setPasscode(event.target.value)}
              error={
                passcodeValidation.ok ? undefined : passcodeValidation.error
              }
              placeholder="Add a passcode for extra security"
              icon={<Lock className="h-4 w-4" />}
              fullWidth
            />
            {isAuthenticated && accessibleTeams.length > 0 ? (
              <div>
                <label
                  htmlFor="retro-team-select"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  Workspace team
                </label>
                <Select
                  id="retro-team-select"
                  value={selectedTeam ? String(selectedTeam.id) : "none"}
                  onValueChange={(value) =>
                    setSelectedTeamId(
                      value && value !== "none" ? Number(value) : null,
                    )
                  }
                  options={[
                    { label: "Do not link", value: "none" },
                    ...accessibleTeams.map((team) => ({
                      label: team.name,
                      value: String(team.id),
                    })),
                  ]}
                />
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Select a team to save this retro in workspace history.
                </p>
              </div>
            ) : null}
            <RetroTemplateSelect
              value={settings.templateId}
              onValueChange={(templateId) => updateSettings({ templateId })}
            />
            {selectedTeam?.slug ? (
              <p className="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-4 text-sm text-slate-600 dark:border-white/10 dark:bg-slate-900/50 dark:text-slate-300">
                Votes, timer, phase control, and anonymity are managed from the
                team&apos;s Retros Settings.
              </p>
            ) : null}
            {error ? <Alert variant="warning">{error}</Alert> : null}
            <Button
              type="submit"
              fullWidth
              isLoading={isSubmitting}
              disabled={!isFormValid || isSubmitting}
              icon={selectedTeam?.slug ? <Building2 /> : <ArrowRight />}
            >
              Create retro
            </Button>
          </form>
        </SurfaceCard>
      </motion.div>
      <Footer displayRepoLink={false} />
    </PageSection>
  );
}
