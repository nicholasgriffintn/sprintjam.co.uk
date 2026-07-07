import type { VoteOptionMetadata, VotingCriterion } from "@sprintjam/types";

import { generateColorFromValue, generateColorFromString } from "./colors";
import { SPECIAL_COLORS } from "./config/constants";
import { getTaskSize } from "./tasks";

export function generateVoteOptionsMetadata(
  options: (string | number)[],
): VoteOptionMetadata[] {
  const numericValues = options
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));
  const maxValue = numericValues.length > 0 ? Math.max(...numericValues) : 34;

  return options.map((value) => {
    let background: string;
    const stringValue = String(value);

    if (SPECIAL_COLORS[stringValue]) {
      background = SPECIAL_COLORS[stringValue];
    } else if (!Number.isNaN(Number(value))) {
      background = generateColorFromValue(Number(value), maxValue);
    } else {
      background = generateColorFromString(stringValue);
    }

    const taskSize = getTaskSize(value);

    return {
      value,
      background,
      taskSize,
    };
  });
}

export const STRUCTURED_VOTING_CRITERIA: ReadonlyArray<VotingCriterion> =
  Object.freeze([
    {
      id: "complexity",
      name: "Complexity",
      description:
        "Level of logic and coordination (0: same app, 2: cross repo, 4: cross team)",
      minScore: 0,
      maxScore: 4,
      weight: 0.35,
    },
    {
      id: "confidence",
      name: "Individual Confidence",
      description:
        "Your confidence in this area (0: no confidence, 4: very confident)",
      minScore: 0,
      maxScore: 4,
      weight: 0.25,
      scoringDirection: "inverse",
    },
    {
      id: "volume",
      name: "Volume",
      description: "Amount of work required (0: minimal, 4: extensive)",
      minScore: 0,
      maxScore: 4,
      weight: 0.25,
      conversionRules: [
        {
          score: 4,
          minimumPercentageScore: 80,
          label: "Volume=4 → minimum 8pt",
        },
      ],
    },
    {
      id: "unknowns",
      name: "Unknowns",
      description: "Implementation unknowns (0: none, 1: some, 2: too many)",
      minScore: 0,
      maxScore: 2,
      weight: 0.15,
      conversionRules: [
        {
          score: 2,
          minimumPercentageScore: 80,
          label: "Unknowns=2 → minimum 8pt",
        },
        {
          score: 1,
          minimumPercentageScore: 35,
          label: "Unknowns=1 → minimum 3pt",
        },
      ],
    },
    {
      id: "risk",
      name: "Risk",
      description: "Delivery or production risk (0: none, 4: high risk)",
      minScore: 0,
      maxScore: 4,
      weight: 0.2,
    },
  ]);

export const DEFAULT_STRUCTURED_VOTING_CRITERIA_IDS = [
  "complexity",
  "confidence",
  "volume",
  "unknowns",
] as const;

export function cloneVotingCriteria(
  criteria: ReadonlyArray<VotingCriterion>,
): VotingCriterion[] {
  return criteria.map((criterion) => ({
    ...criterion,
    conversionRules: criterion.conversionRules
      ? criterion.conversionRules.map((rule) => ({ ...rule }))
      : undefined,
  }));
}

export function getStructuredVotingCriteriaPreset({
  activeCriteriaIds = DEFAULT_STRUCTURED_VOTING_CRITERIA_IDS,
}: {
  activeCriteriaIds?: readonly string[];
} = {}): VotingCriterion[] {
  const activeIds = new Set(activeCriteriaIds);
  return cloneVotingCriteria(
    STRUCTURED_VOTING_CRITERIA.filter((criterion) =>
      activeIds.has(criterion.id),
    ),
  );
}

export function getDefaultVotingCriteria(): VotingCriterion[] {
  return getStructuredVotingCriteriaPreset();
}

export function setStructuredVotingCriterionEnabled(
  criteria: VotingCriterion[] | undefined,
  criterionId: string,
  enabled: boolean,
): VotingCriterion[] {
  const currentIds = new Set(
    (criteria && criteria.length > 0
      ? criteria
      : getDefaultVotingCriteria()
    ).map((criterion) => criterion.id),
  );

  if (enabled) {
    currentIds.add(criterionId);
  } else if (currentIds.size > 1) {
    currentIds.delete(criterionId);
  }

  return getStructuredVotingCriteriaPreset({
    activeCriteriaIds: STRUCTURED_VOTING_CRITERIA.map((criterion) => criterion.id).filter(
      (id) => currentIds.has(id),
    ),
  });
}
