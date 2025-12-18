const DEFAULT_HOST =
  typeof window !== "undefined" && window.location?.host
    ? window.location.host
    : "sprintjam.co.uk";

export const ENV_BASE_URL = import.meta.env.VITE_API_URL || DEFAULT_HOST;
const IS_BASE_URL_LOCALHOST =
  ENV_BASE_URL.includes('localhost') || ENV_BASE_URL.includes('127.0.0.1');
const BASE_URL_WITH_PROTOCOL = IS_BASE_URL_LOCALHOST
  ? `http://${ENV_BASE_URL}`
  : `https://${ENV_BASE_URL}`;
const BASE_WS_WITH_PROTOCOL = IS_BASE_URL_LOCALHOST
  ? `ws://${ENV_BASE_URL}`
  : `wss://${ENV_BASE_URL}`;

export const API_BASE_URL = import.meta.env.DEV
  ? 'http://localhost:5173/api'
  : `${BASE_URL_WITH_PROTOCOL}/api`;

export const WS_BASE_URL = import.meta.env.DEV
  ? 'ws://localhost:5173/ws'
  : `${BASE_WS_WITH_PROTOCOL}/ws`;

export const SITE_NAME = "SprintJam";
export const BASE_DESCRIPTION =
  "Plan sprints faster with real-time story point voting, instant consensus insights, and lightweight collaboration. No sign-ups, no distractions.";

export const AUTH_TOKEN_STORAGE_KEY = "sprintjam_authToken";
export const CONFIDENCE_INFO_STORAGE_KEY = "sprintjam_confidenceInfoSeen";
export const ROOM_KEY_STORAGE_KEY = "sprintjam_roomKey";
export const MUTE_STORAGE_KEY = "sprintjam_strudelPlayerMuted";
export const VOLUME_STORAGE_KEY = "sprintjam_strudelPlayerVolume";
export const USERNAME_STORAGE_KEY = "sprintjam_username";
export const THEME_STORAGE_KEY = "sprintjam_theme";

export const QUICK_EMOJIS = [
  "😀",
  "😎",
  "🤓",
  "🥳",
  "🤠",
  "👻",
  "🦄",
  "🐶",
  "🐱",
  "🦊",
  "🐼",
  "🐨",
  "🦁",
  "🐯",
  "🐸",
  "🦉",
  "🐙",
  "🦋",
  "🌟",
  "⚡",
  "🔥",
  "💎",
  "🎯",
  "🚀",
];

export const DEFAULT_TIMER_DURATION_SECONDS = 3 * 60;
export const MIN_TIMER_DURATION_SECONDS = 60;
export const MAX_TIMER_DURATION_SECONDS = 60 * 60;

export const TIMER_DURATION_PRESETS: ReadonlyArray<{
  label: string;
  seconds: number;
}> = [
  { label: "1m", seconds: 1 * 60 },
  { label: "3m", seconds: 3 * 60 },
  { label: "5m", seconds: 5 * 60 },
  { label: "8m", seconds: 8 * 60 },
  { label: "13m", seconds: 13 * 60 },
  { label: "20m", seconds: 20 * 60 },
  { label: "30m", seconds: 30 * 60 },
];
