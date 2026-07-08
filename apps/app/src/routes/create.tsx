import { useEffect, useRef, useState } from "react";
import { useAppNavigation } from "@/hooks/useAppNavigation";
import { SELECTED_TEAM_STORAGE_KEY } from "@/constants";
import { safeLocalStorage } from "@/utils/storage";
import type { ChangeEvent } from "react";
import { motion } from "framer-motion";
import { Settings, Sparkles } from "lucide-react";
import type { VotingSequenceId } from "@sprintjam/types";

import type { RoomSettings } from "@/types";
import {
  useSessionActions,
  useSessionErrors,
  useSessionState,
} from "@/context/SessionContext";
import {
  useRoomActions,
  useRoomState,
  useRoomStatus,
} from "@/context/RoomContext";
import { useWorkspaceData } from "@/hooks/useWorkspaceData";
import { getTeamSettings } from "@/lib/workspace-service";
import { PageSection } from "@/components/layout/PageBackground";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Footer } from "@/components/layout/Footer";
import { RoomSettingsTabs } from "@/components/RoomSettingsTabs";
import { StructuredFieldOptions } from "@/components/RoomSettingsTabs/StructuredFieldOptions";
import { sanitiseAvatarValue } from "@/utils/avatars";
import { validateName } from "@/utils/validators";
import { createMeta } from "@/utils/route-meta";
import { getDefaultVotingCriteria } from "@sprintjam/utils";

export const meta = createMeta("create");

