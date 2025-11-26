import type { MetaTagConfig } from '@/utils/meta';
import { SITE_NAME, BASE_DESCRIPTION } from '@/constants';

export const META_CONFIGS: Record<string, MetaTagConfig> = {
  welcome: {
    title: `${SITE_NAME} -  Effortless team estimations in a beautiful shared space`,
    description: BASE_DESCRIPTION,
    keywords:
      'planning poker, agile estimation, scrum poker, story points, sprint planning, agile, scrum, estimation, team collaboration',
    ogImage: '/og-image.png',
  },
  create: {
    title: `Create Room - ${SITE_NAME}`,
    description:
      'Create a new estimation room for your team. Set up your planning poker session in seconds with customizable voting scales.',
    keywords:
      'create room, planning poker, estimation session, scrum poker, team estimation',
    ogImage: '/og-image.png',
  },
  join: {
    title: `Join Room - ${SITE_NAME}`,
    description:
      'Join an existing estimation room. Enter your room code to start collaborating with your team on story point estimation.',
    keywords:
      'join room, planning poker, estimation session, team collaboration',
    ogImage: '/og-image.png',
  },
  room: {
    title: `Estimation Room - ${SITE_NAME}`,
    description:
      'Collaborate with your team in real-time. Vote on story points, reveal estimates, and make better sprint planning decisions together.',
    keywords:
      'estimation room, planning poker session, real-time voting, story points, sprint planning',
    ogImage: '/og-image.png',
  },
  fixits: {
    title: `Fixits Leaderboard - ${SITE_NAME}`,
    description:
      'Run gamified bug bashes and tech-debt slams with live scoring powered by GitHub webhooks and SprintJam Fixits.',
    keywords:
      'fixits, bug bash, tech debt, leaderboard, github automation, sprintjam fixits',
    ogImage: '/og-image.png',
  },
  fixitsAdmin: {
    title: `Fixits Admin - ${SITE_NAME}`,
    description:
      'Create and manage Fixit runs, control leaderboard visibility, and configure GitHub integrations.',
    keywords:
      'fixits admin, fixit runs, bug bash configuration, leaderboard management',
    ogImage: '/og-image.png',
  },
  privacy: {
    title: `Privacy Policy - ${SITE_NAME}`,
    description:
      'Learn how SprintJam protects your privacy and handles your data. We respect your privacy and are committed to transparency.',
    keywords: 'privacy policy, data protection, privacy, terms',
    ogImage: '/og-image.png',
  },
  terms: {
    title: `Terms and Conditions - ${SITE_NAME}`,
    description:
      'Read our terms and conditions to understand the rules and guidelines for using SprintJam.',
    keywords: 'terms and conditions, terms, conditions',
    ogImage: '/og-image.png',
  },
  notFound: {
    title: `Page Not Found - ${SITE_NAME}`,
    description:
      'The page you are looking for could not be found. Return to SprintJam to create or join an estimation room.',
    keywords: '404, page not found',
    ogImage: '/og-image.png',
  },
};

export function getMetaConfig(screen: string): MetaTagConfig {
  return META_CONFIGS[screen] || META_CONFIGS.welcome;
}
