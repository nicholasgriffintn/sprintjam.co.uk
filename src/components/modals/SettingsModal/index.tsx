import { useState, useEffect, useMemo, type FC } from "react";

import type {
  RoomSettings,
  JudgeAlgorithm,
  VotingSequenceId,
  VotingSequenceTemplate,
  ExtraVoteOption,
} from "@/types";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { VotingMode } from "./VotingMode";
import { EstimateOptions } from "./EstimateOptions";
import { TheJudge } from "./TheJudge";
import { OtherOptions } from "./OtherOptions";
import { BackgroundMusic } from "./BackgroundMusic";
import { TicketQueueSettings } from "./TicketQueueSettings";
import {
  cloneExtraVoteOptions,
  cloneVotingPresets,
  detectPresetId,
  mergeOptionsWithExtras,
  normalizeExtraVoteOptions,
  parseEstimateOptionsInput,
  splitExtrasFromOptions,
} from "@/utils/votingOptions";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: RoomSettings;
  onSaveSettings: (settings: RoomSettings) => void;
  defaultSettings: RoomSettings;
  structuredVotingOptions: (string | number)[];
  votingPresets?: VotingSequenceTemplate[];
  extraVoteOptions?: ExtraVoteOption[];
  defaultSequenceId?: VotingSequenceId;
}

