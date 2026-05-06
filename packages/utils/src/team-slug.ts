import { secureRandomInt } from "./random";

const TEAM_SLUG_WORDS = [
  "amber",
  "anchor",
  "atlas",
  "beacon",
  "brisk",
  "cedar",
  "cinder",
  "clover",
  "cobalt",
  "comet",
  "copper",
  "delta",
  "ember",
  "fable",
  "frost",
  "harbour",
  "indigo",
  "juno",
  "keystone",
  "lagoon",
  "lantern",
  "maple",
  "meadow",
  "meridian",
  "nova",
  "onyx",
  "orbit",
  "pebble",
  "quartz",
  "ripple",
  "summit",
  "tempo",
  "velvet",
  "willow",
  "zenith",
] as const;

export const TEAM_SLUG_PATTERN = /^[a-z]+(?:-[a-z]+){2}$/;

export function isTeamSlug(value: string): boolean {
  return TEAM_SLUG_PATTERN.test(value);
}

export function createTeamSlugCandidate(): string {
  return Array.from({ length: 3 }, () => {
    return TEAM_SLUG_WORDS[secureRandomInt(TEAM_SLUG_WORDS.length)]!;
  }).join("-");
}
