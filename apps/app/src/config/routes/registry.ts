import { lazy } from 'react';
import { LayoutDashboard, Target, Settings, Users } from 'lucide-react';

import type { RouteConfig } from './types';
import { SITE_NAME } from '@/constants';

const RoomScreen = lazy(() => import('@/routes/RoomScreen'));

import WelcomeScreen from '@/routes/WelcomeScreen';
import LoginScreen from '@/routes/auth/LoginScreen';
import WorkspaceDashboard from '@/routes/workspace/WorkspaceDashboard';
import WorkspaceSessions from '@/routes/workspace/WorkspaceSessions';
import WorkspaceAdminOverview from '@/routes/workspace/WorkspaceAdminOverview';
import WorkspaceAdminTeams from '@/routes/workspace/WorkspaceAdminTeams';
import CreateRoomScreen from '@/routes/CreateRoomScreen';
import JoinRoomScreen from '@/routes/JoinRoomScreen';
import NotFoundScreen from '@/routes/NotFoundScreen';
import FaqScreen from '@/routes/FaqScreen';
import IntegrationsScreen from '@/routes/IntegrationsScreen';
import JiraIntegrationScreen from '@/routes/integrations/JiraIntegrationScreen';
import LinearIntegrationScreen from '@/routes/integrations/LinearIntegrationScreen';
import GithubIntegrationScreen from '@/routes/integrations/GithubIntegrationScreen';
import PrivacyPolicyScreen from '@/routes/PrivacyPolicyScreen';
import TermsConditionsScreen from '@/routes/TermsConditionsScreen';
import ChangelogScreen from '@/routes/ChangelogScreen';
import GuidesScreen from '@/routes/guides/GuidesScreen';
import PlanningPokerGuide from '@/routes/guides/PlanningPokerGuide';
import FibonacciScaleGuide from '@/routes/guides/FibonacciScaleGuide';
import FibonacciShortGuide from '@/routes/guides/FibonacciShortGuide';
import DoublingScaleGuide from '@/routes/guides/DoublingScaleGuide';
import TshirtSizingGuide from '@/routes/guides/TshirtSizingGuide';
import PlanetScaleGuide from '@/routes/guides/PlanetScaleGuide';
import YesNoGuide from '@/routes/guides/YesNoGuide';
import SimpleScaleGuide from '@/routes/guides/SimpleScaleGuide';
import HoursEstimatesGuide from '@/routes/guides/HoursEstimatesGuide';
import SessionRolesGuide from '@/routes/guides/SessionRolesGuide';
import RemoteEstimationGuide from '@/routes/guides/RemoteEstimationGuide';
import StoryPointsGuide from '@/routes/guides/StoryPointsGuide';
import SprintPlanningGuide from '@/routes/guides/SprintPlanningGuide';
import ConsensusBuildingGuide from '@/routes/guides/ConsensusBuildingGuide';
import StructuredVotingGuide from '@/routes/guides/StructuredVotingGuide';

