import type {
  ExtraVoteOption,
  PasscodeHashPayload,
  RoomData,
  RoomSettings,
  VotingSequenceTemplate,
} from '@sprintjam/types';
import { JudgeAlgorithm } from '@sprintjam/types';

import { STRUCTURED_VOTING_OPTIONS } from './config/constants';
import {
  DEFAULT_EXTRA_VOTE_OPTIONS,
  DEFAULT_VOTING_SEQUENCE_ID,
  VOTING_SEQUENCE_TEMPLATES,
} from './config/voting';
import { generateVoteOptionsMetadata } from './votes';
import { getDefaultVotingCriteria } from './structured-voting';

const DEFAULT_RESULTS_DISPLAY = {
  showVoteDistribution: true,
  voteDistributionLabel: 'Vote Distribution',
  criteriaBreakdown: {
    enabled: true,
    title: 'Criteria Breakdown',
    consensusLabels: {
      high: 'Consensus',
      medium: 'Some Split',
      low: 'Wide Split',
    },
  },
};

const DEFAULT_STRUCTURED_DISPLAY = {
  panelTitle: 'Structured Estimation',
  infoToggle: {
    enabled: true,
    label: 'Scoring Info',
    title: 'Weighted Scoring System',
    rangesDescription: '1pt: 0-34% | 3pt: 35-49% | 5pt: 50-79% | 8pt: 80%+',
    rangesLabel: 'Story Point Ranges:',
    showRangeDetails: true,
    showContributionDetails: true,
    showConversionRules: true,
  },
  summary: {
    storyPointsLabel: 'Story Points',
    weightedScoreLabel: 'Weighted score',
    showConversionCount: true,
  },
};

function cloneVotingTemplates(): VotingSequenceTemplate[] {
  return VOTING_SEQUENCE_TEMPLATES.map((template) => ({
    ...template,
    options: [...template.options],
  }));
}

export function getVotingTemplates(): VotingSequenceTemplate[] {
  return cloneVotingTemplates();
}

function cloneExtraVoteOptions(
  options: ReadonlyArray<ExtraVoteOption> = DEFAULT_EXTRA_VOTE_OPTIONS
): ExtraVoteOption[] {
  return options.map((option) => ({
    ...option,
    enabled: option.enabled ?? true,
    aliases: option.aliases ? [...option.aliases] : undefined,
  }));
}

export function getDefaultExtraVoteOptions(): ExtraVoteOption[] {
  return cloneExtraVoteOptions();
}

function findMatchingExtra(
  option: string | number,
  extras: ReadonlyArray<ExtraVoteOption>
): ExtraVoteOption | undefined {
  const stringValue = String(option);
  return extras.find(
    (extra) =>
      extra.value === option ||
      extra.value === stringValue ||
      extra.aliases?.includes(stringValue)
  );
}

function splitExtrasFromOptions(
  options: (string | number)[] | undefined,
  extras: ReadonlyArray<ExtraVoteOption>
): { baseOptions: (string | number)[]; detectedExtras: Set<string> } {
  const baseOptions: (string | number)[] = [];
  const detectedExtras = new Set<string>();

  for (const option of options ?? []) {
    const match = findMatchingExtra(option, extras);
    if (match) {
      detectedExtras.add(match.id);
    } else {
      baseOptions.push(option);
    }
  }

  return { baseOptions, detectedExtras };
}

function normalizeExtraVoteOptions(
  provided?: ExtraVoteOption[],
  detectedExtras?: Set<string>
): ExtraVoteOption[] {
  const defaults = cloneExtraVoteOptions();

  if (!provided && !detectedExtras?.size) {
    return defaults;
  }

  return defaults.map((option) => {
    const match =
      provided?.find(
        (candidate) =>
          candidate.id === option.id || candidate.value === option.value
      ) ?? null;

    const enabled =
      match?.enabled ??
      (detectedExtras?.has(option.id) ? true : (option.enabled ?? true));

    return {
      ...option,
      ...match,
      enabled,
      aliases: option.aliases ? [...option.aliases] : option.aliases,
      value: match?.value ?? option.value,
    };
  });
}

function areOptionsEqual(
  a: (string | number)[],
  b: (string | number)[]
): boolean {
  if (a.length !== b.length) return false;
  return a.every((val, index) => String(val) === String(b[index]));
}

