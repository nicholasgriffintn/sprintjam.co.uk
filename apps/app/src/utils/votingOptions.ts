import type {
  ExtraVoteOption,
  VotingSequenceId,
  VotingSequenceTemplate,
} from "@/types";

const toComparableString = (value: string | number) => String(value).trim();

export function cloneVotingPresets(
  presets: VotingSequenceTemplate[],
): VotingSequenceTemplate[] {
  return presets.map((preset) => ({
    ...preset,
    options: [...preset.options],
  }));
}

export function cloneExtraVoteOptions(
  extras: ExtraVoteOption[],
): ExtraVoteOption[] {
  return extras.map((extra) => ({
    ...extra,
    enabled: extra.enabled ?? true,
    aliases: extra.aliases ? [...extra.aliases] : undefined,
  }));
}

function findMatchingExtra(
  option: string | number,
  extras: ExtraVoteOption[],
): ExtraVoteOption | undefined {
  const stringValue = toComparableString(option);
  return extras.find(
    (extra) =>
      extra.value === option ||
      toComparableString(extra.value) === stringValue ||
      extra.aliases?.some(
        (alias) => toComparableString(alias) === stringValue,
      ),
  );
}

export function splitExtrasFromOptions(
  options: (string | number)[] = [],
  extras: ExtraVoteOption[],
): { baseOptions: (string | number)[]; detectedExtras: Set<string> } {
  const baseOptions: (string | number)[] = [];
  const detectedExtras = new Set<string>();

  options.forEach((option) => {
    const match = findMatchingExtra(option, extras);
    if (match) {
      detectedExtras.add(match.id);
    } else {
      baseOptions.push(option);
    }
  });

  return { baseOptions, detectedExtras };
}

export function normalizeExtraVoteOptions(
  provided: ExtraVoteOption[] | undefined,
  defaults: ExtraVoteOption[],
  detectedExtras?: Set<string>,
): ExtraVoteOption[] {
  const baseline = cloneExtraVoteOptions(defaults);

  if (!provided && !detectedExtras?.size) {
    return baseline;
  }

  return baseline.map((extra) => {
    const match =
      provided?.find(
        (item) => item.id === extra.id || item.value === extra.value,
      ) ?? null;
    const enabled =
      match?.enabled ??
      (detectedExtras?.has(extra.id) ? true : extra.enabled ?? true);

    return {
      ...extra,
      ...match,
      enabled,
      aliases: extra.aliases ? [...extra.aliases] : extra.aliases,
      value: match?.value ?? extra.value,
    };
  });
}

function areOptionsEqual(
  a: (string | number)[],
  b: (string | number)[],
): boolean {
  if (a.length !== b.length) return false;
  return a.every(
    (value, index) => toComparableString(value) === toComparableString(b[index]),
  );
}

export function detectPresetId(
  baseOptions: (string | number)[],
  presets: VotingSequenceTemplate[],
  fallbackId: VotingSequenceId,
): VotingSequenceId {
  const match = presets.find((preset) => areOptionsEqual(baseOptions, preset.options));
  return (match?.id as VotingSequenceId) ?? fallbackId;
}

export function mergeOptionsWithExtras(
  baseOptions: (string | number)[],
  extras: ExtraVoteOption[],
): (string | number)[] {
  return [
    ...baseOptions,
    ...extras.filter((extra) => extra.enabled !== false).map((extra) => extra.value),
  ];
}

export function parseEstimateOptionsInput(
  value: string,
): (string | number)[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const num = Number(item);
      return Number.isNaN(num) ? item : num;
    });
}

export function getExtraVoteValueSet(
  extras: ExtraVoteOption[] = [],
): Set<string> {
  return new Set(extras.map((extra) => toComparableString(extra.value)));
}

export function hasNumericBaseOptions(
  estimateOptions: (string | number)[],
  extras: ExtraVoteOption[] = [],
): boolean {
  const { baseOptions } = splitExtrasFromOptions(estimateOptions, extras);
  return baseOptions.some((option) => !Number.isNaN(Number(option)));
}

export function getVisibleEstimateOptions(settings: {
  estimateOptions: (string | number)[];
  extraVoteOptions?: ExtraVoteOption[];
  enableStructuredVoting?: boolean;
}): (string | number)[] {
  return settings.estimateOptions;
}
