import { useMemo, useState } from "react";
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
import { RoomGuidancePanel } from "@/components/room/RoomGuidancePanel";
import { RoomCalloutCard } from "@/components/room/RoomCalloutCard";
import { getVoteSpreadSummary } from "@/utils/room-guidance";
import { useRoomOnboardingHints } from "@/hooks/useRoomOnboardingHints";
import { useFacilitationPrompt } from "@/hooks/useFacilitationPrompt";
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
    handleCompleteSession,
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
  const isSpectator = roomData?.spectators?.includes(name) ?? false;
  const [isQueueModalOpen, setIsQueueModalOpen] = useState(false);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [isCompleteSessionOpen, setIsCompleteSessionOpen] = useState(false);
  const [pendingNextTicket, setPendingNextTicket] = useState(false);
  const [summaryNote, setSummaryNote] = useState("");

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
  const spreadSummary = useMemo(
    () => getVoteSpreadSummary(roomData),
    [roomData.votes, roomData.settings, roomData.judgeMetadata],
  );
  const {
    showSpreadHint,
    showFacilitationOptIn,
    dismissHints,
    enableFacilitationGuidance,
    dismissFacilitationOptIn,
  } = useRoomOnboardingHints({
    roomData,
    isModeratorView,
    spreadSummary,
    onUpdateSettings: handleUpdateSettings,
  });
  const facilitationPrompt = useFacilitationPrompt({
    roomData,
    isModeratorView,
    spreadSummary,
  });

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

  const completedTicketList =
    roomData.ticketQueue?.filter((ticket) => ticket.status === "completed") ??
    [];
  const completedTicketVotes = completedTicketList.reduce(
    (total, ticket) => total + (ticket.votes?.length ?? 0),
    0,
  );
  const completedTicketVoters = completedTicketList.reduce((voters, ticket) => {
    ticket.votes?.forEach((vote) => voters.add(vote.userName));
    return voters;
  }, new Set<string>());

  const getSuggestedNote = () => {
    if (spreadSummary.unknownVoteCount > 0) {
      return "Unknowns flagged; clarify acceptance criteria.";
    }
    if (spreadSummary.isWideSpread) {
      return "Wide spread; align on scope or split the work.";
    }
    return "";
  };

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
          {roomData?.status === "completed" ? (
            <>
              <SurfaceCard padding="md" className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Session summary
                </p>
                <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
                  This room is now read-only.
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Review the notes and votes captured for each ticket.
                </p>
              </SurfaceCard>

              <SurfaceCard
                padding="md"
                variant="subtle"
                className="grid gap-4 text-sm text-slate-600 dark:text-slate-300 md:grid-cols-3"
              >
                <div className="space-y-1">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Participants
                  </div>
                  <div className="text-lg font-semibold text-slate-900 dark:text-white">
                    {roomData.users.length || completedTicketVoters.size}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Items estimated
                  </div>
                  <div className="text-lg font-semibold text-slate-900 dark:text-white">
                    {completedTicketList.length}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Votes recorded
                  </div>
                  <div className="text-lg font-semibold text-slate-900 dark:text-white">
                    {completedTicketVotes}
                  </div>
                </div>
              </SurfaceCard>

              <SurfaceCard padding="md" className="space-y-3 text-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Ticket recap
                </p>
                {completedTicketList.length === 0 ? (
                  <p className="text-slate-600 dark:text-slate-300">
                    No completed tickets recorded for this session.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {completedTicketList.map((ticket) => (
                      <div
                        key={ticket.id}
                        className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                                {ticket.ticketId}
                              </span>
                              {ticket.title && (
                                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                                  {ticket.title}
                                </span>
                              )}
                            </div>
                            {ticket.outcome && (
                              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                                Note: {ticket.outcome}
                              </p>
                            )}
                          </div>
                        </div>
                        {ticket.votes && ticket.votes.length > 0 ? (
                          <div className="mt-3 flex flex-wrap gap-2 text-xs">
                            {ticket.votes.map((vote) => (
                              <span
                                key={`${ticket.id}-${vote.id}`}
                                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                              >
                                <span className="uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                  {vote.userName}
                                </span>
                                <span className="font-mono text-sm text-slate-900 dark:text-white">
                                  {vote.structuredVotePayload
                                    ?.calculatedStoryPoints ?? vote.vote}
                                </span>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                            No votes recorded for this ticket.
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </SurfaceCard>

              <Footer displayRepoLink={false} layout="wide" fullWidth />
            </>
          ) : (
            <>
              {roomData.settings.enableStrudelPlayer && (
                <StrudelMiniPlayer
                  roomData={roomData}
                  isModeratorView={isModeratorView}
                />
              )}

              {showFacilitationOptIn && (
                <RoomCalloutCard
                  badge="Moderator tip"
                  title="Enable facilitation prompts?"
                  body="Prompts will be displayed as the session progresses with tips to run a successful session."
                  primaryAction={{
                    label: "Enable prompts",
                    onClick: enableFacilitationGuidance,
                  }}
                  secondaryAction={{
                    label: "Not now",
                    onClick: dismissFacilitationOptIn,
                  }}
                />
              )}

              {facilitationPrompt && (
                <RoomCalloutCard
                  badge="Facilitation prompt"
                  title={facilitationPrompt.title}
                  body={facilitationPrompt.body}
                />
              )}

              {roomData.settings.enableStructuredVoting &&
              roomData.settings.votingCriteria ? (
                <StructuredVotingPanel
                  criteria={roomData.settings.votingCriteria}
                  currentVote={
                    roomData.structuredVotes?.[
                      getVoteKeyForUser(roomData, name)
                    ] || null
                  }
                  onVote={handleVote}
                  displaySettings={roomData.settings.structuredVotingDisplay}
                  currentUserVote={userVote}
                  onOpenVotingSettings={
                    isModeratorView
                      ? () => handleOpenSettings("voting")
                      : undefined
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
                    isModeratorView
                      ? () => handleOpenSettings("voting")
                      : undefined
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
                  onNextTicket={() => {
                    const existingNote = roomData.currentTicket?.outcome ?? "";
                    setSummaryNote(existingNote || getSuggestedNote());
                    setIsSummaryOpen(true);
                  }}
                  onCompleteSession={
                    canManageQueue
                      ? () => setIsCompleteSessionOpen(true)
                      : undefined
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
                    {showSpreadHint && (
                      <div className="mb-4">
                        <RoomCalloutCard
                          badge="Hint"
                          title="Wide spread after reveal"
                          body={
                            spreadSummary.highestVoteValue !== null &&
                            spreadSummary.lowestVoteValue !== null
                              ? `Ask the ${spreadSummary.highestVoteValue} and ${spreadSummary.lowestVoteValue} voters to explain their thinking.`
                              : "Ask the highest and lowest voters to explain their thinking."
                          }
                          primaryAction={{
                            label: "Got it",
                            onClick: dismissHints,
                          }}
                        />
                      </div>
                    )}

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
            </>
          )}
        </div>
      </motion.div>

      <AnimatePresence>
        {isHelpPanelOpen && (
          <RoomGuidancePanel
            roomData={roomData}
            isModeratorView={isModeratorView}
            onClose={() => setIsHelpPanelOpen(false)}
          />
        )}
      </AnimatePresence>

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
        onCompleteSession={handleCompleteSession}
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
        note={summaryNote}
        onNoteChange={setSummaryNote}
        onConfirm={async () => {
          if (pendingNextTicket) return;
          setPendingNextTicket(true);
          try {
            const trimmedNote = summaryNote.trim();
            if (roomData.currentTicket) {
              const existingNote = roomData.currentTicket.outcome ?? "";
              if (trimmedNote !== existingNote) {
                await handleUpdateTicket(roomData.currentTicket.id, {
                  outcome: trimmedNote || undefined,
                });
              }
            }
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
