import { useState } from "react";
import { Link, isRouteErrorResponse, useRouteError } from "react-router";
import { AnimatePresence, motion } from "framer-motion";

import {
  useRoomActions,
  useRoomState,
  useRoomStatus,
} from "@/context/RoomContext";
import { useSessionState } from "@/context/SessionContext";
import { useRoomHeader } from "@/context/RoomHeaderContext";
import { FallbackLoading } from "@/components/ui/FallbackLoading";
import { RoomErrorBanners } from "@/components/errors/RoomErrorBanners";
import { RoomSidebar } from "@/components/layout/RoomSidebar";
import { ActiveRoomContent } from "@/components/room/ActiveRoomContent";
import { CompletedRoomContent } from "@/components/room/CompletedRoomContent";
import { RoomGameOverlay } from "@/components/room/RoomGameOverlay";
import { RoomGuidancePanel } from "@/components/room/RoomGuidancePanel";
import { RoomModals } from "@/components/room/RoomModals";
import { useConsensusCelebration } from "@/hooks/useConsensusCelebration";
import { useLinkedWorkspaceSession } from "@/hooks/useLinkedWorkspaceSession";
import { useRecoveryPasskeyNotice } from "@/hooks/useRecoveryPasskeyNotice";
import { useRoomGameOverlay } from "@/hooks/useRoomGameOverlay";
import { useRoomStats } from "@/hooks/useRoomStats";
import type { ConnectionStatusState, RoomData, ServerDefaults } from "@/types";
import type { RoomSettingsTabId } from "@/components/RoomSettingsTabs";
import { NOINDEX_ROBOTS } from "@/utils/meta";
import { createMeta } from "@/utils/route-meta";

export const meta = createMeta("room", ({ params }) =>
  params.roomKey ? { robots: NOINDEX_ROBOTS } : {},
);

export function ErrorBoundary() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? error.data
    : error instanceof Error
      ? error.message
      : "An unexpected error occurred";
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="text-lg font-semibold text-slate-900 dark:text-white">
        Failed to load room
      </p>
      <p className="text-sm text-slate-600 dark:text-slate-300">{message}</p>
      <Link
        to="/join"
        className="text-sm text-brand-600 underline dark:text-brand-400"
      >
        Back to join
      </Link>
    </div>
  );
}

const getConnectionStatus = (
  isSocketStatusKnown: boolean,
  isSocketConnected: boolean,
): ConnectionStatusState => {
  if (!isSocketStatusKnown) {
    return "connecting";
  }

  return isSocketConnected ? "connected" : "disconnected";
};

