import { useEffect, useMemo, useRef, useState } from 'react';

import type {
  RoomSettings,
  JudgeAlgorithm,
  VotingSequenceId,
  VotingSequenceTemplate,
  ExtraVoteOption,
} from '@/types';
import { VotingMode } from '@/components/RoomSettingsTabs/VotingMode';
import { EstimateOptions } from '@/components/RoomSettingsTabs/EstimateOptions';
import { TheJudge } from '@/components/RoomSettingsTabs/TheJudge';
import { PermissionsOptions } from '@/components/RoomSettingsTabs/PermissionsOptions';
import { ResultsOptions } from '@/components/RoomSettingsTabs/ResultsOptions';
import { BackgroundMusic } from '@/components/RoomSettingsTabs/BackgroundMusic';
import { TicketQueueSettings } from '@/components/RoomSettingsTabs/TicketQueueSettings';
import {
  cloneExtraVoteOptions,
  cloneVotingPresets,
  detectPresetId,
  mergeOptionsWithExtras,
  normalizeExtraVoteOptions,
  parseEstimateOptionsInput,
  splitExtrasFromOptions,
} from '@/utils/votingOptions';

type TabId = 'voting' | 'results' | 'queue' | 'atmosphere';

interface RoomSettingsTabsProps {
  initialSettings: RoomSettings;
  defaultSettings: RoomSettings;
  structuredVotingOptions: (string | number)[];
  votingPresets?: VotingSequenceTemplate[];
  extraVoteOptions?: ExtraVoteOption[];
  defaultSequenceId?: VotingSequenceId;
  onSettingsChange?: (settings: RoomSettings) => void;
  className?: string;
  isActive?: boolean;
  resetKey?: string | number;
}

