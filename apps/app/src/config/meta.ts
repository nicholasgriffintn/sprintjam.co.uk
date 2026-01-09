import type { MetaTagConfig } from "@/utils/meta";
import { SITE_NAME, BASE_DESCRIPTION } from "@/constants";

export const META_CONFIGS: Record<string, MetaTagConfig> = {
  welcome: {
    title: `${SITE_NAME} -  Effortless team estimations in a beautiful shared space`,
    description: BASE_DESCRIPTION,
    keywords:
      'planning poker, agile estimation, scrum poker, story points, sprint planning, agile, scrum, estimation, team collaboration',
    ogImage: '/og-image.png',
  },
  login: {
    title: `Login - ${SITE_NAME}`,
    description:
      "Access your workspace to create and join estimation rooms. Collaborate with your team using SprintJam's planning poker tool.",
    keywords:
      'login, workspace access, planning poker, estimation rooms, team collaboration',
    ogImage: '/og-image.png',
  },
  verify: {
    title: `Verify Email - ${SITE_NAME}`,
    description:
      'Verify your email to access your workspace. Complete the login process and start collaborating with your team on estimations.',
    keywords:
      'verify email, email verification, workspace access, planning poker, team collaboration',
    ogImage: '/og-image.png',
  },
  workspace: {
    title: `Workspace - ${SITE_NAME}`,
    description:
      'Manage your estimation rooms and collaborate with your team in your workspace. Create, join, and organize planning poker sessions easily.',
    keywords:
      'workspace, estimation rooms, planning poker, team collaboration, scrum poker, agile estimation',
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
  changelog: {
    title: `Changelog - ${SITE_NAME}`,
    description:
      'Keep up with the latest SprintJam updates, improvements, and fixes.',
    keywords: 'changelog, release notes, updates',
    ogImage: '/og-image.png',
  },
  faq: {
    title: `FAQ & Planning Guide - ${SITE_NAME}`,
    description:
      'Answers to common SprintJam questions plus a quick guide to running effective Scrum planning poker sessions.',
    keywords: 'faq, sprintjam help, planning poker guide, scrum estimation',
    ogImage: '/og-image.png',
  },
  integrations: {
    title: `Integrations - ${SITE_NAME}`,
    description:
      'Connect SprintJam to Jira, Linear, and GitHub with secure per-room OAuth connections and smart syncing.',
    keywords: 'jira integration, linear integration, github integration, sprintjam integrations',
    ogImage: '/og-image.png',
  },
  integrationsJira: {
    title: `Jira Integration - ${SITE_NAME}`,
    description:
      'Import Jira issues, estimate with your team, and sync story points back with SprintJam’s secure integration.',
    keywords: 'jira planning poker, jira integration, story point sync',
    ogImage: '/og-image.png',
  },
  integrationsLinear: {
    title: `Linear Integration - ${SITE_NAME}`,
    description:
      'Bring Linear issues into SprintJam, estimate together, and keep your roadmap aligned with synced results.',
    keywords: 'linear planning poker, linear integration, story points',
    ogImage: '/og-image.png',
  },
  integrationsGithub: {
    title: `GitHub Integration - ${SITE_NAME}`,
    description:
      'Estimate GitHub issues in SprintJam and keep engineering work in sync with story point updates.',
    keywords: 'github planning poker, github integration, issue estimation',
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
