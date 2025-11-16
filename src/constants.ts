export const ENV_BASE_URL = import.meta.env.VITE_API_URL || 'sprintjam.co.uk';

export const API_BASE_URL = import.meta.env.DEV
  ? 'http://localhost:5173/api'
  : `https://${ENV_BASE_URL}/api`;

export const WS_BASE_URL = import.meta.env.DEV
  ? 'ws://localhost:5173/ws'
  : `wss://${ENV_BASE_URL}/ws`;

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
