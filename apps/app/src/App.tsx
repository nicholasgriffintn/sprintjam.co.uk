import { Suspense, useEffect, useRef } from "react";
import { MotionConfig } from "framer-motion";

import ErrorBanner from "./components/ui/ErrorBanner";
import LoadingOverlay from "./components/LoadingOverlay";
import { ScreenLoader } from "./components/layout/ScreenLoader";
import { ErrorBoundary } from "./components/errors/ErrorBoundary";
import { Header } from "./components/layout/Header";
import {
  SessionProvider,
  useSessionErrors,
  useSessionState,
} from "./context/SessionContext";
import {
  RoomProvider,
  useRoomActions,
  useRoomState,
  useRoomStatus,
} from "./context/RoomContext";
import { WorkspaceAuthProvider } from "./context/WorkspaceAuthContext";
import { RoomHeaderProvider } from "./context/RoomHeaderContext";
import { ErrorBannerServerDefaults } from "./components/errors/ErrorBannerServerDefaults";
import { PageBackground } from "./components/layout/PageBackground";
import {
  ROUTES,
  getBackgroundVariant,
  getRouteConfig,
  getRoomScreenLoader,
} from "./config/routes";

const preloadRoomScreen = () => {
  void getRoomScreenLoader();
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

    if (screen === "room" || screen === "join" || screen === "create") {
      preloadRoomScreen();
      hasPrefetchedRoomScreen.current = true;
    }
  }, [screen]);

  const showGlobalLoading =
    screen !== "room" && (isLoading || isLoadingDefaults);

  const canRenderRoomScreen =
    Boolean(roomData && serverDefaults && isSocketStatusKnown) ||
    Boolean(connectionIssue);

  const renderScreen = () => {
    const route = getRouteConfig(screen);

    if (!route) {
      const notFoundRoute = ROUTES.find((r) => r.screen === "404");
      if (notFoundRoute) {
        const NotFoundComponent = notFoundRoute.component;
        return <NotFoundComponent />;
      }
      return null;
    }

    if (route.screen === "room" && !canRenderRoomScreen) {
      return (
        <ScreenLoader
          title="Connecting to room"
          subtitle="Please wait a moment."
        />
      );
    }

    const Component = route.component;
    return <Component />;
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

      {error && screen !== "room" && (
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
        console.error("App Error Boundary:", error, errorInfo);
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
