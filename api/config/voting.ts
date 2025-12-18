import type { ExtraVoteOption, VotingSequenceTemplate } from "../types";

export const DEFAULT_VOTING_SEQUENCE_ID: VotingSequenceTemplate["id"] =
  "fibonacci-short";

export const VOTING_SEQUENCE_TEMPLATES: ReadonlyArray<VotingSequenceTemplate> =
  Object.freeze([
    {
      id: 'fibonacci',
      label: 'Fibonacci',
      description: 'Classic sequence for broader estimation ranges',
      options: [0, 1, 1, 2, 3, 5, 8, 13, 21, 34],
    },
    {
      id: 'fibonacci-short',
      label: 'Fibonacci short',
      description: 'Default sprint planning scale',
      options: [1, 2, 3, 5, 8, 13, 21],
    },
    {
      id: 'doubling',
      label: 'Doubling',
      description: 'For fast-growing complexity',
      options: [2, 4, 8, 16, 32],
    },
    {
      id: 'tshirt',
      label: 'T-Shirt Size',
      description: 'Simple relative sizing',
      options: ['XS', 'S', 'M', 'L', 'XL'],
    },
    {
      id: 'planet-scale',
      label: 'Planet Scale',
      description: 'Tiny tasks to planet-sized projects',
      options: [
        '🌑 Moon',
        '🌍 Earth',
        '🔴 Mars',
        '🟠 Jupiter',
        '🪐 Saturn',
        '🔵 Uranus',
        '🌊 Neptune',
        '❄️ Pluto',
      ],
    },
    {
      id: 'yes-no',
      label: 'Yes / No',
      description: 'Binary go/no-go decision',
      options: ['Yes', 'No'],
    },
    {
      id: 'simple',
      label: 'Simple',
      description: 'Straight 1-8 scale',
      options: [1, 2, 3, 4, 5, 6, 7, 8],
    },
    {
      id: 'hours',
      label: 'Hours',
      description: 'Time-based estimates',
      options: [2, 4, 8, 16, 24],
    },
  ]);

export const DEFAULT_EXTRA_VOTE_OPTIONS: ReadonlyArray<ExtraVoteOption> =
  Object.freeze([
    {
      id: "unsure",
      label: "Unsure",
      value: "❓",
      description: "I am not sure about this one",
      enabled: true,
      aliases: ["?"],
      impact: "none",
    },
    {
      id: "coffee",
      label: "Coffee Break",
      value: "☕",
      description: "Pause for a quick break",
      enabled: false,
      aliases: ["coffee"],
      impact: "none",
    },
    {
      id: "cannot-complete",
      label: "Cannot Complete",
      value: "♾️",
      description: "This task cannot be completed as written",
      enabled: false,
      aliases: ["∞", "infinity"],
      impact: "high-alert",
    },
  ]);
