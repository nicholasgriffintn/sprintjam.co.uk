import { Suspense, lazy, useEffect } from 'react';
import { MotionConfig } from 'framer-motion';

import ErrorBanner from './components/ui/ErrorBanner';
import LoadingOverlay from './components/LoadingOverlay';
import { ScreenLoader } from './components/layout/ScreenLoader';
import { ErrorBoundary } from './components/errors/ErrorBoundary';
import { SessionProvider } from './context/SessionContext';
import { RoomProvider, useRoom } from './context/RoomContext';
import { useSession } from './context/SessionContext';
import WelcomeScreen from './routes/WelcomeScreen';
import CreateRoomScreen from './routes/CreateRoomScreen';
import JoinRoomScreen from './routes/JoinRoomScreen';
import NotFoundScreen from './routes/NotFoundScreen';
import { ErrorBannerServerDefaults } from './components/errors/ErrorBannerServerDefaults';
import PrivacyPolicyScreen from './routes/PrivacyPolicyScreen';
import TermsConditionsScreen from './routes/TermsConditionsScreen';
import TeamsTabConfigScreen from './routes/teams/TeamsTabConfigScreen';
import TeamsHomeScreen from './routes/teams/TeamsHomeScreen';
import TeamsRoomScreen from './routes/teams/TeamsRoomScreen';
import { useTeamsContext } from './hooks/useTeamsContext';

const RoomScreen = lazy(() => import('./routes/RoomScreen'));

const AppContent = () => {
  const { screen, error, clearError } = useSession();
  const {
    serverDefaults,
    roomData,
    isLoading,
    isLoadingDefaults,
    defaultsError,
    handleRetryDefaults,
  } = useRoom();
  const teamsContext = useTeamsContext();

  // Sync Teams theme with app
  useEffect(() => {
    if (!teamsContext.isInTeams || !teamsContext.theme) {
      return;
    }

    const isDarkMode = teamsContext.theme === 'dark' || teamsContext.theme === 'contrast';

    // Apply dark mode class to document
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [teamsContext.isInTeams, teamsContext.theme]);

  const renderScreen = () => {
    switch (screen) {
      case 'welcome':
        return <WelcomeScreen />;
      case 'create':
        return <CreateRoomScreen />;
      case 'join':
        return <JoinRoomScreen />;
      case 'room':
        if (roomData && serverDefaults) {
          return <RoomScreen />;
        }

        return (
          <ScreenLoader title="Loading room" subtitle="Please wait a moment." />
        );
      case 'privacy':
        return <PrivacyPolicyScreen />;
      case 'terms':
        return <TermsConditionsScreen />;
      case 'teams/config':
        return <TeamsTabConfigScreen />;
      case 'teams/home':
        return <TeamsHomeScreen />;
      case 'teams/room':
        return <TeamsRoomScreen />;
      default:
        return <NotFoundScreen />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {(isLoading || isLoadingDefaults) && <LoadingOverlay />}

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

      <MotionConfig reducedMotion="user">
        <Suspense fallback={<ScreenLoader />}>{renderScreen()}</Suspense>
      </MotionConfig>
    </div>
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
        <RoomProvider>
          <AppContent />
        </RoomProvider>
      </SessionProvider>
    </ErrorBoundary>
  );
};

export default App;