const CreateRoomRoute = () => {
  const navigateTo = useAppNavigation();
  const { name, passcode } = useSessionState();
  const { setName, setPasscode, setRoomKey, setJoinFlowMode } =
    useSessionActions();
  const { clearError } = useSessionErrors();

  const { teams, isAuthenticated, user } = useWorkspaceData();

  const { serverDefaults } = useRoomState();
  const { setPendingCreateSettings, handleCreateRoom } = useRoomActions();
  const { isLoading } = useRoomStatus();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const defaults = serverDefaults.roomSettings;
  const structuredOptions = serverDefaults.structuredVotingOptions;
  const votingPresets = serverDefaults.votingSequences;
  const extraVoteOptions = serverDefaults.extraVoteOptions;
  const [advancedSettings, setAdvancedSettings] =
    useState<RoomSettings>(defaults);
  const advancedSettingsRef = useRef<RoomSettings>(defaults);
  const [settingsResetKey, setSettingsResetKey] = useState(0);
  const [votingMode, setVotingMode] = useState<"standard" | "structured">(
    "standard",
  );
  const [selectedSequenceId, setSelectedSequenceId] =
    useState<VotingSequenceId>("fibonacci-short");
  const votingPresetOptions =
    votingPresets?.map((preset) => ({
      label: preset.label,
      value: preset.id,
    })) ?? [];

  const { selectedWorkspaceTeamId } = useSessionState();
  const { setSelectedWorkspaceTeamId } = useSessionActions();
  const selectedWorkspaceTeam =
    teams.find((team) => team.id === selectedWorkspaceTeamId) ?? null;
  const workspaceName = user?.name?.trim() ?? "";
  const workspaceAvatar = sanitiseAvatarValue(user?.avatar);
  const hasWorkspaceName = validateName(workspaceName).ok;
  const hasWorkspaceAvatar = Boolean(workspaceAvatar);
  const effectiveName = hasWorkspaceName ? workspaceName : name;
  const canBypassIdentityStep =
    isAuthenticated && hasWorkspaceAvatar && validateName(effectiveName).ok;

  const applySettings = (settings: RoomSettings) => {
    setAdvancedSettings(settings);
    advancedSettingsRef.current = settings;
    setSettingsResetKey((key) => key + 1);
    setVotingMode(settings.enableStructuredVoting ? "structured" : "standard");
    setSelectedSequenceId(settings.votingSequenceId ?? "fibonacci-short");
  };

  useEffect(() => {
    if (!selectedWorkspaceTeamId) {
      applySettings(defaults);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaults]);

  // Preload team settings when the selected team changes
  useEffect(() => {
    if (!selectedWorkspaceTeamId) {
      applySettings(defaults);
      return;
    }

    if (!selectedWorkspaceTeam) {
      applySettings(defaults);
      return;
    }

    getTeamSettings(selectedWorkspaceTeam.slug)
      .then((teamSettings) => {
        applySettings(
          teamSettings ? { ...defaults, ...teamSettings } : defaults,
        );
      })
      .catch((error) => {
        console.error("Failed to load team settings", error);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWorkspaceTeam, selectedWorkspaceTeamId]);

  const teamPreloadDone = useRef(false);
  useEffect(() => {
    if (teamPreloadDone.current || teams.length === 0) return;
    teamPreloadDone.current = true;

    if (selectedWorkspaceTeamId !== null) return;

    const stored = safeLocalStorage.get(SELECTED_TEAM_STORAGE_KEY);
    if (stored) {
      const teamId = parseInt(stored, 10);
      if (!isNaN(teamId) && teams.some((t) => t.id === teamId)) {
        setSelectedWorkspaceTeamId(teamId);
        return;
      }
    }

    const firstTeam = teams[0];
    if (firstTeam) {
      setSelectedWorkspaceTeamId(firstTeam.id);
    }
  }, [teams, selectedWorkspaceTeamId, setSelectedWorkspaceTeamId]);

  const handleTeamChange = (teamIdStr: string) => {
    const teamId = parseInt(teamIdStr, 10);
    if (!isNaN(teamId)) {
      setSelectedWorkspaceTeamId(teamId);
      safeLocalStorage.set(SELECTED_TEAM_STORAGE_KEY, teamIdStr);
    } else {
      setSelectedWorkspaceTeamId(null);
      safeLocalStorage.remove(SELECTED_TEAM_STORAGE_KEY);
    }
  };

  const getStructuredVotingCriteria = () => {
    if (advancedSettings.votingCriteria?.length) {
      return advancedSettings.votingCriteria;
    }

    if (defaults.votingCriteria?.length) {
      return defaults.votingCriteria;
    }

    return getDefaultVotingCriteria();
  };

  const handleVotingCriteriaChange = (
    votingCriteria: RoomSettings["votingCriteria"],
  ) => {
    setAdvancedSettings((current) => {
      const updated = { ...current, votingCriteria };
      advancedSettingsRef.current = updated;
      return updated;
    });
  };

  const canStart = validateName(effectiveName).ok;
  const handleStartFlow = (settings?: Partial<RoomSettings> | null) => {
    if (!canStart) return;

    clearError();

    if (canBypassIdentityStep) {
      void handleCreateRoom(settings ?? undefined);
      return;
    }

    setPendingCreateSettings(settings ?? null);
    setJoinFlowMode("create");
    setRoomKey("");
    navigateTo("join");
  };

  const buildQuickSettings = (): Partial<RoomSettings> => {
    const preset = votingPresets?.find((p) => p.id === selectedSequenceId);
    const estimateOptions = preset?.options ?? defaults.estimateOptions;
    const votingCriteria =
      votingMode === "structured"
        ? getStructuredVotingCriteria()
        : advancedSettings.votingCriteria;

    return {
      ...advancedSettings,
      enableStructuredVoting: votingMode === "structured",
      votingSequenceId: selectedSequenceId,
      estimateOptions,
      votingCriteria,
    };
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
            <p className="text-sm uppercase tracking-[0.35em] text-brand-500">
              Step 1/2
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">
              Create Room
            </h1>
            <p className="text-base text-slate-600 dark:text-slate-300">
              Use the instant defaults or tune settings before creating your
              room.
            </p>
          </div>
        </div>

        <SurfaceCard>
          <div className="space-y-6">
            {(!isAuthenticated || !hasWorkspaceName) && (
              <Input
                id="create-name"
                label="Your name"
                type="text"
                value={name}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setName(e.target.value)
                }
                placeholder="Moderator name"
                required
                fullWidth
                showValidation
                isValid={validateName(name).ok}
              />
            )}

            <Input
              id="create-passcode"
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
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setPasscode(e.target.value)
              }
              placeholder="Add a passcode for extra security"
              fullWidth
            />

            {isAuthenticated && teams.length > 0 && (
              <div>
                <label
                  htmlFor="team-select"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  Workspace Team
                </label>
                <Select
                  id="team-select"
                  value={selectedWorkspaceTeamId?.toString() ?? "none"}
                  onValueChange={handleTeamChange}
                  options={[
                    { label: "Personal Room (No Team)", value: "none" },
                    ...teams.map((t) => ({
                      label: t.name,
                      value: t.id.toString(),
                    })),
                  ]}
                />
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Select a team to track sessions in your workspace.
                </p>
              </div>
            )}

            <div className="space-y-4 rounded-2xl border border-slate-200/60 bg-white/50 p-4 dark:border-white/10 dark:bg-slate-900/40">
              <div>
                <div className="flex items-center justify-between">
                  <div>
                    <label
                      htmlFor="voting-mode"
                      className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                    >
                      Enable Structured Voting
                    </label>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Multi-criteria voting with automatic story points
                    </p>
                  </div>
                  <Switch
                    id="voting-mode"
                    checked={votingMode === "structured"}
                    onCheckedChange={(checked) =>
                      setVotingMode(checked ? "structured" : "standard")
                    }
                    data-testid="create-voting-mode"
                  />
                </div>
              </div>

              {votingMode === "structured" ? (
                <StructuredFieldOptions
                  votingCriteria={getStructuredVotingCriteria()}
                  onVotingCriteriaChange={handleVotingCriteriaChange}
                />
              ) : (
                <div>
                  <label
                    htmlFor="estimate-sequence"
                    className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                  >
                    Estimate options
                  </label>
                  <Select
                    id="estimate-sequence"
                    value={selectedSequenceId}
                    onValueChange={(value) =>
                      setSelectedSequenceId(value as VotingSequenceId)
                    }
                    data-testid="create-estimate-sequence"
                    options={votingPresetOptions}
                  />
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {(() => {
                      const preset = votingPresets?.find(
                        (p) => p.id === selectedSequenceId,
                      );
                      return preset?.options
                        ? `Cards: ${preset.options.join(", ")}`
                        : "Choose your estimation scale";
                    })()}
                  </p>
                </div>
              )}
            </div>

            {!showAdvanced ? (
              <>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowAdvanced(true)}
                    className="sm:w-auto sm:flex-shrink-0"
                    icon={<Settings className="h-4 w-4" />}
                    data-testid="create-room-advanced"
                    fullWidth
                  >
                    Advanced setup
                  </Button>
                  <Button
                    type="button"
                    onClick={() => handleStartFlow(buildQuickSettings())}
                    disabled={!canStart || isLoading}
                    isLoading={isLoading}
                    className="sm:flex-1"
                    icon={<Sparkles className="h-4 w-4" />}
                    data-testid="create-room-submit"
                    fullWidth
                  >
                    Create room
                  </Button>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    Advanced room settings
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Configure cards, voting mode, integrations, and more.
                  </p>
                </div>

                <RoomSettingsTabs
                  initialSettings={advancedSettings}
                  defaultSettings={defaults}
                  structuredVotingOptions={structuredOptions}
                  votingPresets={votingPresets}
                  extraVoteOptions={extraVoteOptions}
                  defaultSequenceId={defaults.votingSequenceId}
                  onSettingsChange={(updated) => {
                    advancedSettingsRef.current = updated;
                  }}
                  resetKey={settingsResetKey}
                  hideVotingModeAndEstimates={true}
                  isCreating={true}
                />

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowAdvanced(false)}
                    className="sm:w-auto sm:flex-shrink-0"
                    data-testid="create-advanced-back"
                    fullWidth
                  >
                    Back
                  </Button>
                  <Button
                    type="button"
                    onClick={() => handleStartFlow(advancedSettingsRef.current)}
                    disabled={!canStart || isLoading}
                    isLoading={isLoading}
                    className="sm:flex-1"
                    data-testid="create-advanced-continue"
                    fullWidth
                  >
                    {isAuthenticated ? "Create room" : "Continue with settings"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </SurfaceCard>

        <p className="text-center text-sm text-slate-500 dark:text-slate-400">
          {canBypassIdentityStep
            ? "Your signed-in profile is used automatically."
            : "After creation you’ll step straight to choosing your avatar and join as moderator."}
        </p>
      </motion.div>
      <Footer displayRepoLink={false} />
    </PageSection>
  );
};

export default CreateRoomRoute;
