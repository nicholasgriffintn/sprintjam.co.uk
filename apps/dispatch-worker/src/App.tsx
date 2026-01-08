import { Suspense, lazy, useEffect, useRef } from "react";
import { MotionConfig } from "framer-motion";

import ErrorBanner from "./components/ui/ErrorBanner";
import LoadingOverlay from "./components/LoadingOverlay";
import { ScreenLoader } from "./components/layout/ScreenLoader";
import { AppShell } from "./components/layout/AppShell";
import { ErrorBoundary } from "./components/errors/ErrorBoundary";
import {
  SessionProvider,
  useSessionErrors,
  useSessionState,
  type AppScreen,
} from "./context/SessionContext";
import {
  RoomProvider,
  useRoomActions,
  useRoomState,
  useRoomStatus,
} from "./context/RoomContext";
import { WorkspaceAuthProvider } from "./context/WorkspaceAuthContext";
import WelcomeScreen from "./routes/WelcomeScreen";
import LoginScreen from "./routes/auth/LoginScreen";
import VerifyScreen from "./routes/auth/VerifyScreen";
import WorkspaceScreen from "./routes/workspace/WorkspaceScreen";
import CreateRoomScreen from "./routes/CreateRoomScreen";
import JoinRoomScreen from "./routes/JoinRoomScreen";
import NotFoundScreen from "./routes/NotFoundScreen";
import { ErrorBannerServerDefaults } from "./components/errors/ErrorBannerServerDefaults";
import PrivacyPolicyScreen from "./routes/PrivacyPolicyScreen";
import TermsConditionsScreen from "./routes/TermsConditionsScreen";
import ChangelogScreen from "./routes/ChangelogScreen";

const APP_SHELL_SCREENS: AppScreen[] = ["workspace"];

const roomScreenLoader = () => import("./routes/RoomScreen");
const RoomScreen = lazy(roomScreenLoader);
const preloadRoomScreen = () => {
  void roomScreenLoader();
};

const AppContent = () => {
  const { screen } = useSessionState();
  const { error, clearError } = useSessionErrors();
  const { serverDefaults, roomData } = useRoomState();
  const { isLoading, isLoadingDefaults, defaultsError, isSocketStatusKnown } =
    useRoomStatus();
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

  const canRenderRoomScreen = Boolean(
    roomData && serverDefaults && isSocketStatusKnown,
  );

  const renderScreen = () => {
    const getScreenContent = () => {
      switch (screen) {
        case "welcome":
          return <WelcomeScreen />;
        case "login":
          return <LoginScreen />;
        case "verify":
          return <VerifyScreen />;
        case "workspace":
          return <WorkspaceScreen />;
        case "create":
          return <CreateRoomScreen />;
        case "join":
          return <JoinRoomScreen />;
        case "room":
          if (canRenderRoomScreen) {
            return <RoomScreen />;
          }

          return (
            <ScreenLoader
              title="Connecting to room"
              subtitle="Please wait a moment."
            />
          );
        case "privacy":
          return <PrivacyPolicyScreen />;
        case "terms":
          return <TermsConditionsScreen />;
        case "changelog":
          return <ChangelogScreen />;
        default:
          return <NotFoundScreen />;
      }
    };

    const content = getScreenContent();

    if (APP_SHELL_SCREENS.includes(screen)) {
      return <AppShell>{content}</AppShell>;
    }

    return content;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
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
        console.error("App Error Boundary:", error, errorInfo);
      }}
    >
      <SessionProvider currentPath={currentPath}>
        <WorkspaceAuthProvider>
          <RoomProvider>
            <AppContent />
          </RoomProvider>
        </WorkspaceAuthProvider>
      </SessionProvider>
    </ErrorBoundary>
  );
};

export default App;
