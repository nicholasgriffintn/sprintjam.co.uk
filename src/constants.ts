export const API_BASE_URL = import.meta.env.DEV
  ? 'http://localhost:5173/api'
  : 'https://sprintjam.co.uk/api';

export const WS_BASE_URL = import.meta.env.DEV
  ? 'ws://localhost:5173/ws'
  : 'wss://sprintjam.co.uk/ws';

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