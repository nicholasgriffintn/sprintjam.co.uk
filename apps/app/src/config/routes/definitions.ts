import { LayoutDashboard, Settings, Target, Users } from "lucide-react";

import type { RouteDefinition, RouteSitemapConfig } from "./types";
import { SITE_NAME } from "@/constants";
import { NOINDEX_ROBOTS } from "@/utils/meta";

const SITEMAP = {
  home: { changefreq: "weekly", priority: 1.0 },
  primary: { changefreq: "weekly", priority: 0.9 },
  section: { changefreq: "monthly", priority: 0.8 },
  page: { changefreq: "monthly", priority: 0.7 },
  guide: { changefreq: "monthly", priority: 0.6 },
  changelog: { changefreq: "weekly", priority: 0.5 },
  legal: { changefreq: "yearly", priority: 0.3 },
} as const satisfies Record<string, RouteSitemapConfig>;

export const ROUTE_DEFINITIONS = [
  {
    screen: "welcome",
    path: "/",
    group: "marketing",
    meta: {
      title: `${SITE_NAME} - Fast, real-time planning poker for distributed teams`,
      description:
        "Estimate stories in minutes with live voting and smart consensus insights, pick a facilitator, run your stand-up. All from one workspace, no sign-ups required.",
      keywords:
        "planning poker, agile estimation, scrum poker, story points, sprint planning, agile, scrum, estimation, team collaboration, facilitator selection, async standups",
      ogImage: "/og-image.png",
    },
    sitemap: SITEMAP.home,
    layout: {
      marketingVariant: "hero",
    },
  },
  {
    screen: "privacy",
    path: "/privacy",
    group: "marketing",
    meta: {
      title: `Privacy Policy - ${SITE_NAME}`,
      description: `Learn how ${SITE_NAME} protects your privacy and handles your data. We respect your privacy and are committed to transparency.`,
      keywords: "privacy policy, data protection, privacy, terms",
      ogImage: "/og-image.png",
    },
    sitemap: SITEMAP.legal,
  },
  {
    screen: "terms",
    path: "/terms",
    group: "marketing",
    meta: {
      title: `Terms and Conditions - ${SITE_NAME}`,
      description: `Read our terms and conditions to understand the rules and guidelines for using ${SITE_NAME}.`,
      keywords: "terms and conditions, terms, conditions",
      ogImage: "/og-image.png",
    },
    sitemap: SITEMAP.legal,
  },
  {
    screen: "changelog",
    path: "/changelog",
    group: "marketing",
    meta: {
      title: `Changelog - ${SITE_NAME}`,
      description: `Keep up with the latest ${SITE_NAME} updates, improvements, and fixes.`,
      keywords: "changelog, release notes, updates",
      ogImage: "/og-image.png",
    },
    sitemap: SITEMAP.changelog,
  },
  {
    screen: "faq",
    path: "/faq",
    group: "marketing",
    meta: {
      title: `FAQ & Planning Guide - ${SITE_NAME}`,
      description: `Answers to common ${SITE_NAME} questions plus a quick guide to running effective Scrum planning poker sessions.`,
      keywords: "faq, sprintjam help, planning poker guide, scrum estimation",
      ogImage: "/og-image.png",
    },
    sitemap: SITEMAP.page,
  },
  {
    screen: "integrations",
    path: "/integrations",
    group: "marketing",
    meta: {
      title: `Integrations - ${SITE_NAME}`,
      description: `Connect ${SITE_NAME} to Jira, Linear, and GitHub with secure per-room OAuth connections and smart syncing.`,
      keywords: "jira integration, linear integration, github integration",
      ogImage: "/og-image.png",
    },
    sitemap: SITEMAP.section,
  },
  {
    screen: "integrationsJira",
    path: "/integrations/jira",
    group: "marketing",
    meta: {
      title: `Jira Integration - ${SITE_NAME}`,
      description: `Import Jira issues, estimate with your team, and sync story points back with ${SITE_NAME}'s secure integration.`,
      keywords: "jira planning poker, jira integration, story point sync",
      ogImage: "/og-image.png",
    },
    sitemap: SITEMAP.page,
  },
  {
    screen: "integrationsLinear",
    path: "/integrations/linear",
    group: "marketing",
    meta: {
      title: `Linear Integration - ${SITE_NAME}`,
      description: `Bring Linear issues into ${SITE_NAME}, estimate together, and keep your roadmap aligned with synced results.`,
      keywords: "linear planning poker, linear integration, story points",
      ogImage: "/og-image.png",
    },
    sitemap: SITEMAP.page,
  },
  {
    screen: "integrationsGithub",
    path: "/integrations/github",
    group: "marketing",
    meta: {
      title: `GitHub Integration - ${SITE_NAME}`,
      description: `Estimate GitHub issues in ${SITE_NAME} and keep engineering work in sync with story point updates.`,
      keywords: "github planning poker, github integration, issue estimation",
      ogImage: "/og-image.png",
    },
    sitemap: SITEMAP.page,
  },
  {
    screen: "guides",
    path: "/guides",
    group: "marketing",
    meta: {
      title: `Guides - ${SITE_NAME}`,
      description:
        "Learn about planning poker, estimation scales, and agile best practices with our comprehensive guides.",
      keywords: "planning poker guides, estimation guides, agile guides",
      ogImage: "/og-image.png",
    },
    sitemap: SITEMAP.section,
  },
  {
    screen: "guidesPlanningPoker",
    path: "/guides/planning-poker",
    group: "marketing",
    meta: {
      title: `Planning Poker Guide - ${SITE_NAME}`,
      description:
        "Learn how to run effective planning poker sessions with your team.",
      keywords: "planning poker guides, estimation guides, agile guides",
      ogImage: "/og-image.png",
    },
    sitemap: SITEMAP.guide,
  },
  {
    screen: "guidesFibonacciScale",
    path: "/guides/fibonacci-scale",
    group: "marketing",
    meta: {
      title: `Fibonacci Scale Guide - ${SITE_NAME}`,
      description:
        "Understand the Fibonacci scale and how to use it for story point estimation.",
      keywords: "fibonacci scale, story points, agile estimation",
      ogImage: "/og-image.png",
    },
    sitemap: SITEMAP.guide,
  },
  {
    screen: "guidesFibonacciShort",
    path: "/guides/fibonacci-short",
    group: "marketing",
    meta: {
      title: `Short Fibonacci Scale Guide - ${SITE_NAME}`,
      description:
        "Learn about the shortened Fibonacci scale for faster estimation.",
      keywords: "fibonacci short, story points, quick estimation",
      ogImage: "/og-image.png",
    },
    sitemap: SITEMAP.guide,
  },
  {
    screen: "guidesDoublingScale",
    path: "/guides/doubling-scale",
    group: "marketing",
    meta: {
      title: `Doubling Scale Guide - ${SITE_NAME}`,
      description: "Explore the doubling scale for effort estimation.",
      keywords: "doubling scale, powers of two, estimation",
      ogImage: "/og-image.png",
    },
    sitemap: SITEMAP.guide,
  },
  {
    screen: "guidesTshirtSizing",
    path: "/guides/tshirt-sizing",
    group: "marketing",
    meta: {
      title: `T-Shirt Sizing Guide - ${SITE_NAME}`,
      description:
        "Use t-shirt sizes (XS, S, M, L, XL) for relative estimation.",
      keywords: "tshirt sizing, relative estimation, agile",
      ogImage: "/og-image.png",
    },
    sitemap: SITEMAP.guide,
  },
  {
    screen: "guidesPlanetScale",
    path: "/guides/planet-scale",
    group: "marketing",
    meta: {
      title: `Planet Scale Guide - ${SITE_NAME}`,
      description: "A fun planet-based scale for estimation sessions.",
      keywords: "planet scale, fun estimation, agile games",
      ogImage: "/og-image.png",
    },
    sitemap: SITEMAP.guide,
  },
  {
    screen: "guidesYesNo",
    path: "/guides/yes-no",
    group: "marketing",
    meta: {
      title: `Yes/No Voting Guide - ${SITE_NAME}`,
      description: "Simple yes/no voting for quick team decisions.",
      keywords: "yes no voting, quick decisions, team voting",
      ogImage: "/og-image.png",
    },
    sitemap: SITEMAP.guide,
  },
  {
    screen: "guidesSimpleScale",
    path: "/guides/simple-scale",
    group: "marketing",
    meta: {
      title: `Simple Scale Guide - ${SITE_NAME}`,
      description: "A straightforward 1-5 scale for estimation.",
      keywords: "simple scale, 1-5 scale, easy estimation",
      ogImage: "/og-image.png",
    },
    sitemap: SITEMAP.guide,
  },
  {
    screen: "guidesHoursEstimates",
    path: "/guides/hours-estimates",
    group: "marketing",
    meta: {
      title: `Hours Estimates Guide - ${SITE_NAME}`,
      description: "Estimate tasks in hours for time-based planning.",
      keywords: "hours estimation, time estimates, task planning",
      ogImage: "/og-image.png",
    },
    sitemap: SITEMAP.guide,
  },
  {
    screen: "guidesSessionRoles",
    path: "/guides/session-roles",
    group: "marketing",
    meta: {
      title: `Session Roles Guide - ${SITE_NAME}`,
      description: "Understanding roles in a planning poker session.",
      keywords: "session roles, moderator, facilitator, scrum master",
      ogImage: "/og-image.png",
    },
    sitemap: SITEMAP.guide,
  },
  {
    screen: "guidesRemoteEstimation",
    path: "/guides/remote-estimation",
    group: "marketing",
    meta: {
      title: `Remote Estimation Guide - ${SITE_NAME}`,
      description: "Tips for running effective remote estimation sessions.",
      keywords: "remote estimation, distributed teams, online planning poker",
      ogImage: "/og-image.png",
    },
    sitemap: SITEMAP.guide,
  },
  {
    screen: "guidesStoryPoints",
    path: "/guides/story-points",
    group: "marketing",
    meta: {
      title: `Story Points Guide - ${SITE_NAME}`,
      description: "Understanding and using story points effectively.",
      keywords: "story points, agile estimation, relative sizing",
      ogImage: "/og-image.png",
    },
    sitemap: SITEMAP.guide,
  },
  {
    screen: "guidesSprintPlanning",
    path: "/guides/sprint-planning",
    group: "marketing",
    meta: {
      title: `Sprint Planning Guide - ${SITE_NAME}`,
      description: "Run effective sprint planning sessions with your team.",
      keywords: "sprint planning, scrum, agile ceremonies",
      ogImage: "/og-image.png",
    },
    sitemap: SITEMAP.guide,
  },
  {
    screen: "guidesConsensusBuilding",
    path: "/guides/consensus-building",
    group: "marketing",
    meta: {
      title: `Consensus Building Guide - ${SITE_NAME}`,
      description: "Techniques for building team consensus during estimation.",
      keywords: "consensus building, team alignment, estimation discussions",
      ogImage: "/og-image.png",
    },
    sitemap: SITEMAP.guide,
  },
  {
    screen: "guidesStructuredVoting",
    path: "/guides/structured-voting",
    group: "marketing",
    meta: {
      title: `Structured Voting Guide - ${SITE_NAME}`,
      description: "Use structured voting for multi-criteria estimation.",
      keywords: "structured voting, multi-criteria, weighted estimation",
      ogImage: "/og-image.png",
    },
    sitemap: SITEMAP.guide,
  },
  {
    screen: "login",
    path: "/auth/login",
    group: "auth",
    meta: {
      title: `Login - ${SITE_NAME}`,
      description: `Access your workspace to create and join estimation rooms. Collaborate with your team using ${SITE_NAME}'s planning poker tool.`,
      keywords:
        "login, workspace access, planning poker, estimation rooms, team collaboration",
      ogImage: "/og-image.png",
      robots: NOINDEX_ROBOTS,
    },
  },
  {
    screen: "create",
    path: "/create",
    group: "flow",
    meta: {
      title: `Create Room - ${SITE_NAME}`,
      description:
        "Create a new estimation room for your team. Set up your planning poker session in seconds with customizable voting scales.",
      keywords:
        "create room, planning poker, estimation session, scrum poker, team estimation",
      ogImage: "/og-image.png",
    },
    sitemap: SITEMAP.primary,
  },
  {
    screen: "join",
    path: "/join",
    group: "flow",
    meta: {
      title: `Join Room - ${SITE_NAME}`,
      description:
        "Join an existing estimation room. Enter your room code to start collaborating with your team on story point estimation.",
      keywords:
        "join room, planning poker, estimation session, team collaboration",
      ogImage: "/og-image.png",
    },
    sitemap: SITEMAP.page,
  },
  {
    screen: "room",
    path: (params) => (params.roomKey ? `/room/${params.roomKey}` : "/room"),
    pathPattern: /^\/room(?:\/([A-Z0-9]+))?$/i,
    group: "room",
    meta: {
      title: `Estimation Room - ${SITE_NAME}`,
      description:
        "Collaborate with your team in real-time. Vote on story points, reveal estimates, and make better sprint planning decisions together.",
      keywords:
        "estimation room, planning poker session, real-time voting, story points, sprint planning",
      ogImage: "/og-image.png",
      robots: NOINDEX_ROBOTS,
    },
  },
  {
    screen: "teamsLaunch",
    path: "/teams/launch",
    group: "collaboration",
    meta: {
      title: `Microsoft Teams - ${SITE_NAME}`,
      description: `Launch ${SITE_NAME} planning sessions from a Microsoft Teams chat or channel.`,
      keywords: "microsoft teams planning poker, teams sprint planning",
      ogImage: "/og-image.png",
      robots: NOINDEX_ROBOTS,
    },
    layout: {
      header: "workspace",
      background: "plain",
    },
  },
  {
    screen: "wheel",
    path: (params) =>
      params.wheelKey ? `/wheel/${params.wheelKey}` : "/wheel",
    pathPattern: /^\/wheel(?:\/([A-Z0-9]+))?$/i,
    group: "wheel",
    meta: {
      title: `Wheel Spinner - ${SITE_NAME}`,
      description:
        "Spin the wheel to randomly select team members. Perfect for standups, code reviews, or any team activity.",
      keywords:
        "wheel spinner, random picker, team selection, name picker, standup picker",
      ogImage: "/og-image.png",
    },
    sitemap: SITEMAP.section,
  },
  {
    screen: "standup",
    path: "/standup",
    group: "standup",
    meta: {
      title: `Standup Facilitator - ${SITE_NAME}`,
      description:
        "Run a clean daily standup with live responses, facilitator controls, and a room built for focused async prep and call-time presentation.",
      keywords:
        "daily standup, standup facilitator, scrum standup, team updates, blockers, agile ceremonies",
      ogImage: "/og-image.png",
    },
    sitemap: SITEMAP.section,
    layout: {
      header: "marketing",
    },
  },
  {
    screen: "standupCreate",
    path: "/standup/create",
    group: "standup",
    meta: {
      title: `Create Standup - ${SITE_NAME}`,
      description:
        "Create a fresh standup room for your team and start collecting daily updates in real time.",
      keywords:
        "create standup, standup room, daily updates, agile standup, facilitator",
      ogImage: "/og-image.png",
    },
    sitemap: SITEMAP.page,
    layout: {
      header: "marketing",
    },
  },
  {
    screen: "standupJoin",
    path: (params) =>
      params.standupKey
        ? `/standup/join/${params.standupKey}`
        : "/standup/join",
    pathPattern: /^\/standup\/join(?:\/([A-Z0-9]+))?$/i,
    group: "standup",
    meta: {
      title: `Join Standup - ${SITE_NAME}`,
      description:
        "Join an existing standup room, submit your update, and stay aligned with the team.",
      keywords:
        "join standup, standup key, daily updates, team standup, agile ceremony",
      ogImage: "/og-image.png",
    },
    sitemap: SITEMAP.page,
    layout: {
      header: "marketing",
    },
  },
  {
    screen: "standupRoom",
    path: (params) =>
      params.standupKey
        ? `/standup/room/${params.standupKey}`
        : "/standup/room",
    pathPattern: /^\/standup\/room\/([A-Z0-9]+)$/i,
    group: "standup",
    meta: {
      title: `Standup Room - ${SITE_NAME}`,
      description:
        "Facilitate your live standup with private responses, presentation controls, and blocker visibility.",
      keywords:
        "standup room, facilitator controls, blockers, daily standup, scrum ceremony",
      ogImage: "/og-image.png",
      robots: NOINDEX_ROBOTS,
    },
    layout: {
      background: "room",
    },
  },
  {
    screen: "retro",
    path: "/retro",
    group: "retro",
    meta: {
      title: `Retrospectives - ${SITE_NAME}`,
      description:
        "Run sprint retrospectives with templates, cards, voting, focus phases, and workspace-linked outcomes.",
      keywords:
        "retrospective, sprint retro, agile retro, scrum retrospective, retro board",
      ogImage: "/og-image.png",
    },
    sitemap: SITEMAP.section,
    layout: {
      header: "marketing",
    },
  },
  {
    screen: "retroTemplates",
    path: "/retro/templates",
    group: "retro",
    meta: {
      title: `Retro Templates - ${SITE_NAME}`,
      description:
        "Choose from retrospective templates including Start Stop Continue, 4Ls, KALM, Sailboat, and Rose Thorn Bud.",
      keywords:
        "retro templates, retrospective templates, agile retrospective formats",
      ogImage: "/og-image.png",
    },
    sitemap: SITEMAP.page,
    layout: {
      header: "marketing",
    },
  },
  {
    screen: "retroCreate",
    path: "/retro/create",
    group: "retro",
    meta: {
      title: `Create Retro - ${SITE_NAME}`,
      description:
        "Create a retrospective room, choose a template, and link it to your workspace.",
      keywords: "create retro, retrospective room, agile retro board",
      ogImage: "/og-image.png",
    },
    sitemap: SITEMAP.page,
    layout: {
      header: "marketing",
    },
  },
  {
    screen: "retroJoin",
    path: (params) =>
      params.retroKey ? `/retro/join/${params.retroKey}` : "/retro/join",
    pathPattern: /^\/retro\/join(?:\/([A-Z0-9]+))?$/i,
    group: "retro",
    meta: {
      title: `Join Retro - ${SITE_NAME}`,
      description:
        "Join an existing retrospective room and add feedback with your team.",
      keywords: "join retro, retrospective room, retro code",
      ogImage: "/og-image.png",
    },
    sitemap: SITEMAP.page,
    layout: {
      header: "marketing",
    },
  },
  {
    screen: "retroRoom",
    path: (params) =>
      params.retroKey ? `/retro/room/${params.retroKey}` : "/retro/room",
    pathPattern: /^\/retro\/room\/([A-Z0-9]+)$/i,
    group: "retro",
    meta: {
      title: `Retro Room - ${SITE_NAME}`,
      description:
        "Facilitate a live retrospective with cards, voting, focus, and actions.",
      keywords: "retro room, retrospective board, agile retro",
      ogImage: "/og-image.png",
      robots: NOINDEX_ROBOTS,
    },
    layout: {
      background: "room",
    },
  },
  {
    screen: "workspace",
    path: "/workspace",
    group: "workspace",
    meta: {
      title: `Workspace - ${SITE_NAME}`,
      description:
        "Manage your estimation rooms and collaborate with your team in your workspace. Create, join, and organize planning poker sessions easily.",
      keywords:
        "workspace, estimation rooms, planning poker, team collaboration, scrum poker, agile estimation",
      ogImage: "/og-image.png",
      robots: NOINDEX_ROBOTS,
    },
    nav: {
      label: "Dashboard",
      icon: LayoutDashboard,
      order: 1,
    },
  },
  {
    screen: "workspaceProfile",
    path: "/workspace/profile",
    group: "workspace",
    meta: {
      title: `Profile - ${SITE_NAME}`,
      description:
        "Set your display name, avatar, and optional image override for SprintJam rooms.",
      keywords:
        "workspace profile, avatar settings, display name, planning poker",
      ogImage: "/og-image.png",
      robots: NOINDEX_ROBOTS,
    },
  },
  {
    screen: "workspaceSessions",
    path: "/workspace/sessions",
    group: "workspace",
    meta: {
      title: `Sessions - ${SITE_NAME}`,
      description:
        "View and manage your team planning sessions. Track active and completed estimation sessions across your workspace.",
      keywords:
        "planning sessions, estimation rooms, team sessions, scrum poker, agile estimation",
      ogImage: "/og-image.png",
      robots: NOINDEX_ROBOTS,
    },
    nav: {
      label: "Sessions",
      icon: Target,
      order: 2,
    },
  },
  {
    screen: "workspaceTeam",
    path: (params) =>
      params.teamSlug
        ? `/workspace/teams/${params.teamSlug}`
        : "/workspace/teams",
    pathPattern: /^\/workspace\/teams\/([a-z]+(?:-[a-z]+){2})$/i,
    group: "workspace",
    parent: "workspaceSessions",
    meta: {
      title: `Team Home - ${SITE_NAME}`,
      description:
        "Open a team landing page to join active sessions or start a new planning room.",
      keywords:
        "team planning page, team sessions, planning poker, workspace team",
      ogImage: "/og-image.png",
      robots: NOINDEX_ROBOTS,
    },
  },
  {
    screen: "workspaceAdmin",
    path: "/workspace/admin",
    group: "workspace",
    meta: {
      title: `Admin - ${SITE_NAME}`,
      description:
        "Manage your workspace settings and configuration. Control teams, permissions, and workspace preferences.",
      keywords:
        "workspace admin, team management, workspace settings, administration",
      ogImage: "/og-image.png",
      robots: NOINDEX_ROBOTS,
    },
    nav: {
      label: "Admin",
      icon: Settings,
      order: 2,
      activeForScreens: [
        "workspaceAdmin",
        "workspaceAdminTeams",
        "workspaceAdminTeamSettings",
      ],
    },
  },
  {
    screen: "workspaceAdminTeams",
    path: "/workspace/admin/teams",
    group: "workspace",
    parent: "workspaceAdmin",
    meta: {
      title: `Team Management - ${SITE_NAME}`,
      description:
        "Create and manage teams in your workspace. Organize your planning poker sessions by team.",
      keywords:
        "team management, create teams, workspace teams, team administration",
      ogImage: "/og-image.png",
      robots: NOINDEX_ROBOTS,
    },
    nav: {
      label: "Teams",
      icon: Users,
      order: 3,
    },
  },
  {
    screen: "workspaceAdminTeamSettings",
    path: "/workspace/admin/teams/settings",
    group: "workspace",
    parent: "workspaceAdminTeams",
    meta: {
      title: `Team Settings - ${SITE_NAME}`,
      description:
        "Configure default room settings and integrations for your team.",
      keywords:
        "team settings, default settings, team integrations, jira, linear, github",
      ogImage: "/og-image.png",
      robots: NOINDEX_ROBOTS,
    },
  },
  {
    screen: "404",
    path: "/404",
    group: "marketing",
    meta: {
      title: `Page Not Found - ${SITE_NAME}`,
      description: `The page you are looking for could not be found. Return to ${SITE_NAME} to create or join an estimation room.`,
      keywords: "404, page not found",
      ogImage: "/og-image.png",
      robots: NOINDEX_ROBOTS,
    },
  },
] as const satisfies readonly RouteDefinition[];

export type AppScreen = (typeof ROUTE_DEFINITIONS)[number]["screen"];