const SettingsModal: FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  defaultSettings,
  structuredVotingOptions,
  votingPresets,
  extraVoteOptions,
  defaultSequenceId,
}) => {
  const structuredOptions = structuredVotingOptions ?? [];
  const [localSettings, setLocalSettings] = useState<RoomSettings>(settings);
  const [estimateOptionsInput, setEstimateOptionsInput] = useState<string>(
    settings.estimateOptions.join(","),
  );
  const presets = useMemo(() => {
    if (votingPresets?.length) {
      return cloneVotingPresets(votingPresets);
    }

    const baseOptions =
      settings.customEstimateOptions?.length &&
      settings.votingSequenceId === "custom"
        ? settings.customEstimateOptions
        : settings.estimateOptions;

    const inferredId =
      settings.votingSequenceId ??
      (baseOptions.length ? "custom" : "fibonacci-short");

    return [
      {
        id: inferredId as VotingSequenceId,
        label: "Default",
        description: "Default sequence from server",
        options: [...baseOptions],
      },
    ];
  }, [votingPresets, settings]);
  const defaultSequence = (
    defaultSequenceId ??
    settings.votingSequenceId ??
    presets[0]?.id ??
    "custom"
  ) as VotingSequenceId;
  const baseExtraOptions = useMemo(() => {
    if (extraVoteOptions?.length) {
      return cloneExtraVoteOptions(extraVoteOptions);
    }
    if (settings.extraVoteOptions?.length) {
      return cloneExtraVoteOptions(settings.extraVoteOptions);
    }
    if (defaultSettings.extraVoteOptions?.length) {
      return cloneExtraVoteOptions(defaultSettings.extraVoteOptions);
    }
    return [];
  }, [extraVoteOptions, settings.extraVoteOptions, defaultSettings.extraVoteOptions]);
  const [selectedSequenceId, setSelectedSequenceId] =
    useState<VotingSequenceId>(defaultSequence);
  const [extraOptions, setExtraOptions] = useState<ExtraVoteOption[]>(
    () => cloneExtraVoteOptions(baseExtraOptions),
  );

  const structuredBaseOptions = useMemo(() => {
    const fibPreset =
      presets.find((preset) => preset.id === "fibonacci-short") ?? presets[0];
    return fibPreset ? [...fibPreset.options] : structuredOptions;
  }, [presets, structuredOptions]);

  const resolveBaseOptions = (
    sequenceId: VotingSequenceId,
    customInput = estimateOptionsInput,
    structuredVotingEnabled = localSettings.enableStructuredVoting,
  ): (string | number)[] => {
    if (structuredVotingEnabled) {
      return structuredBaseOptions;
    }

    if (sequenceId === "custom") {
      return parseEstimateOptionsInput(customInput);
    }

    const fallbackId = defaultSequenceId ?? defaultSequence;
    const preset =
      presets.find((template) => template.id === sequenceId) ??
      presets.find((template) => template.id === fallbackId);

    return preset ? [...preset.options] : parseEstimateOptionsInput(customInput);
  };

  const updateEstimateOptions = (
    sequenceId: VotingSequenceId,
    extras: ExtraVoteOption[] = extraOptions,
    customInput = estimateOptionsInput,
    structuredVotingEnabled = localSettings.enableStructuredVoting,
  ) => {
    const baseOptions = resolveBaseOptions(
      sequenceId,
      customInput,
      structuredVotingEnabled,
    );
    const mergedExtras = cloneExtraVoteOptions(extras);
    const combined = mergeOptionsWithExtras(baseOptions, mergedExtras);
    setLocalSettings((prev) => ({
      ...prev,
      estimateOptions: combined,
      votingSequenceId: sequenceId,
      customEstimateOptions:
        sequenceId === "custom" && !structuredVotingEnabled
          ? baseOptions
          : undefined,
      extraVoteOptions: mergedExtras,
    }));
  };

  useEffect(() => {
    if (!isOpen) return;

    const fallbackSequenceId =
      (defaultSequenceId ??
        settings.votingSequenceId ??
        (presets[0]?.id as VotingSequenceId)) ?? "custom";

    const { baseOptions, detectedExtras } = splitExtrasFromOptions(
      settings.estimateOptions,
      baseExtraOptions,
    );
    const normalizedExtras = normalizeExtraVoteOptions(
      settings.extraVoteOptions,
      baseExtraOptions,
      detectedExtras,
    );
    const sequenceId =
      settings.enableStructuredVoting === true
        ? settings.votingSequenceId ?? fallbackSequenceId
        : settings.votingSequenceId ??
          detectPresetId(baseOptions, presets, fallbackSequenceId);
    const preset =
      sequenceId !== "custom"
        ? presets.find((template) => template.id === sequenceId)
        : undefined;

    const baseForInput =
      settings.enableStructuredVoting && structuredBaseOptions.length > 0
        ? structuredBaseOptions
        : sequenceId === "custom"
          ? settings.customEstimateOptions?.length
            ? settings.customEstimateOptions
            : baseOptions
          : preset?.options ??
            (baseOptions.length
              ? baseOptions
              : presets.find((template) => template.id === fallbackSequenceId)
                  ?.options ?? []);

    const combinedEstimateOptions = mergeOptionsWithExtras(
      baseForInput,
      normalizedExtras,
    );

    setSelectedSequenceId(sequenceId as VotingSequenceId);
    setEstimateOptionsInput(baseForInput.join(","));
    setExtraOptions(normalizedExtras);
    setLocalSettings({
      ...settings,
      estimateOptions: combinedEstimateOptions,
      votingSequenceId: sequenceId as VotingSequenceId,
      customEstimateOptions:
        sequenceId === "custom" && !settings.enableStructuredVoting
          ? [...baseForInput]
          : settings.customEstimateOptions,
      extraVoteOptions: normalizedExtras,
    });
  }, [
    isOpen,
    settings,
    presets,
    baseExtraOptions,
    structuredBaseOptions,
    defaultSequenceId,
  ]);

  const handleChange = (
    key: keyof RoomSettings,
    value:
      | boolean
      | (string | number)[]
      | JudgeAlgorithm
      | number
      | string
      | null,
  ) => {
    if (key === "enableStructuredVoting") {
      const structuredEnabled = value as boolean;
      if (structuredEnabled) {
        setSelectedSequenceId("fibonacci-short");
        setEstimateOptionsInput(structuredBaseOptions.join(","));
      }
      const baseOptions = resolveBaseOptions(
        structuredEnabled ? "fibonacci-short" : selectedSequenceId,
        estimateOptionsInput,
        structuredEnabled,
      );
      const combined = mergeOptionsWithExtras(baseOptions, extraOptions);
      const votingCriteria =
        structuredEnabled && defaultSettings.votingCriteria
          ? defaultSettings.votingCriteria.map((criterion) => ({
              ...criterion,
            }))
          : localSettings.votingCriteria;

      setLocalSettings((prev) => ({
        ...prev,
        enableStructuredVoting: structuredEnabled,
        estimateOptions: combined,
        votingCriteria,
        customEstimateOptions:
          selectedSequenceId === "custom" && !structuredEnabled
            ? parseEstimateOptionsInput(estimateOptionsInput)
            : undefined,
        extraVoteOptions: extraOptions,
      }));
      return;
    }

    setLocalSettings((prev) => {
      const newSettings: RoomSettings = { ...prev, [key]: value };

      if (
        key === "showAverage" ||
        key === "showMedian" ||
        key === "showTopVotes"
      ) {
        if (newSettings.resultsDisplay?.summaryCards) {
          newSettings.resultsDisplay = {
            ...newSettings.resultsDisplay,
            summaryCards: newSettings.resultsDisplay.summaryCards.map(
              (card) => {
                if (key === "showAverage" && card.id === "average") {
                  return { ...card, enabled: value as boolean };
                }
                if (key === "showMedian" && card.id === "mode") {
                  return { ...card, enabled: value as boolean };
                }
                if (key === "showTopVotes" && card.id === "topVotes") {
                  return { ...card, enabled: value as boolean };
                }
                return card;
              },
            ),
          };
        }
      }

      return newSettings;
    });
  };

  const handleEstimateOptionsChange = (value: string) => {
    setEstimateOptionsInput(value);
    setSelectedSequenceId("custom");
    updateEstimateOptions("custom", extraOptions, value, false);
  };

  const handleSelectSequence = (sequenceId: VotingSequenceId) => {
    const baseOptions = resolveBaseOptions(
      sequenceId,
      estimateOptionsInput,
      localSettings.enableStructuredVoting,
    );

    setSelectedSequenceId(sequenceId);
    setEstimateOptionsInput(baseOptions.join(","));
    updateEstimateOptions(
      sequenceId,
      extraOptions,
      baseOptions.join(","),
      localSettings.enableStructuredVoting,
    );
  };

  const handleToggleExtraOption = (id: string, enabled: boolean) => {
    const nextExtras = extraOptions.map((option) =>
      option.id === id ? { ...option, enabled } : option,
    );
    setExtraOptions(nextExtras);
    updateEstimateOptions(
      selectedSequenceId,
      nextExtras,
      estimateOptionsInput,
      localSettings.enableStructuredVoting,
    );
  };

  const handleSave = () => {
    onSaveSettings(localSettings);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Room Settings" size="md">
      <>
        <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-1">
          <VotingMode
            localSettings={localSettings}
            handleChange={handleChange}
          />

          <EstimateOptions
            localSettings={localSettings}
            defaultSettings={defaultSettings}
            structuredVotingOptions={structuredOptions}
            estimateOptionsInput={estimateOptionsInput}
            handleEstimateOptionsChange={handleEstimateOptionsChange}
            votingPresets={presets}
            selectedSequenceId={selectedSequenceId}
            onSelectSequence={handleSelectSequence}
            extraVoteOptions={extraOptions}
            onToggleExtraVote={handleToggleExtraOption}
            defaultSequenceId={
              (defaultSequenceId ??
                settings.votingSequenceId ??
                (presets[0]?.id as VotingSequenceId)) ?? "custom"
            }
            hideSelection={localSettings.enableStructuredVoting === true}
          />

          <TheJudge localSettings={localSettings} handleChange={handleChange} />

          <OtherOptions
            localSettings={localSettings}
            handleChange={handleChange}
          />

          <TicketQueueSettings
            localSettings={localSettings}
            handleChange={handleChange}
          />

          <BackgroundMusic
            localSettings={localSettings}
            handleChange={handleChange}
          />
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button onClick={onClose} variant="secondary" size="md">
            Cancel
          </Button>
          <Button onClick={handleSave} variant="primary" size="md">
            Save
          </Button>
        </div>
      </>
    </Modal>
  );
};

export default SettingsModal;
