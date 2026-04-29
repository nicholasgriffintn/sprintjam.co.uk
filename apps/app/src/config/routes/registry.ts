import { lazy } from "react";

import { ROUTE_DEFINITIONS, type AppScreen } from "./definitions";
import type { RouteConfig } from "./types";

const RoomScreen = lazy(() => import("@/routes/RoomScreen"));
const StandupScreen = lazy(() => import("@/routes/standup/StandupScreen"));
const StandupCreateScreen = lazy(
  () => import("@/routes/standup/StandupCreateScreen"),
);
const StandupJoinScreen = lazy(
  () => import("@/routes/standup/StandupJoinScreen"),
);
const StandupRoomScreen = lazy(
  () => import("@/routes/standup/StandupRoomScreen"),
);

import WelcomeScreen from "@/routes/WelcomeScreen";
import LoginScreen from "@/routes/auth/LoginScreen";
import WorkspaceDashboard from "@/routes/workspace/WorkspaceDashboard";
import WorkspaceProfile from "@/routes/workspace/WorkspaceProfile";
import WorkspaceSessions from "@/routes/workspace/WorkspaceSessions";
import WorkspaceAdminOverview from "@/routes/workspace/WorkspaceAdminOverview";
import WorkspaceAdminTeams from "@/routes/workspace/WorkspaceAdminTeams";
import WorkspaceTeamSettings from "@/routes/workspace/WorkspaceTeamSettings";
import CreateRoomScreen from "@/routes/CreateRoomScreen";
import JoinRoomScreen from "@/routes/JoinRoomScreen";
import WheelScreen from "@/routes/wheel/WheelScreen";
import NotFoundScreen from "@/routes/NotFoundScreen";
import FaqScreen from "@/routes/FaqScreen";
import IntegrationsScreen from "@/routes/IntegrationsScreen";
import JiraIntegrationScreen from "@/routes/integrations/JiraIntegrationScreen";
import LinearIntegrationScreen from "@/routes/integrations/LinearIntegrationScreen";
import GithubIntegrationScreen from "@/routes/integrations/GithubIntegrationScreen";
import PrivacyPolicyScreen from "@/routes/PrivacyPolicyScreen";
import TermsConditionsScreen from "@/routes/TermsConditionsScreen";
import ChangelogScreen from "@/routes/ChangelogScreen";
import GuidesScreen from "@/routes/guides/GuidesScreen";
import PlanningPokerGuide from "@/routes/guides/PlanningPokerGuide";
import FibonacciScaleGuide from "@/routes/guides/FibonacciScaleGuide";
import FibonacciShortGuide from "@/routes/guides/FibonacciShortGuide";
import DoublingScaleGuide from "@/routes/guides/DoublingScaleGuide";
import TshirtSizingGuide from "@/routes/guides/TshirtSizingGuide";
import PlanetScaleGuide from "@/routes/guides/PlanetScaleGuide";
import YesNoGuide from "@/routes/guides/YesNoGuide";
import SimpleScaleGuide from "@/routes/guides/SimpleScaleGuide";
import HoursEstimatesGuide from "@/routes/guides/HoursEstimatesGuide";
import SessionRolesGuide from "@/routes/guides/SessionRolesGuide";
import RemoteEstimationGuide from "@/routes/guides/RemoteEstimationGuide";
import StoryPointsGuide from "@/routes/guides/StoryPointsGuide";
import SprintPlanningGuide from "@/routes/guides/SprintPlanningGuide";
import ConsensusBuildingGuide from "@/routes/guides/ConsensusBuildingGuide";
import StructuredVotingGuide from "@/routes/guides/StructuredVotingGuide";

const ROUTE_COMPONENTS: Record<AppScreen, RouteConfig<AppScreen>["component"]> =
  {
    welcome: WelcomeScreen,
    privacy: PrivacyPolicyScreen,
    terms: TermsConditionsScreen,
    changelog: ChangelogScreen,
    faq: FaqScreen,
    integrations: IntegrationsScreen,
    integrationsJira: JiraIntegrationScreen,
    integrationsLinear: LinearIntegrationScreen,
    integrationsGithub: GithubIntegrationScreen,
    guides: GuidesScreen,
    guidesPlanningPoker: PlanningPokerGuide,
    guidesFibonacciScale: FibonacciScaleGuide,
    guidesFibonacciShort: FibonacciShortGuide,
    guidesDoublingScale: DoublingScaleGuide,
    guidesTshirtSizing: TshirtSizingGuide,
    guidesPlanetScale: PlanetScaleGuide,
    guidesYesNo: YesNoGuide,
    guidesSimpleScale: SimpleScaleGuide,
    guidesHoursEstimates: HoursEstimatesGuide,
    guidesSessionRoles: SessionRolesGuide,
    guidesRemoteEstimation: RemoteEstimationGuide,
    guidesStoryPoints: StoryPointsGuide,
    guidesSprintPlanning: SprintPlanningGuide,
    guidesConsensusBuilding: ConsensusBuildingGuide,
    guidesStructuredVoting: StructuredVotingGuide,
    login: LoginScreen,
    create: CreateRoomScreen,
    join: JoinRoomScreen,
    room: RoomScreen,
    wheel: WheelScreen,
    standup: StandupScreen,
    standupCreate: StandupCreateScreen,
    standupJoin: StandupJoinScreen,
    standupRoom: StandupRoomScreen,
    workspace: WorkspaceDashboard,
    workspaceProfile: WorkspaceProfile,
    workspaceSessions: WorkspaceSessions,
    workspaceAdmin: WorkspaceAdminOverview,
    workspaceAdminTeams: WorkspaceAdminTeams,
    workspaceAdminTeamSettings: WorkspaceTeamSettings,
    "404": NotFoundScreen,
  };

const routeByScreen = new Map<AppScreen, RouteConfig<AppScreen>>();

export const ROUTES: readonly RouteConfig<AppScreen>[] = ROUTE_DEFINITIONS.map(
  (route) => {
    const routeConfig = {
      ...route,
      component: ROUTE_COMPONENTS[route.screen],
    } satisfies RouteConfig<AppScreen>;
    routeByScreen.set(route.screen, routeConfig);
    return routeConfig;
  },
);

export function getRouteConfig(
  screen: AppScreen,
): RouteConfig<AppScreen> | undefined {
  return routeByScreen.get(screen);
}

export type { AppScreen } from "./definitions";

export const getRoomScreenLoader = () => import("@/routes/RoomScreen");
