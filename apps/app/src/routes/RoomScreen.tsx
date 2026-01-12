import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import {
  useRoomActions,
  useRoomState,
  useRoomStatus,
} from "@/context/RoomContext";
import { useSessionState } from "@/context/SessionContext";
import { useRoomHeader } from "@/context/RoomHeaderContext";
import { useRoomStats } from "@/hooks/useRoomStats";
import { useConsensusCelebration } from "@/hooks/useConsensusCelebration";
import { UserEstimate } from "@/components/voting/UserEstimate";
import { ResultsControls } from "@/components/results/ResultsControls";
import { VotesHidden } from "@/components/results/VotesHidden";
import { StructuredVotingPanel } from "@/components/voting/StructuredVotingPanel";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { StrudelMiniPlayer } from "@/components/StrudelPlayer/StrudelMiniPlayer";
import { FallbackLoading } from "@/components/ui/FallbackLoading";
import { TicketQueueModal } from "@/components/modals/TicketQueueModal";
import { PrePointingSummaryModal } from "@/components/modals/PrePointingSummaryModal";
import { QueueProviderSetupModal } from "@/components/modals/QueueProviderSetupModal";
import { RoomErrorBanners } from "@/components/errors/RoomErrorBanners";
import { RoomSidebar } from "@/components/layout/RoomSidebar";
import { getVoteKeyForUser } from "@/utils/room";
import { useDisplayQueueSetup } from "@/hooks/useDisplayQueueSetup";
import { usePageMeta } from "@/hooks/usePageMeta";
import { META_CONFIGS } from "@/config/meta";
import { Footer } from "@/components/layout/Footer";
import ShareRoomModal from "@/components/modals/ShareRoomModal";
import SettingsModal from "@/components/modals/SettingsModal";
import { SaveToWorkspaceModal } from "@/components/modals/SaveToWorkspaceModal";
import { CompleteSessionModal } from "@/components/modals/CompleteSessionModal";
import { UnifiedResults } from "@/components/results/UnifiedResults";
import { isWorkspacesEnabled } from "@/utils/feature-flags";
import type { ConnectionStatusState } from "@/types";
import type { RoomSettingsTabId } from "@/components/RoomSettingsTabs";

