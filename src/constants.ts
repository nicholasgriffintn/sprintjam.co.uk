const DEFAULT_HOST =
  typeof window !== "undefined" && window.location?.host
    ? window.location.host
    : "sprintjam.co.uk";

export const ENV_BASE_URL = import.meta.env.VITE_API_URL || DEFAULT_HOST;

export const API_BASE_URL = import.meta.env.DEV
  ? "http://localhost:5173/api"
  : `https://${ENV_BASE_URL}/api`;

export const WS_BASE_URL = import.meta.env.DEV
  ? "ws://localhost:5173/ws"
  : `wss://${ENV_BASE_URL}/ws`;

export const SITE_NAME = 'SprintJam';
export const BASE_DESCRIPTION =
  'Plan sprints faster with real-time story point voting, instant consensus insights, and lightweight collaboration. No sign-ups, no distractions.';

export const AUTH_TOKEN_STORAGE_KEY = 'sprintjam_authToken';
export const CONFIDENCE_INFO_STORAGE_KEY = 'sprintjam_confidenceInfoSeen';
export const ROOM_KEY_STORAGE_KEY = 'sprintjam_roomKey';
export const MUTE_STORAGE_KEY = 'sprintjam_strudelPlayerMuted';
export const VOLUME_STORAGE_KEY = 'sprintjam_strudelPlayerVolume';
export const USERNAME_STORAGE_KEY = 'sprintjam_username';

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