export function RoomSettingsTabs({
  initialSettings,
  defaultSettings,
  structuredVotingOptions,
  votingPresets,
  extraVoteOptions,
  defaultSequenceId,
  onSettingsChange,
  className = '',
  isActive = true,
  resetKey = 0,
}: RoomSettingsTabsProps) {
  const structuredOptions = structuredVotingOptions ?? [];
  const presets = useMemo(() => {
    if (votingPresets?.length) {
      return cloneVotingPresets(votingPresets);
    }

    const baseOptions =
      initialSettings.customEstimateOptions?.length &&
      initialSettings.votingSequenceId === 'custom'
        ? initialSettings.customEstimateOptions
        : initialSettings.estimateOptions;

    const inferredId =
      initialSettings.votingSequenceId ??
      (baseOptions.length ? 'custom' : 'fibonacci-short');

    return [
      {
        id: inferredId as VotingSequenceId,
        label: 'Default',
        description: 'Default sequence from server',
        options: [...baseOptions],
      },
    ];
  }, [votingPresets, initialSettings]);

  const baseExtraOptions = useMemo(() => {
    if (extraVoteOptions?.length) {
      return cloneExtraVoteOptions(extraVoteOptions);
    }
    if (initialSettings.extraVoteOptions?.length) {
      return cloneExtraVoteOptions(initialSettings.extraVoteOptions);
    }
    if (defaultSettings.extraVoteOptions?.length) {
      return cloneExtraVoteOptions(defaultSettings.extraVoteOptions);
    }
    return [];
  }, [
    extraVoteOptions,
    initialSettings.extraVoteOptions,
    defaultSettings.extraVoteOptions,
  ]);

  const defaultSequence = (defaultSequenceId ??
    initialSettings.votingSequenceId ??
    presets[0]?.id ??
    'custom') as VotingSequenceId;

  const structuredBaseOptions = useMemo(() => {
    const fibPreset =
      presets.find((preset) => preset.id === 'fibonacci-short') ?? presets[0];
    return fibPreset ? [...fibPreset.options] : structuredOptions;
  }, [presets, structuredOptions]);

  const [localSettings, setLocalSettings] =
    useState<RoomSettings>(initialSettings);
  const [estimateOptionsInput, setEstimateOptionsInput] = useState<string>(
    initialSettings.estimateOptions.join(',')
  );
  const [selectedSequenceId, setSelectedSequenceId] =
    useState<VotingSequenceId>(defaultSequence);
  const [extraOptions, setExtraOptions] = useState<ExtraVoteOption[]>(() =>
    cloneExtraVoteOptions(baseExtraOptions)
  );
  const [activeTab, setActiveTab] = useState<TabId>('voting');
  const lastResetKeyRef = useRef<string | number | null>(null);

  const resolveBaseOptions = (
    sequenceId: VotingSequenceId,
    customInput = estimateOptionsInput,
    structuredVotingEnabled = localSettings.enableStructuredVoting
  ): (string | number)[] => {
    if (structuredVotingEnabled) {
      return structuredBaseOptions;
    }

    if (sequenceId === 'custom') {
      return parseEstimateOptionsInput(customInput);
    }

    const fallbackId = defaultSequenceId ?? defaultSequence;
    const preset =
      presets.find((template) => template.id === sequenceId) ??
      presets.find((template) => template.id === fallbackId);

    return preset
      ? [...preset.options]
      : parseEstimateOptionsInput(customInput);
  };

  const updateSettings = (updater: (prev: RoomSettings) => RoomSettings) => {
    setLocalSettings((prev) => {
      const next = updater(prev);
      onSettingsChange?.(next);
      return next;
    });
  };

  const updateEstimateOptions = (
    sequenceId: VotingSequenceId,
    extras: ExtraVoteOption[] = extraOptions,
    customInput = estimateOptionsInput,
    structuredVotingEnabled = localSettings.enableStructuredVoting
  ) => {
    const baseOptions = resolveBaseOptions(
      sequenceId,
      customInput,
      structuredVotingEnabled
    );
    const mergedExtras = cloneExtraVoteOptions(extras);
    const combined = mergeOptionsWithExtras(baseOptions, mergedExtras);
    updateSettings((prev) => ({
      ...prev,
      estimateOptions: combined,
      votingSequenceId: sequenceId,
      customEstimateOptions:
        sequenceId === 'custom' && !structuredVotingEnabled
          ? baseOptions
          : undefined,
      extraVoteOptions: mergedExtras,
    }));
  };

  useEffect(() => {
    if (!isActive) return;

    const resetChanged = lastResetKeyRef.current !== resetKey;
    if (!resetChanged) {
      return;
    }

    lastResetKeyRef.current = resetKey;

    const fallbackSequenceId =
      defaultSequenceId ??
      initialSettings.votingSequenceId ??
      (presets[0]?.id as VotingSequenceId) ??
      'custom';

    const { baseOptions, detectedExtras } = splitExtrasFromOptions(
      initialSettings.estimateOptions,
      baseExtraOptions
    );
    const normalizedExtras = normalizeExtraVoteOptions(
      initialSettings.extraVoteOptions,
      baseExtraOptions,
      detectedExtras
    );
    const sequenceId =
      initialSettings.enableStructuredVoting === true
        ? initialSettings.votingSequenceId ?? fallbackSequenceId
        : initialSettings.votingSequenceId ??
          detectPresetId(baseOptions, presets, fallbackSequenceId);
    const preset =
      sequenceId !== 'custom'
        ? presets.find((template) => template.id === sequenceId)
        : undefined;

    const baseForInput =
      initialSettings.enableStructuredVoting && structuredBaseOptions.length > 0
        ? structuredBaseOptions
        : sequenceId === 'custom'
        ? initialSettings.customEstimateOptions?.length
          ? initialSettings.customEstimateOptions
          : baseOptions
        : preset?.options ??
          (baseOptions.length
            ? baseOptions
            : presets.find((template) => template.id === fallbackSequenceId)
                ?.options ?? []);

    const combinedEstimateOptions = mergeOptionsWithExtras(
      baseForInput,
      normalizedExtras
    );

    setSelectedSequenceId(sequenceId as VotingSequenceId);
    setEstimateOptionsInput(baseForInput.join(','));
    setExtraOptions(normalizedExtras);
    setLocalSettings({
      ...initialSettings,
      estimateOptions: combinedEstimateOptions,
      votingSequenceId: sequenceId as VotingSequenceId,
      customEstimateOptions:
        sequenceId === 'custom' && !initialSettings.enableStructuredVoting
          ? [...baseForInput]
          : initialSettings.customEstimateOptions,
      extraVoteOptions: normalizedExtras,
    });

    if (resetChanged) {
      setActiveTab('voting');
    }
  }, [
    isActive,
    resetKey,
    initialSettings,
    presets,
    baseExtraOptions,
    structuredBaseOptions,
    defaultSequenceId,
  ]);

  useEffect(() => {
    onSettingsChange?.(localSettings);
  }, [localSettings, onSettingsChange]);

  const handleChange = (
    key: keyof RoomSettings,
    value:
      | boolean
      | (string | number)[]
      | JudgeAlgorithm
      | number
      | string
      | null
  ) => {
    if (key === 'enableStructuredVoting') {
      const structuredEnabled = value as boolean;
      if (structuredEnabled) {
        setSelectedSequenceId('fibonacci-short');
        setEstimateOptionsInput(structuredBaseOptions.join(','));
      }
      const baseOptions = resolveBaseOptions(
        structuredEnabled ? 'fibonacci-short' : selectedSequenceId,
        estimateOptionsInput,
        structuredEnabled
      );
      const combined = mergeOptionsWithExtras(baseOptions, extraOptions);
      const votingCriteria =
        structuredEnabled && defaultSettings.votingCriteria
          ? defaultSettings.votingCriteria.map((criterion) => ({
              ...criterion,
            }))
          : localSettings.votingCriteria;

      updateSettings((prev) => ({
        ...prev,
        enableStructuredVoting: structuredEnabled,
        estimateOptions: combined,
        votingCriteria,
        customEstimateOptions:
          selectedSequenceId === 'custom' && !structuredEnabled
            ? parseEstimateOptionsInput(estimateOptionsInput)
            : undefined,
        extraVoteOptions: extraOptions,
      }));
      return;
    }

    updateSettings((prev) => {
      const newSettings: RoomSettings = { ...prev, [key]: value };

      if (
        key === 'showAverage' ||
        key === 'showMedian' ||
        key === 'showTopVotes'
      ) {
        if (newSettings.resultsDisplay?.summaryCards) {
          newSettings.resultsDisplay = {
            ...newSettings.resultsDisplay,
            summaryCards: newSettings.resultsDisplay.summaryCards.map(
              (card) => {
                if (key === 'showAverage' && card.id === 'average') {
                  return { ...card, enabled: value as boolean };
                }
                if (key === 'showMedian' && card.id === 'mode') {
                  return { ...card, enabled: value as boolean };
                }
                if (key === 'showTopVotes' && card.id === 'topVotes') {
                  return { ...card, enabled: value as boolean };
                }
                return card;
              }
            ),
          };
        }
      }

      return newSettings;
    });
  };

  const handleEstimateOptionsChange = (value: string) => {
    setEstimateOptionsInput(value);
    setSelectedSequenceId('custom');
    updateEstimateOptions('custom', extraOptions, value, false);
  };

  const handleSelectSequence = (sequenceId: VotingSequenceId) => {
    const baseOptions = resolveBaseOptions(
      sequenceId,
      estimateOptionsInput,
      localSettings.enableStructuredVoting
    );

    setSelectedSequenceId(sequenceId);
    setEstimateOptionsInput(baseOptions.join(','));
    updateEstimateOptions(
      sequenceId,
      extraOptions,
      baseOptions.join(','),
      localSettings.enableStructuredVoting
    );
  };

  const handleToggleExtraOption = (id: string, enabled: boolean) => {
    const nextExtras = extraOptions.map((option) =>
      option.id === id ? { ...option, enabled } : option
    );
    setExtraOptions(nextExtras);
    updateEstimateOptions(
      selectedSequenceId,
      nextExtras,
      estimateOptionsInput,
      localSettings.enableStructuredVoting
    );
  };

  const tabs: { id: TabId; label: string; description: string }[] = [
    { id: 'voting', label: 'Voting', description: 'Mode & permissions' },
    {
      id: 'results',
      label: 'Results',
      description: 'Settings',
    },
    { id: 'queue', label: 'Ticket queue', description: 'Integrations' },
    { id: 'atmosphere', label: 'Atmosphere', description: 'Music' },
  ];

  const renderTabContent = () => {
    if (activeTab === 'voting') {
      return (
        <div className="space-y-6">
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
              defaultSequenceId ??
              initialSettings.votingSequenceId ??
              (presets[0]?.id as VotingSequenceId) ??
              'custom'
            }
            hideSelection={localSettings.enableStructuredVoting === true}
          />
          <PermissionsOptions
            localSettings={localSettings}
            handleChange={handleChange}
          />
        </div>
      );
    }

    if (activeTab === 'results') {
      return (
        <div className="space-y-6">
          <TheJudge localSettings={localSettings} handleChange={handleChange} />
          <ResultsOptions
            localSettings={localSettings}
            handleChange={handleChange}
          />
        </div>
      );
    }

    if (activeTab === 'queue') {
      return (
        <TicketQueueSettings
          localSettings={localSettings}
          handleChange={handleChange}
        />
      );
    }

    return (
      <BackgroundMusic
        localSettings={localSettings}
        handleChange={handleChange}
      />
    );
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex gap-2 overflow-x-auto rounded-2xl border border-white/60 bg-white/60 p-2 dark:border-white/10 dark:bg-slate-900/60">
        {tabs.map((tab) => {
          const isActiveTab = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex min-w-[140px] flex-none flex-col rounded-xl px-3 py-2 text-left transition ${
                isActiveTab
                  ? 'bg-white text-slate-900 shadow-sm ring-2 ring-brand-200 dark:bg-slate-800 dark:text-white dark:ring-brand-700/60'
                  : 'bg-transparent text-slate-600 hover:bg-white/70 dark:text-slate-300 dark:hover:bg-slate-800/70'
              }`}
            >
              <span className="text-sm font-semibold">{tab.label}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {tab.description}
              </span>
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-slate-900/60">
        {renderTabContent()}
      </div>
    </div>
  );
}