const RoomScreen = () => {
  usePageMeta(META_CONFIGS.room);
  const { roomData, isModeratorView, userVote, serverDefaults } =
    useRoomState();
  const {
    roomError,
    roomErrorKind,
    isSocketConnected,
    isSocketStatusKnown,
    connectionIssue,
  } = useRoomStatus();
  const {
    handleVote,
    handleToggleShowVotes,
    handleResetVotes,
    handleUpdateSettings,
    handleSelectTicket,
    handleNextTicket,
    handleAddTicket,
    handleUpdateTicket,
    handleDeleteTicket,
    clearRoomError,
    reportRoomError,
    retryConnection,
    handleLeaveRoom,
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
  } = useRoomHeader();
  const isSpectator = roomData?.spectators?.includes(name) ?? false;
  const [isQueueModalOpen, setIsQueueModalOpen] = useState(false);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [isCompleteSessionOpen, setIsCompleteSessionOpen] = useState(false);
  const [pendingNextTicket, setPendingNextTicket] = useState(false);

  const connectionStatus: ConnectionStatusState = isSocketStatusKnown
    ? isSocketConnected
      ? "connected"
      : "disconnected"
    : "connecting";

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

  const stats = useRoomStats(roomData);
  useConsensusCelebration({ roomData, stats });

  const isQueueEnabled = roomData.settings.enableTicketQueue ?? true;
  const queueProvider = roomData.settings.externalService || "none";
  const canManageQueue =
    isModeratorView || roomData.settings.allowOthersToManageQueue === true;
  const showSaveToWorkspace = isWorkspacesEnabled();

  const { isQueueSetupModalOpen, setIsQueueSetupModalOpen } =
    useDisplayQueueSetup({
      isQueueEnabled: isQueueEnabled,
      queueProvider: queueProvider,
      roomData: roomData,
      name: name,
    });

  const handleOpenSettings = (tab?: RoomSettingsTabId) => {
    openSettings(tab);
  };

  const handleCloseSettings = () => {
    closeSettings();
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
        <RoomSidebar
          isQueueEnabled={isQueueEnabled}
          stats={stats}
          setIsQueueModalOpen={setIsQueueModalOpen}
          onOpenQueueSettings={
            isModeratorView ? () => handleOpenSettings("queue") : undefined
          }
        />

        <div className="flex flex-col gap-4 py-3 md:min-h-0 md:py-5 px-4">
          {roomData.settings.enableStrudelPlayer && (
            <StrudelMiniPlayer
              roomData={roomData}
              isModeratorView={isModeratorView}
            />
          )}

          {roomData.settings.enableStructuredVoting &&
          roomData.settings.votingCriteria ? (
            <StructuredVotingPanel
              criteria={roomData.settings.votingCriteria}
              currentVote={
                roomData.structuredVotes?.[getVoteKeyForUser(roomData, name)] ||
                null
              }
              onVote={handleVote}
              displaySettings={roomData.settings.structuredVotingDisplay}
              onOpenVotingSettings={
                isModeratorView ? () => handleOpenSettings("voting") : undefined
              }
              disabled={isSpectator}
            />
          ) : (
            <UserEstimate
              roomData={roomData}
              name={name}
              userVote={typeof userVote === "object" ? null : userVote}
              onVote={handleVote}
              onOpenVotingSettings={
                isModeratorView ? () => handleOpenSettings("voting") : undefined
              }
              disabled={isSpectator}
            />
          )}

          {roomData.users.length > 0 && (
            <ResultsControls
              roomData={roomData}
              isModeratorView={isModeratorView}
              queueEnabled={isQueueEnabled}
              onToggleShowVotes={handleToggleShowVotes}
              onResetVotes={handleResetVotes}
              onNextTicket={() => setIsSummaryOpen(true)}
              onCompleteSession={
                canManageQueue ? () => setIsCompleteSessionOpen(true) : undefined
              }
              onOpenResultsSettings={
                isModeratorView
                  ? () => handleOpenSettings("results")
                  : undefined
              }
              onRevisitLater={async () => {
                if (!roomData.currentTicket) return;
                const pendingQueue = roomData.ticketQueue || [];
                const maxOrdinal =
                  pendingQueue.reduce(
                    (max, t) => (t.ordinal > max ? t.ordinal : max),
                    0,
                  ) + 1;
                await handleUpdateTicket(roomData.currentTicket.id, {
                  status: "pending",
                  ordinal: maxOrdinal,
                });
                handleNextTicket();
              }}
            />
          )}

          <AnimatePresence mode="wait">
            {roomData.showVotes ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.3 }}
                key="results"
              >
                <SurfaceCard
                  padding="sm"
                  className="space-y-5"
                  data-testid="results-panel"
                >
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <UnifiedResults
                      roomData={roomData}
                      stats={stats}
                      criteria={roomData.settings.votingCriteria}
                      displayJudge={roomData.settings.enableJudge}
                      showVotes={roomData.showVotes}
                    />
                  </motion.div>
                </SurfaceCard>

                <Footer displayRepoLink={false} layout="wide" fullWidth />
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.3 }}
                key="waiting"
              >
                <SurfaceCard
                  padding="sm"
                  variant="subtle"
                  className="flex items-center justify-center border-dashed text-center dark:border-slate-800/80"
                  data-testid="votes-hidden-panel"
                >
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.3 }}
                  >
                    <VotesHidden
                      votes={roomData.votes}
                      structuredVotes={roomData.structuredVotes}
                      isStructuredVotingEnabled={
                        roomData.settings.enableStructuredVoting
                      }
                      users={roomData.users}
                      currentUserName={name}
                      isAnonymousVoting={roomData.settings.anonymousVotes}
                    />
                  </motion.div>
                </SurfaceCard>

                <Footer displayRepoLink={false} layout="wide" fullWidth />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <AnimatePresence>
        {isSettingsModalOpen && (
          <SettingsModal
            isOpen={isSettingsModalOpen}
            onClose={handleCloseSettings}
            settings={roomData.settings}
            onSaveSettings={handleUpdateSettings}
            defaultSettings={serverDefaults.roomSettings}
            structuredVotingOptions={serverDefaults.structuredVotingOptions}
            votingPresets={serverDefaults.votingSequences}
            extraVoteOptions={serverDefaults.extraVoteOptions}
            defaultSequenceId={serverDefaults.roomSettings.votingSequenceId}
            initialTab={settingsInitialTab}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isShareModalOpen && (
          <ShareRoomModal
            isOpen={isShareModalOpen}
            onClose={() => setIsShareModalOpen(false)}
            roomKey={roomData.key}
          />
        )}
      </AnimatePresence>

      <TicketQueueModal
        isOpen={isQueueModalOpen}
        onClose={() => setIsQueueModalOpen(false)}
        currentTicket={roomData.currentTicket}
        queue={roomData.ticketQueue || []}
        externalService={roomData.settings.externalService || "none"}
        roomKey={roomData.key}
        userName={name}
        onAddTicket={handleAddTicket}
        onUpdateTicket={handleUpdateTicket}
        onDeleteTicket={handleDeleteTicket}
        onSelectTicket={handleSelectTicket}
        canManageQueue={canManageQueue}
        onError={reportRoomError}
      />

      <CompleteSessionModal
        isOpen={isCompleteSessionOpen}
        onClose={() => setIsCompleteSessionOpen(false)}
        isQueueEnabled={isQueueEnabled}
        currentTicket={roomData.currentTicket}
        queue={roomData.ticketQueue || []}
        externalService={roomData.settings.externalService || "none"}
        roomKey={roomData.key}
        userName={name}
        onAddTicket={handleAddTicket}
        onUpdateTicket={handleUpdateTicket}
        onDeleteTicket={handleDeleteTicket}
        canManageQueue={false}
        onSaveToWorkspace={() => setIsSaveToWorkspaceOpen(true)}
        showSaveToWorkspace={showSaveToWorkspace}
        onError={reportRoomError}
      />

      {isQueueEnabled && queueProvider !== "none" && (
        <QueueProviderSetupModal
          isOpen={isQueueSetupModalOpen}
          provider={queueProvider as "jira" | "linear" | "github"}
          onClose={() => setIsQueueSetupModalOpen(false)}
          onOpenQueue={() => {
            setIsQueueModalOpen(true);
            setIsQueueSetupModalOpen(false);
          }}
        />
      )}

      <PrePointingSummaryModal
        isOpen={isSummaryOpen}
        onClose={() => setIsSummaryOpen(false)}
        votes={roomData.votes}
        stats={stats}
        currentTicket={roomData.currentTicket}
        currentUser={name}
        onConfirm={async () => {
          if (pendingNextTicket) return;
          setPendingNextTicket(true);
          try {
            handleNextTicket();
          } finally {
            setPendingNextTicket(false);
            setIsSummaryOpen(false);
          }
        }}
      />

      <SaveToWorkspaceModal
        isOpen={isSaveToWorkspaceOpen}
        onClose={() => setIsSaveToWorkspaceOpen(false)}
        roomKey={roomData.key}
        suggestedName={roomData.currentTicket?.title}
      />
    </div>
  );
};

export default RoomScreen;
