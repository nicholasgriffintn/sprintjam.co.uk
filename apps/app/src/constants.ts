const DEFAULT_HOST =
  typeof window !== 'undefined' && window.location?.host
    ? window.location.host
    : 'sprintjam.co.uk';

export const ENV_BASE_URL = import.meta.env.VITE_API_URL || DEFAULT_HOST;
const IS_BASE_URL_LOCALHOST =
  ENV_BASE_URL.includes('localhost') || ENV_BASE_URL.includes('127.0.0.1');
const BASE_URL_WITH_PROTOCOL = IS_BASE_URL_LOCALHOST
  ? `http://${ENV_BASE_URL}`
  : `https://${ENV_BASE_URL}`;
const BASE_WS_WITH_PROTOCOL = IS_BASE_URL_LOCALHOST
  ? `ws://${ENV_BASE_URL}`
  : `wss://${ENV_BASE_URL}`;

export const API_BASE_URL = `${BASE_URL_WITH_PROTOCOL}/api`;

export const WS_BASE_URL = `${BASE_WS_WITH_PROTOCOL}/ws`;

export const SITE_NAME = 'SprintJam';

export const WORKSPACE_TOKEN_STORAGE_KEY = 'sprintjam_workspaceToken';
export const MUTE_STORAGE_KEY = 'sprintjam_strudelPlayerMuted';
export const VOLUME_STORAGE_KEY = 'sprintjam_strudelPlayerVolume';
export const USERNAME_STORAGE_KEY = 'sprintjam_username';
export const THEME_STORAGE_KEY = 'sprintjam_theme';
export const RETURN_URL_KEY = 'sprintjam_return_url';
export const WORKSPACES_STORAGE_KEY = 'sprintjam_workspaces_enabled';
export const ROOM_HINTS_DISMISSED_STORAGE_KEY = 'sprintjam_roomHintsDismissed';
export const ROOM_JOINED_STORAGE_KEY = 'sprintjam_roomJoinedBefore';
export const ROOM_SPREAD_HINT_STORAGE_KEY = 'sprintjam_roomSpreadHintSeen';
export const ROOM_FACILITATION_PROMPT_SEEN_STORAGE_KEY =
  'sprintjam_roomFacilitationPromptSeen';

export const QUICK_EMOJIS = [
  '😀',
  '😎',
  '🤓',
  '🥳',
  '🤠',
  '👻',
  '🦄',
  '🐶',
  '🐱',
  '🦊',
  '🐼',
  '🐨',
  '🦁',
  '🐯',
  '🐸',
  '🦉',
  '🐙',
  '🦋',
  '🌟',
  '⚡',
  '🔥',
  '💎',
  '🎯',
  '🚀',
];

export const DEFAULT_TIMER_DURATION_SECONDS = 3 * 60;
export const MIN_TIMER_DURATION_SECONDS = 60;
export const MAX_TIMER_DURATION_SECONDS = 60 * 60;

export const TIMER_DURATION_PRESETS: ReadonlyArray<{
  label: string;
  seconds: number;
}> = [
  { label: '1m', seconds: 1 * 60 },
  { label: '3m', seconds: 3 * 60 },
  { label: '5m', seconds: 5 * 60 },
  { label: '8m', seconds: 8 * 60 },
  { label: '13m', seconds: 13 * 60 },
  { label: '20m', seconds: 20 * 60 },
  { label: '30m', seconds: 30 * 60 },
];

export const Z_INDEX = {
  header: {
    marketing: 10,
    room: 20,
    workspace: 50,
  },
  modal: 50,
  loading: 60,
} as const;

export const HEADER_TRANSITION = {
  duration: 0.35,
  ease: [0.25, 0.1, 0.25, 1] as const,
};

export const LOGO_SIZES = {
  xs: { container: 'h-8 w-8', padding: 'p-0.5' },
  sm: { container: 'h-9 w-9', padding: 'p-1' },
  md: { container: 'h-12 w-12', padding: 'p-1.5' },
  lg: { container: 'h-16 w-16', padding: 'p-2' },
} as const;

export const LOGO_TEXT_SIZES = {
  xs: 'text-base',
  sm: 'text-lg',
  md: 'text-2xl',
  lg: 'text-3xl',
} as const;