export const ROUTES = [
  {
    screen: 'welcome',
    path: '/',
    group: 'marketing',
    component: WelcomeScreen,
    meta: {
      title: `${SITE_NAME} - Fast, real-time planning poker for distributed teams`,
      description:
        'Estimate stories in minutes with live voting, smart consensus insights, and a distraction-free room that keeps everyone focused. No sign-ups required, just share a link to start.',
      keywords:
        'planning poker, agile estimation, scrum poker, story points, sprint planning, agile, scrum, estimation, team collaboration',
      ogImage: '/og-image.png',
    },
    layout: {
      marketingVariant: 'hero',
    },
  },
  {
    screen: 'privacy',
    path: '/privacy',
    group: 'marketing',
    component: PrivacyPolicyScreen,
    meta: {
      title: `Privacy Policy - ${SITE_NAME}`,
      description: `Learn how ${SITE_NAME} protects your privacy and handles your data. We respect your privacy and are committed to transparency.`,
      keywords: 'privacy policy, data protection, privacy, terms',
      ogImage: '/og-image.png',
    },
  },
  {
    screen: 'terms',
    path: '/terms',
    group: 'marketing',
    component: TermsConditionsScreen,
    meta: {
      title: `Terms and Conditions - ${SITE_NAME}`,
      description: `Read our terms and conditions to understand the rules and guidelines for using ${SITE_NAME}.`,
      keywords: 'terms and conditions, terms, conditions',
      ogImage: '/og-image.png',
    },
  },
  {
    screen: 'changelog',
    path: '/changelog',
    group: 'marketing',
    component: ChangelogScreen,
    meta: {
      title: `Changelog - ${SITE_NAME}`,
      description: `Keep up with the latest ${SITE_NAME} updates, improvements, and fixes.`,
      keywords: 'changelog, release notes, updates',
      ogImage: '/og-image.png',
    },
  },
  {
    screen: 'faq',
    path: '/faq',
    group: 'marketing',
    component: FaqScreen,
    meta: {
      title: `FAQ & Planning Guide - ${SITE_NAME}`,
      description: `Answers to common ${SITE_NAME} questions plus a quick guide to running effective Scrum planning poker sessions.`,
      keywords: 'faq, sprintjam help, planning poker guide, scrum estimation',
      ogImage: '/og-image.png',
    },
  },

  {
    screen: 'integrations',
    path: '/integrations',
    group: 'marketing',
    component: IntegrationsScreen,
    meta: {
      title: `Integrations - ${SITE_NAME}`,
      description: `Connect ${SITE_NAME} to Jira, Linear, and GitHub with secure per-room OAuth connections and smart syncing.`,
      keywords: 'jira integration, linear integration, github integration',
      ogImage: '/og-image.png',
    },
  },
  {
    screen: 'integrationsJira',
    path: '/integrations/jira',
    group: 'marketing',
    component: JiraIntegrationScreen,
    meta: {
      title: `Jira Integration - ${SITE_NAME}`,
      description: `Import Jira issues, estimate with your team, and sync story points back with ${SITE_NAME}'s secure integration.`,
      keywords: 'jira planning poker, jira integration, story point sync',
      ogImage: '/og-image.png',
    },
  },
  {
    screen: 'integrationsLinear',
    path: '/integrations/linear',
    group: 'marketing',
    component: LinearIntegrationScreen,
    meta: {
      title: `Linear Integration - ${SITE_NAME}`,
      description: `Bring Linear issues into ${SITE_NAME}, estimate together, and keep your roadmap aligned with synced results.`,
      keywords: 'linear planning poker, linear integration, story points',
      ogImage: '/og-image.png',
    },
  },
  {
    screen: 'integrationsGithub',
    path: '/integrations/github',
    group: 'marketing',
    component: GithubIntegrationScreen,
    meta: {
      title: `GitHub Integration - ${SITE_NAME}`,
      description: `Estimate GitHub issues in ${SITE_NAME} and keep engineering work in sync with story point updates.`,
      keywords: 'github planning poker, github integration, issue estimation',
      ogImage: '/og-image.png',
    },
  },

  {
    screen: 'guides',
    path: '/guides',
    group: 'marketing',
    component: GuidesScreen,
    meta: {
      title: `Guides - ${SITE_NAME}`,
      description: `Learn about planning poker, estimation scales, and agile best practices with our comprehensive guides.`,
      keywords: 'planning poker guides, estimation guides, agile guides',
      ogImage: '/og-image.png',
    },
  },
  {
    screen: 'guidesPlanningPoker',
    path: '/guides/planning-poker',
    group: 'marketing',
    component: PlanningPokerGuide,
    meta: {
      title: `Planning Poker Guide - ${SITE_NAME}`,
      description: `Learn how to run effective planning poker sessions with your team.`,
      keywords: 'planning poker, agile estimation, scrum poker',
      ogImage: '/og-image.png',
    },
  },
  {
    screen: 'guidesFibonacciScale',
    path: '/guides/fibonacci-scale',
    group: 'marketing',
    component: FibonacciScaleGuide,
    meta: {
      title: `Fibonacci Scale Guide - ${SITE_NAME}`,
      description: `Understand the Fibonacci scale and how to use it for story point estimation.`,
      keywords: 'fibonacci scale, story points, agile estimation',
      ogImage: '/og-image.png',
    },
  },
  {
    screen: 'guidesFibonacciShort',
    path: '/guides/fibonacci-short',
    group: 'marketing',
    component: FibonacciShortGuide,
    meta: {
      title: `Short Fibonacci Scale Guide - ${SITE_NAME}`,
      description: `Learn about the shortened Fibonacci scale for faster estimation.`,
      keywords: 'fibonacci short, story points, quick estimation',
      ogImage: '/og-image.png',
    },
  },
  {
    screen: 'guidesDoublingScale',
    path: '/guides/doubling-scale',
    group: 'marketing',
    component: DoublingScaleGuide,
    meta: {
      title: `Doubling Scale Guide - ${SITE_NAME}`,
      description: `Explore the doubling scale for effort estimation.`,
      keywords: 'doubling scale, powers of two, estimation',
      ogImage: '/og-image.png',
    },
  },
  {
    screen: 'guidesTshirtSizing',
    path: '/guides/tshirt-sizing',
    group: 'marketing',
    component: TshirtSizingGuide,
    meta: {
      title: `T-Shirt Sizing Guide - ${SITE_NAME}`,
      description: `Use t-shirt sizes (XS, S, M, L, XL) for relative estimation.`,
      keywords: 'tshirt sizing, relative estimation, agile',
      ogImage: '/og-image.png',
    },
  },
  {
    screen: 'guidesPlanetScale',
    path: '/guides/planet-scale',
    group: 'marketing',
    component: PlanetScaleGuide,
    meta: {
      title: `Planet Scale Guide - ${SITE_NAME}`,
      description: `A fun planet-based scale for estimation sessions.`,
      keywords: 'planet scale, fun estimation, agile games',
      ogImage: '/og-image.png',
    },
  },
  {
    screen: 'guidesYesNo',
    path: '/guides/yes-no',
    group: 'marketing',
    component: YesNoGuide,
    meta: {
      title: `Yes/No Voting Guide - ${SITE_NAME}`,
      description: `Simple yes/no voting for quick team decisions.`,
      keywords: 'yes no voting, quick decisions, team voting',
      ogImage: '/og-image.png',
    },
  },
  {
    screen: 'guidesSimpleScale',
    path: '/guides/simple-scale',
    group: 'marketing',
    component: SimpleScaleGuide,
    meta: {
      title: `Simple Scale Guide - ${SITE_NAME}`,
      description: `A straightforward 1-5 scale for estimation.`,
      keywords: 'simple scale, 1-5 scale, easy estimation',
      ogImage: '/og-image.png',
    },
  },
  {
    screen: 'guidesHoursEstimates',
    path: '/guides/hours-estimates',
    group: 'marketing',
    component: HoursEstimatesGuide,
    meta: {
      title: `Hours Estimates Guide - ${SITE_NAME}`,
      description: `Estimate tasks in hours for time-based planning.`,
      keywords: 'hours estimation, time estimates, task planning',
      ogImage: '/og-image.png',
    },
  },
  {
    screen: 'guidesSessionRoles',
    path: '/guides/session-roles',
    group: 'marketing',
    component: SessionRolesGuide,
    meta: {
      title: `Session Roles Guide - ${SITE_NAME}`,
      description: `Understanding roles in a planning poker session.`,
      keywords: 'session roles, moderator, facilitator, scrum master',
      ogImage: '/og-image.png',
    },
  },
  {
    screen: 'guidesRemoteEstimation',
    path: '/guides/remote-estimation',
    group: 'marketing',
    component: RemoteEstimationGuide,
    meta: {
      title: `Remote Estimation Guide - ${SITE_NAME}`,
      description: `Tips for running effective remote estimation sessions.`,
      keywords: 'remote estimation, distributed teams, online planning poker',
      ogImage: '/og-image.png',
    },
  },
  {
    screen: 'guidesStoryPoints',
    path: '/guides/story-points',
    group: 'marketing',
    component: StoryPointsGuide,
    meta: {
      title: `Story Points Guide - ${SITE_NAME}`,
      description: `Understanding and using story points effectively.`,
      keywords: 'story points, agile estimation, relative sizing',
      ogImage: '/og-image.png',
    },
  },
  {
    screen: 'guidesSprintPlanning',
    path: '/guides/sprint-planning',
    group: 'marketing',
    component: SprintPlanningGuide,
    meta: {
      title: `Sprint Planning Guide - ${SITE_NAME}`,
      description: `Run effective sprint planning sessions with your team.`,
      keywords: 'sprint planning, scrum, agile ceremonies',
      ogImage: '/og-image.png',
    },
  },
  {
    screen: 'guidesConsensusBuilding',
    path: '/guides/consensus-building',
    group: 'marketing',
    component: ConsensusBuildingGuide,
    meta: {
      title: `Consensus Building Guide - ${SITE_NAME}`,
      description: `Techniques for building team consensus during estimation.`,
      keywords: 'consensus building, team alignment, estimation discussions',
      ogImage: '/og-image.png',
    },
  },
  {
    screen: 'guidesStructuredVoting',
    path: '/guides/structured-voting',
    group: 'marketing',
    component: StructuredVotingGuide,
    meta: {
      title: `Structured Voting Guide - ${SITE_NAME}`,
      description: `Use structured voting for multi-criteria estimation.`,
      keywords: 'structured voting, multi-criteria, weighted estimation',
      ogImage: '/og-image.png',
    },
  },

  {
    screen: 'login',
    path: '/auth/login',
    group: 'auth',
    component: LoginScreen,
    meta: {
      title: `Login - ${SITE_NAME}`,
      description: `Access your workspace to create and join estimation rooms. Collaborate with your team using ${SITE_NAME}'s planning poker tool.`,
      keywords:
        'login, workspace access, planning poker, estimation rooms, team collaboration',
      ogImage: '/og-image.png',
    },
  },

  {
    screen: 'create',
    path: '/create',
    group: 'flow',
    component: CreateRoomScreen,
    meta: {
      title: `Create Room - ${SITE_NAME}`,
      description:
        'Create a new estimation room for your team. Set up your planning poker session in seconds with customizable voting scales.',
      keywords:
        'create room, planning poker, estimation session, scrum poker, team estimation',
      ogImage: '/og-image.png',
    },
  },
  {
    screen: 'join',
    path: '/join',
    group: 'flow',
    component: JoinRoomScreen,
    meta: {
      title: `Join Room - ${SITE_NAME}`,
      description:
        'Join an existing estimation room. Enter your room code to start collaborating with your team on story point estimation.',
      keywords:
        'join room, planning poker, estimation session, team collaboration',
      ogImage: '/og-image.png',
    },
  },

  {
    screen: 'room',
    path: (params) => (params.roomKey ? `/room/${params.roomKey}` : '/room'),
    pathPattern: /^\/room\/([A-Z0-9]+)$/i,
    group: 'room',
    component: RoomScreen,
    meta: {
      title: `Estimation Room - ${SITE_NAME}`,
      description:
        'Collaborate with your team in real-time. Vote on story points, reveal estimates, and make better sprint planning decisions together.',
      keywords:
        'estimation room, planning poker session, real-time voting, story points, sprint planning',
      ogImage: '/og-image.png',
    },
  },

  {
    screen: 'workspace',
    path: '/workspace',
    group: 'workspace',
    component: WorkspaceDashboard,
    meta: {
      title: `Workspace - ${SITE_NAME}`,
      description:
        'Manage your estimation rooms and collaborate with your team in your workspace. Create, join, and organize planning poker sessions easily.',
      keywords:
        'workspace, estimation rooms, planning poker, team collaboration, scrum poker, agile estimation',
      ogImage: '/og-image.png',
    },
    nav: {
      label: 'Dashboard',
      icon: LayoutDashboard,
      order: 1,
    },
  },
  {
    screen: 'workspaceSessions',
    path: '/workspace/sessions',
    group: 'workspace',
    component: WorkspaceSessions,
    meta: {
      title: `Sessions - ${SITE_NAME}`,
      description:
        'View and manage your team planning sessions. Track active and completed estimation sessions across your workspace.',
      keywords:
        'planning sessions, estimation rooms, team sessions, scrum poker, agile estimation',
      ogImage: '/og-image.png',
    },
    nav: {
      label: 'Sessions',
      icon: Target,
      order: 2,
    },
  },
  {
    screen: 'workspaceAdmin',
    path: '/workspace/admin',
    group: 'workspace',
    component: WorkspaceAdminOverview,
    meta: {
      title: `Admin - ${SITE_NAME}`,
      description:
        'Manage your workspace settings and configuration. Control teams, permissions, and workspace preferences.',
      keywords:
        'workspace admin, team management, workspace settings, administration',
      ogImage: '/og-image.png',
    },
    nav: {
      label: 'Admin',
      icon: Settings,
      order: 2,
      activeForScreens: [
        'workspaceAdmin',
        'workspaceAdminTeams',
        'workspaceAdminSettings',
      ],
    },
  },
  {
    screen: 'workspaceAdminTeams',
    path: '/workspace/admin/teams',
    group: 'workspace',
    component: WorkspaceAdminTeams,
    parent: 'workspaceAdmin',
    meta: {
      title: `Team Management - ${SITE_NAME}`,
      description:
        'Create and manage teams in your workspace. Organize your planning poker sessions by team.',
      keywords:
        'team management, create teams, workspace teams, team administration',
      ogImage: '/og-image.png',
    },
    nav: {
      label: 'Teams',
      icon: Users,
      order: 3,
    },
  },

  {
    screen: '404',
    path: '/404',
    group: 'marketing',
    component: NotFoundScreen,
    meta: {
      title: `Page Not Found - ${SITE_NAME}`,
      description: `The page you are looking for could not be found. Return to ${SITE_NAME} to create or join an estimation room.`,
      keywords: '404, page not found',
      ogImage: '/og-image.png',
    },
  },
] as const satisfies readonly RouteConfig[];

export type AppScreen = (typeof ROUTES)[number]['screen'];

export const getRoomScreenLoader = () => import('@/routes/RoomScreen');