function detectTemplateId(
  options: (string | number)[],
  templates: VotingSequenceTemplate[],
  fallbackId: VotingSequenceTemplate['id'] | 'custom'
): VotingSequenceTemplate['id'] | 'custom' {
  const match = templates.find((template) =>
    areOptionsEqual(template.options, options)
  );
  return match?.id ?? fallbackId;
}

function buildEstimateOptions(
  baseOptions: (string | number)[],
  extras: ExtraVoteOption[]
): (string | number)[] {
  const enabledExtras = extras.filter((option) => option.enabled !== false);
  return [...baseOptions, ...enabledExtras.map((option) => option.value)];
}

function getDefaultResultsDisplay() {
  return JSON.parse(JSON.stringify(DEFAULT_RESULTS_DISPLAY));
}

function getDefaultStructuredVotingDisplay() {
  return JSON.parse(JSON.stringify(DEFAULT_STRUCTURED_DISPLAY));
}

export function getDefaultEstimateOptions(): (string | number)[] {
  const defaultTemplate =
    VOTING_SEQUENCE_TEMPLATES.find(
      (preset) => preset.id === DEFAULT_VOTING_SEQUENCE_ID
    ) ?? VOTING_SEQUENCE_TEMPLATES[0];

  return buildEstimateOptions(
    [...defaultTemplate.options],
    cloneExtraVoteOptions()
  );
}

export function getDefaultStructuredVotingOptions(): number[] {
  return [...STRUCTURED_VOTING_OPTIONS];
}