const RoomContent = ({
  roomData,
  serverDefaults,
}: {
  roomData: RoomData;
  serverDefaults: ServerDefaults;
}) => {
  const { isModeratorView } = useRoomState();
  const {
    roomError,
    roomErrorKind,
    isSocketConnected,
    isSocketStatusKnown,
    connectionIssue,
  } = useRoomStatus();
  const {
    clearRoomError,
    retryConnection,
    handleLeaveRoom,
    handleSubmitGameMove,
    handleEndGame,
  } = useRoomActions();
  const { name } = useSessionState();
  const {
    isShareModalOpen,
    setIsShareModalOpen,
    isSettingsModalOpen,
    openSettings,
    closeSettings,
    settingsInitialTab,
    isSaveToWorkspaceOpen,
    setIsSaveToWorkspaceOpen,
    isHelpPanelOpen,
    setIsHelpPanelOpen,
  } = useRoomHeader();

  useRecoveryPasskeyNotice({
    feature: "room",
    sessionKey: roomData.key,
    userName: name,
    enabled: isModeratorView && !roomData.settings.autoHandoverModerator,
  });

  const [isQueueModalOpen, setIsQueueModalOpen] = useState(false);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [isCompleteSessionOpen, setIsCompleteSessionOpen] = useState(false);
  const [pendingNextTicket, setPendingNextTicket] = useState(false);
  const [summaryNote, setSummaryNote] = useState("");
  const stats = useRoomStats(roomData);
  useConsensusCelebration({ roomData, stats });

  const {
    linkedWorkspaceSession,
    linkedWorkspaceTeamName,
    showSaveToWorkspace,
    setLinkedWorkspaceSession,
  } = useLinkedWorkspaceSession(roomData.key);
  const {
    gameAnnouncement,
    setGameAnnouncement,
    isGamePanelMinimised,
    setIsGamePanelMinimised,
    gameTitle,
  } = useRoomGameOverlay(roomData);

  const connectionStatus = getConnectionStatus(
    isSocketStatusKnown,
    isSocketConnected,
  );
  const isSpectator = roomData.spectators?.includes(name) ?? false;
  const isQueueEnabled = roomData.settings.enableTicketQueue ?? true;
  const canManageQueue =
    isModeratorView || roomData.settings.allowOthersToManageQueue === true;
  const openSummary = (note: string) => {
    setSummaryNote(note);
    setIsSummaryOpen(true);
  };
  const handleOpenSettings = (tab?: RoomSettingsTabId) => {
    openSettings(tab);
  };

  return (
    <div className="min-h-[calc(100vh-65px)] flex flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white">
      <RoomErrorBanners
        connectionStatus={connectionStatus}
        connectionIssue={connectionIssue}
        roomError={roomError}
        roomErrorKind={roomErrorKind}
        onRetryConnection={retryConnection}
        onLeaveRoom={handleLeaveRoom}
        onClearRoomError={clearRoomError}
      />

      <motion.div
        className="flex flex-1 flex-col py-0 md:grid md:grid-cols-[minmax(280px,360px)_1fr] md:items-start"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="order-2 md:order-none md:h-full md:min-h-0">
          <RoomSidebar
            isQueueEnabled={isQueueEnabled}
            stats={stats}
            setIsQueueModalOpen={setIsQueueModalOpen}
            onOpenQueueSettings={
              isModeratorView ? () => handleOpenSettings("queue") : undefined
            }
            isCompleted={roomData.status === "completed"}
          />
        </div>

        <div className="flex flex-col gap-4 py-3 md:min-h-0 md:py-5 px-4 order-1 md:order-none">
          {roomData.status === "completed" ? (
            <CompletedRoomContent
              roomData={roomData}
              isQueueEnabled={isQueueEnabled}
              linkedWorkspaceSession={linkedWorkspaceSession}
              linkedWorkspaceTeamName={linkedWorkspaceTeamName}
              onWorkspaceSessionSaved={setLinkedWorkspaceSession}
              onOpenRenameWorkspaceSession={() =>
                setIsSaveToWorkspaceOpen(true)
              }
            />
          ) : (
            <ActiveRoomContent
              roomData={roomData}
              stats={stats}
              isModeratorView={isModeratorView}
              isQueueEnabled={isQueueEnabled}
              canManageQueue={canManageQueue}
              isSpectator={isSpectator}
              onOpenSettings={handleOpenSettings}
              onOpenCompleteSession={() => setIsCompleteSessionOpen(true)}
              onOpenSummary={openSummary}
            />
          )}
        </div>
      </motion.div>

      <RoomGameOverlay
        roomData={roomData}
        userName={name}
        gameTitle={gameTitle}
        gameAnnouncement={gameAnnouncement}
        isGamePanelMinimised={isGamePanelMinimised}
        onDismissAnnouncement={() => setGameAnnouncement(null)}
        onExpandPanel={() => setIsGamePanelMinimised(false)}
        onMinimisePanel={() => setIsGamePanelMinimised(true)}
        onSubmitGameMove={handleSubmitGameMove}
        onEndGame={handleEndGame}
      />

      <AnimatePresence>
        {isHelpPanelOpen && (
          <RoomGuidancePanel
            roomData={roomData}
            isModeratorView={isModeratorView}
            onClose={() => setIsHelpPanelOpen(false)}
          />
        )}
      </AnimatePresence>

      <RoomModals
        roomData={roomData}
        serverDefaults={serverDefaults}
        stats={stats}
        isQueueEnabled={isQueueEnabled}
        canManageQueue={canManageQueue}
        showSaveToWorkspace={showSaveToWorkspace}
        linkedWorkspaceSession={linkedWorkspaceSession}
        linkedWorkspaceTeamName={linkedWorkspaceTeamName}
        isSettingsModalOpen={isSettingsModalOpen}
        settingsInitialTab={settingsInitialTab}
        onCloseSettings={closeSettings}
        isShareModalOpen={isShareModalOpen}
        onCloseShareModal={() => setIsShareModalOpen(false)}
        isQueueModalOpen={isQueueModalOpen}
        onCloseQueueModal={() => setIsQueueModalOpen(false)}
        isCompleteSessionOpen={isCompleteSessionOpen}
        onCloseCompleteSession={() => setIsCompleteSessionOpen(false)}
        isSummaryOpen={isSummaryOpen}
        onCloseSummary={() => setIsSummaryOpen(false)}
        summaryNote={summaryNote}
        onSummaryNoteChange={setSummaryNote}
        pendingNextTicket={pendingNextTicket}
        onPendingNextTicketChange={setPendingNextTicket}
        isSaveToWorkspaceOpen={isSaveToWorkspaceOpen}
        onCloseSaveToWorkspace={() => setIsSaveToWorkspaceOpen(false)}
        onOpenSaveToWorkspace={() => setIsSaveToWorkspaceOpen(true)}
        onWorkspaceSessionSaved={setLinkedWorkspaceSession}
      />
    </div>
  );
};

const RoomRoute = () => {
  const { roomData, serverDefaults } = useRoomState();
  const {
    roomError,
    roomErrorKind,
    isSocketConnected,
    isSocketStatusKnown,
    connectionIssue,
  } = useRoomStatus();
  const { retryConnection, handleLeaveRoom, clearRoomError } = useRoomActions();
  const connectionStatus = getConnectionStatus(
    isSocketStatusKnown,
    isSocketConnected,
  );

  if (!roomData || !serverDefaults) {
    return (
      <div className="flex flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white">
        <RoomErrorBanners
          connectionStatus={connectionStatus}
          connectionIssue={connectionIssue}
          roomError={roomError}
          roomErrorKind={roomErrorKind}
          onRetryConnection={retryConnection}
          onLeaveRoom={handleLeaveRoom}
          onClearRoomError={clearRoomError}
        />
        <FallbackLoading />
      </div>
    );
  }

  return <RoomContent roomData={roomData} serverDefaults={serverDefaults} />;
};

export default RoomRoute;
