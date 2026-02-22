import { useEffect, useRef, useState } from "react";
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
import { useRoomActions, useRoomState } from "@/context/RoomContext";
import { useWorkspaceData } from '@/hooks/useWorkspaceData';
import { PageSection } from "@/components/layout/PageBackground";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Footer } from "@/components/layout/Footer";
import { usePageMeta } from "@/hooks/usePageMeta";
import { META_CONFIGS } from "@/config/meta";
import { RoomSettingsTabs } from "@/components/RoomSettingsTabs";
import { validateName } from "@/utils/validators";

const CreateRoomScreen = () => {
  usePageMeta(META_CONFIGS.create);
  const { name, passcode } = useSessionState();
  const {
    setName,
    setPasscode,
    setSelectedAvatar,
    setRoomKey,
    setScreen,
    setJoinFlowMode,
  } = useSessionActions();
  const { clearError } = useSessionErrors();

  const { teams, isAuthenticated } = useWorkspaceData();

  const { serverDefaults } = useRoomState();
  const { setPendingCreateSettings } = useRoomActions();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const defaults = serverDefaults?.roomSettings;
  const structuredOptions = serverDefaults?.structuredVotingOptions ?? [];
  const votingPresets = serverDefaults?.votingSequences;
  const extraVoteOptions = serverDefaults?.extraVoteOptions;
  const [advancedSettings, setAdvancedSettings] = useState<RoomSettings | null>(
    defaults ?? null,
  );
  const advancedSettingsRef = useRef<RoomSettings | null>(defaults ?? null);
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

  useEffect(() => {
    if (defaults) {
      setAdvancedSettings(defaults);
      advancedSettingsRef.current = defaults;
      setSettingsResetKey((key) => key + 1);
      setVotingMode(
        defaults.enableStructuredVoting ? "structured" : "standard",
      );
      setSelectedSequenceId(defaults.votingSequenceId ?? "fibonacci-short");
    }
  }, [defaults]);

  const { selectedWorkspaceTeamId } = useSessionState();
  const { setSelectedWorkspaceTeamId } = useSessionActions();

  const handleTeamChange = (teamIdStr: string) => {
    const teamId = parseInt(teamIdStr, 10);
    if (!isNaN(teamId)) {
      setSelectedWorkspaceTeamId(teamId);
      // TODO: Apply team defaults
    } else {
      setSelectedWorkspaceTeamId(null);
    }
  };

  const canStart = validateName(name).ok;
  const advancedReady = Boolean(advancedSettings && defaults);

  const handleStartFlow = (settings?: Partial<RoomSettings> | null) => {
    if (!canStart) return;

    clearError();
    setPendingCreateSettings(settings ?? null);
    setJoinFlowMode("create");
    setSelectedAvatar(null);
    setRoomKey("");
    setScreen("join");
  };

  const buildQuickSettings = (): Partial<RoomSettings> | null => {
    if (!defaults) return null;

    const preset = votingPresets?.find((p) => p.id === selectedSequenceId);
    const estimateOptions = preset?.options ?? defaults.estimateOptions;

    return {
      enableStructuredVoting: votingMode === "structured",
      votingSequenceId: selectedSequenceId,
      estimateOptions,
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
                  value={selectedWorkspaceTeamId?.toString() ?? 'none'}
                  onValueChange={handleTeamChange}
                  options={[
                    { label: 'Personal Room (No Team)', value: 'none' },
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
                  <Button
                    type="button"
                    variant="unstyled"
                    role="switch"
                    aria-checked={votingMode === 'structured'}
                    id="voting-mode"
                    onClick={() =>
                      setVotingMode(
                        votingMode === 'structured' ? 'standard' : 'structured',
                      )
                    }
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 justify-start rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:ring-brand-500 ${
                      votingMode === 'structured'
                        ? 'bg-brand-600 dark:bg-brand-500'
                        : 'bg-slate-200 dark:bg-slate-700'
                    }`}
                    data-testid="create-voting-mode"
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        votingMode === 'structured'
                          ? 'translate-x-5'
                          : 'translate-x-0'
                      }`}
                    />
                  </Button>
                </div>
              </div>

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
                  disabled={votingMode === 'structured'}
                  data-testid="create-estimate-sequence"
                  options={votingPresetOptions}
                />
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {votingMode === 'structured'
                    ? '(Always uses the default option for structured voting)'
                    : (() => {
                        const preset = votingPresets?.find(
                          (p) => p.id === selectedSequenceId,
                        );
                        return preset?.options
                          ? `Cards: ${preset.options.join(', ')}`
                          : 'Choose your estimation scale';
                      })()}
                </p>
              </div>
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
                    disabled={!canStart}
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

                {advancedReady ? (
                  <RoomSettingsTabs
                    initialSettings={advancedSettings as RoomSettings}
                    defaultSettings={defaults as RoomSettings}
                    structuredVotingOptions={structuredOptions}
                    votingPresets={votingPresets}
                    extraVoteOptions={extraVoteOptions}
                    defaultSequenceId={defaults?.votingSequenceId}
                    onSettingsChange={(updated) => {
                      advancedSettingsRef.current = updated;
                    }}
                    resetKey={settingsResetKey}
                    hideVotingModeAndEstimates={true}
                    isCreating={true}
                  />
                ) : (
                  <div className="rounded-2xl border border-slate-200/60 bg-white/70 p-4 text-sm text-slate-600 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-300">
                    Loading default settings…
                  </div>
                )}

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
                    disabled={!canStart || !advancedReady}
                    className="sm:flex-1"
                    data-testid="create-advanced-continue"
                    fullWidth
                  >
                    Continue with settings
                  </Button>
                </div>
              </div>
            )}
          </div>
        </SurfaceCard>

        <p className="text-center text-sm text-slate-500 dark:text-slate-400">
          After creation you’ll step straight to choosing your avatar and join
          as moderator.
        </p>
      </motion.div>
      <Footer displayRepoLink={false} />
    </PageSection>
  );
};

export default CreateRoomScreen;
