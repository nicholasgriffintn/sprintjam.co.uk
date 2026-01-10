import { Suspense, lazy, useEffect, useRef } from "react";
import { MotionConfig } from "framer-motion";

import ErrorBanner from "./components/ui/ErrorBanner";
import LoadingOverlay from "./components/LoadingOverlay";
import { ScreenLoader } from './components/layout/ScreenLoader';
import { ErrorBoundary } from './components/errors/ErrorBoundary';
import { Header } from './components/layout/Header';
import {
  SessionProvider,
  useSessionErrors,
  useSessionState,
} from './context/SessionContext';
import {
  RoomProvider,
  useRoomActions,
  useRoomState,
  useRoomStatus,
} from './context/RoomContext';
import { WorkspaceAuthProvider } from './context/WorkspaceAuthContext';
import { RoomHeaderProvider } from './context/RoomHeaderContext';
import WelcomeScreen from './routes/WelcomeScreen';
import LoginScreen from './routes/auth/LoginScreen';
import WorkspaceScreen from './routes/workspace/WorkspaceScreen';
import CreateRoomScreen from './routes/CreateRoomScreen';
import JoinRoomScreen from './routes/JoinRoomScreen';
import NotFoundScreen from './routes/NotFoundScreen';
import FaqScreen from './routes/FaqScreen';
import IntegrationsScreen from './routes/IntegrationsScreen';
import JiraIntegrationScreen from './routes/integrations/JiraIntegrationScreen';
import LinearIntegrationScreen from './routes/integrations/LinearIntegrationScreen';
import GithubIntegrationScreen from './routes/integrations/GithubIntegrationScreen';
import { ErrorBannerServerDefaults } from './components/errors/ErrorBannerServerDefaults';
import PrivacyPolicyScreen from './routes/PrivacyPolicyScreen';
import TermsConditionsScreen from './routes/TermsConditionsScreen';
import ChangelogScreen from './routes/ChangelogScreen';
import { PageBackground } from './components/layout/PageBackground';
import { getBackgroundVariant } from './utils/layout';

const roomScreenLoader = () => import('./routes/RoomScreen');
const RoomScreen = lazy(roomScreenLoader);
const preloadRoomScreen = () => {
  void roomScreenLoader();
};

const AppContent = () => {
  const { screen } = useSessionState();
  const { error, clearError } = useSessionErrors();
  const { serverDefaults, roomData } = useRoomState();
  const {
    isLoading,
    isLoadingDefaults,
    defaultsError,
    isSocketStatusKnown,
    connectionIssue,
  } = useRoomStatus();
  const { handleRetryDefaults } = useRoomActions();

  const hasPrefetchedRoomScreen = useRef(false);

  useEffect(() => {
    if (hasPrefetchedRoomScreen.current) {
      return;
    }

    if (screen === 'room' || screen === 'join' || screen === 'create') {
      preloadRoomScreen();
      hasPrefetchedRoomScreen.current = true;
    }
  }, [screen]);

  const showGlobalLoading =
    screen !== 'room' && (isLoading || isLoadingDefaults);

  const canRenderRoomScreen =
    Boolean(roomData && serverDefaults && isSocketStatusKnown) ||
    Boolean(connectionIssue);

  const renderScreen = () => {
    const getScreenContent = () => {
      switch (screen) {
        case 'welcome':
          return <WelcomeScreen />;
        case 'login':
          return <LoginScreen />;
        case 'workspace':
          return <WorkspaceScreen />;
        case 'create':
          return <CreateRoomScreen />;
        case 'join':
          return <JoinRoomScreen />;
        case 'room':
          if (canRenderRoomScreen) {
            return <RoomScreen />;
          }

          return (
            <ScreenLoader
              title="Connecting to room"
              subtitle="Please wait a moment."
            />
          );
        case 'privacy':
          return <PrivacyPolicyScreen />;
        case 'terms':
          return <TermsConditionsScreen />;
        case 'changelog':
          return <ChangelogScreen />;
        case 'faq':
          return <FaqScreen />;
        case 'integrations':
          return <IntegrationsScreen />;
        case 'integrationsJira':
          return <JiraIntegrationScreen />;
        case 'integrationsLinear':
          return <LinearIntegrationScreen />;
        case 'integrationsGithub':
          return <GithubIntegrationScreen />;
        default:
          return <NotFoundScreen />;
      }
    };

    const content = getScreenContent();

    return content;
  };

  return (
    <PageBackground variant={getBackgroundVariant(screen)}>
      {showGlobalLoading && <LoadingOverlay />}

      {defaultsError && (
        <ErrorBannerServerDefaults
          defaultsError={defaultsError}
          handleRetryDefaults={handleRetryDefaults}
          isLoadingDefaults={isLoadingDefaults}
        />
      )}

      {error && screen !== 'room' && (
        <ErrorBanner message={error} onClose={clearError} />
      )}

      <Header />

      <MotionConfig reducedMotion="user">
        <main className="flex-1">
          <Suspense fallback={<ScreenLoader />}>{renderScreen()}</Suspense>
        </main>
      </MotionConfig>
    </PageBackground>
  );
};

const App = () => {
  const currentPath = window.location.pathname;

  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error('App Error Boundary:', error, errorInfo);
      }}
    >
      <SessionProvider currentPath={currentPath}>
        <WorkspaceAuthProvider>
          <RoomProvider>
            <RoomHeaderProvider>
              <AppContent />
            </RoomHeaderProvider>
          </RoomProvider>
        </WorkspaceAuthProvider>
      </SessionProvider>
    </ErrorBoundary>
  );
};

export default App;