export function getDefaultRoomSettings(
  settings?: Partial<RoomSettings>
): RoomSettings {
  const templates = cloneVotingTemplates();
  const defaultTemplate =
    templates.find((template) => template.id === DEFAULT_VOTING_SEQUENCE_ID) ??
    templates[0];

  const defaultResultsDisplay = getDefaultResultsDisplay();
  const defaultStructuredDisplay = getDefaultStructuredVotingDisplay();

  const { baseOptions: providedBaseOptions, detectedExtras } =
    splitExtrasFromOptions(
      settings?.estimateOptions,
      DEFAULT_EXTRA_VOTE_OPTIONS
    );

  const normalizedExtraOptions = normalizeExtraVoteOptions(
    settings?.extraVoteOptions,
    detectedExtras
  );

  const structuredSequenceId: VotingSequenceTemplate['id'] = 'fibonacci-short';
  let sequenceId: VotingSequenceTemplate['id'] | 'custom' | undefined;
  if (settings?.enableStructuredVoting && !settings?.votingSequenceId) {
    sequenceId = structuredSequenceId;
  } else if (settings?.votingSequenceId) {
    sequenceId = settings.votingSequenceId;
  } else if (providedBaseOptions.length > 0) {
    sequenceId = detectTemplateId(providedBaseOptions, templates, 'custom');
  } else {
    sequenceId = (defaultTemplate?.id ??
      DEFAULT_VOTING_SEQUENCE_ID) as VotingSequenceTemplate['id'];
  }
  let baseOptions: (string | number)[] = [];
  let customEstimateOptions: (string | number)[] | undefined;

  if (
    settings?.customEstimateOptions &&
    settings.customEstimateOptions.length > 0 &&
    (sequenceId === 'custom' || !sequenceId)
  ) {
    baseOptions = [...settings.customEstimateOptions];
    customEstimateOptions = [...settings.customEstimateOptions];
    sequenceId = 'custom';
  } else {
    const preset =
      templates.find((template) => template.id === sequenceId) ??
      templates.find((template) =>
        areOptionsEqual(template.options, providedBaseOptions)
      );

    if (preset) {
      baseOptions = [...preset.options];
      sequenceId = preset.id;
    } else if (providedBaseOptions.length > 0) {
      baseOptions = [...providedBaseOptions];
      sequenceId = 'custom';
      customEstimateOptions = [...providedBaseOptions];
    } else {
      baseOptions = [...defaultTemplate.options];
      sequenceId = defaultTemplate.id;
    }
  }

  if (settings?.enableStructuredVoting) {
    const structuredPreset =
      templates.find((template) => template.id === structuredSequenceId) ??
      templates.find(
        (template) => template.id === DEFAULT_VOTING_SEQUENCE_ID
      ) ??
      templates[0];
    baseOptions = [
      ...(structuredPreset?.options ?? getDefaultStructuredVotingOptions()),
    ];
    sequenceId = structuredPreset?.id ?? structuredSequenceId;
    customEstimateOptions = undefined;
  }

  const estimateOptions = buildEstimateOptions(
    baseOptions,
    normalizedExtraOptions
  );
  const voteOptionsMetadata = generateVoteOptionsMetadata(estimateOptions);
  const hasNonNumericBaseOption = baseOptions.some(
    (option) => Number.isNaN(Number(option)) && typeof option !== 'number'
  );

  const votingCriteriaSource =
    settings?.votingCriteria && settings.votingCriteria.length > 0
      ? settings.votingCriteria
      : getDefaultVotingCriteria();
  const votingCriteria = votingCriteriaSource.map((criterion) => ({
    ...criterion,
  }));

  return {
    estimateOptions,
    customEstimateOptions,
    voteOptionsMetadata,
    allowOthersToShowEstimates: settings?.allowOthersToShowEstimates ?? false,
    allowOthersToDeleteEstimates:
      settings?.allowOthersToDeleteEstimates ?? false,
    allowVotingAfterReveal: settings?.allowVotingAfterReveal ?? false,
    enableAutoReveal: settings?.enableAutoReveal ?? false,
    alwaysRevealVotes: settings?.alwaysRevealVotes ?? false,
    allowOthersToManageQueue: settings?.allowOthersToManageQueue ?? false,
    showTimer: settings?.showTimer ?? true,
    showUserPresence: settings?.showUserPresence ?? false,
    showAverage: settings?.showAverage ?? true,
    showMedian: settings?.showMedian ?? true,
    showTopVotes: settings?.showTopVotes ?? true,
    topVotesCount: settings?.topVotesCount ?? 4,
    anonymousVotes: settings?.anonymousVotes ?? true,
    enableFacilitationGuidance: settings?.enableFacilitationGuidance ?? false,
    enableJudge: settings?.enableJudge ?? !hasNonNumericBaseOption,
    judgeAlgorithm: settings?.judgeAlgorithm ?? JudgeAlgorithm.SMART_CONSENSUS,
    hideParticipantNames: settings?.hideParticipantNames ?? false,
    externalService: settings?.externalService ?? 'none',
    enableStructuredVoting: settings?.enableStructuredVoting ?? false,
    votingCriteria,
    autoSyncEstimates: settings?.autoSyncEstimates ?? true,
    resultsDisplay: settings?.resultsDisplay
      ? { ...defaultResultsDisplay, ...settings.resultsDisplay }
      : defaultResultsDisplay,
    structuredVotingDisplay: settings?.structuredVotingDisplay
      ? { ...defaultStructuredDisplay, ...settings.structuredVotingDisplay }
      : defaultStructuredDisplay,
    autoHandoverModerator: settings?.autoHandoverModerator ?? false,
    enableStrudelPlayer: settings?.enableStrudelPlayer ?? true,
    strudelAutoGenerate: settings?.strudelAutoGenerate ?? false,
    enableTicketQueue: settings?.enableTicketQueue ?? true,
    votingSequenceId: sequenceId,
    extraVoteOptions: normalizedExtraOptions,
  };
}

interface InitialRoomOptions {
  key?: string;
  users?: string[];
  moderator?: string;
  connectedUsers?: Record<string, boolean>;
  passcodeHash?: PasscodeHashPayload;
  settings?: Partial<RoomSettings>;
}

export function createInitialRoomData(options: InitialRoomOptions): RoomData {
  const {
    key = '',
    users = [],
    moderator = '',
    connectedUsers = {},
    passcodeHash,
    settings,
  } = options;

  const settingsWithDefaults = getDefaultRoomSettings(settings);

  return {
    key,
    users,
    votes: {},
    structuredVotes: {},
    showVotes: settingsWithDefaults.alwaysRevealVotes || false,
    moderator,
    connectedUsers,
    judgeScore: null,
    settings: settingsWithDefaults,
    status: 'active',
    passcodeHash,
  };
}

export function getServerDefaults() {
  const roomSettings = getDefaultRoomSettings();

  return {
    roomSettings,
    votingCriteria: roomSettings.votingCriteria,
    structuredVotingOptions: getDefaultStructuredVotingOptions(),
    votingSequences: getVotingTemplates(),
    extraVoteOptions: getDefaultExtraVoteOptions(),
  };
}
