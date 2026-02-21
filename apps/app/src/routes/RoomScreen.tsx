import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gamepad2, Maximize2, X } from "lucide-react";

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
import { RoomGamesModal } from "@/components/games/RoomGamesModal";
import { RoomGamePanel } from "@/components/games/RoomGamePanel";
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
    handleStartGame,
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
  const isSpectator = roomData?.spectators?.includes(name) ?? false;
  const [isQueueModalOpen, setIsQueueModalOpen] = useState(false);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [isCompleteSessionOpen, setIsCompleteSessionOpen] = useState(false);
  const [pendingNextTicket, setPendingNextTicket] = useState(false);
  const [summaryNote, setSummaryNote] = useState("");
  const [isGamesModalOpen, setIsGamesModalOpen] = useState(false);
  const [gameAnnouncement, setGameAnnouncement] = useState<string | null>(null);
  const [isGamePanelMinimised, setIsGamePanelMinimised] = useState(false);

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

  useEffect(() => {
    if (!roomData.gameSession || roomData.gameSession.status !== "active") {
      return;
    }

    setGameAnnouncement(
      `${roomData.gameSession.startedBy} started ${roomData.gameSession.type.replace(/-/g, " ")}. Jump in from the game panel!`,
    );
    setIsGamePanelMinimised(false);
    const timeout = setTimeout(() => setGameAnnouncement(null), 6000);

    return () => clearTimeout(timeout);
  }, [roomData.gameSession?.startedAt]);

  useEffect(() => {
    if (!roomData.gameSession) {
      setIsGamePanelMinimised(false);
    }
  }, [roomData.gameSession]);

  const gameTitle = roomData.gameSession
    ? roomData.gameSession.type
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ")
    : "";
  const completedTicketList =
    roomData.ticketQueue?.filter((ticket) => ticket.status === "completed") ??
    [];
  const sessionRecapEntries = useMemo(() => {
    if (roomData.roundHistory && roomData.roundHistory.length > 0) {
      return roomData.roundHistory.map((entry, index) => ({
        id: entry.id,
        ticketId: entry.ticketId ?? `ROUND-${index + 1}`,
        title: entry.ticketTitle,
        outcome: entry.outcome,
        votes: entry.votes,
      }));
    }

    return completedTicketList.map((ticket) => ({
      id: `ticket-${ticket.id}`,
      ticketId: ticket.ticketId,
      title: ticket.title,
      outcome: ticket.outcome,
      votes: ticket.votes ?? [],
    }));
  }, [completedTicketList, roomData.roundHistory]);
  const sessionRecapVotes = sessionRecapEntries.reduce(
    (total, entry) => total + entry.votes.length,
    0,
  );
  const sessionRecapVoters = sessionRecapEntries.reduce((voters, entry) => {
    entry.votes.forEach((vote) => voters.add(vote.userName));
    return voters;
  }, new Set<string>());
  const uniqueEstimatedItems = new Set(
    sessionRecapEntries.map((entry) => entry.ticketId),
  ).size;
  const estimatedItemCount = isQueueEnabled
    ? uniqueEstimatedItems || sessionRecapEntries.length
    : sessionRecapEntries.length;
  const estimatedItemLabel = isQueueEnabled
    ? "Items estimated"
    : "Rounds completed";
  const recapTitle = isQueueEnabled ? "Ticket recap" : "Round recap";
  const emptyRecapMessage = isQueueEnabled
    ? "No completed tickets or rounds recorded for this session."
    : "No completed rounds recorded for this session.";

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
                  Review the notes and votes captured for each{" "}
                  {isQueueEnabled ? "ticket" : "round"}.
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
                    {roomData.users.length || sessionRecapVoters.size}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {estimatedItemLabel}
                  </div>
                  <div className="text-lg font-semibold text-slate-900 dark:text-white">
                    {estimatedItemCount}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Votes recorded
                  </div>
                  <div className="text-lg font-semibold text-slate-900 dark:text-white">
                    {sessionRecapVotes}
                  </div>
                </div>
              </SurfaceCard>

              <SurfaceCard padding="md" className="space-y-3 text-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  {recapTitle}
                </p>
                {sessionRecapEntries.length === 0 ? (
                  <p className="text-slate-600 dark:text-slate-300">
                    {emptyRecapMessage}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {sessionRecapEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                                {entry.ticketId}
                              </span>
                              {entry.title && (
                                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                                  {entry.title}
                                </span>
                              )}
                            </div>
                            {entry.outcome && (
                              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                                Note: {entry.outcome}
                              </p>
                            )}
                          </div>
                        </div>
                        {entry.votes.length > 0 ? (
                          <div className="mt-3 flex flex-wrap gap-2 text-xs">
                            {entry.votes.map((vote, index) => (
                              <span
                                key={`${entry.id}-${vote.userName}-${vote.votedAt}-${index}`}
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
                            No votes recorded for this{" "}
                            {isQueueEnabled ? "ticket" : "round"}.
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </SurfaceCard>

              <Footer
                displayRepoLink={false}
                layout="wide"
                fullWidth
                onOpenGames={() => setIsGamesModalOpen(true)}
              />
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

                    <Footer
                      displayRepoLink={false}
                      layout="wide"
                      fullWidth
                      onOpenGames={() => setIsGamesModalOpen(true)}
                    />
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

                    <Footer
                      displayRepoLink={false}
                      layout="wide"
                      fullWidth
                      onOpenGames={() => setIsGamesModalOpen(true)}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </div>
      </motion.div>

      <AnimatePresence>
        {gameAnnouncement ? (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="fixed left-4 right-4 top-20 z-40 sm:left-auto sm:max-w-md"
          >
            <SurfaceCard
              padding="sm"
              variant="subtle"
              className="border-brand-300/60 bg-brand-50/90 text-sm text-brand-900 shadow-lg dark:border-brand-300/30 dark:bg-brand-400/15 dark:text-brand-100"
            >
              <div className="flex items-start gap-3">
                <p className="flex-1">{gameAnnouncement}</p>
                <button
                  type="button"
                  onClick={() => setGameAnnouncement(null)}
                  className="rounded-md p-1 text-brand-700 transition hover:bg-brand-100 hover:text-brand-900 dark:text-brand-100 dark:hover:bg-brand-300/20"
                  aria-label="Close game notification"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </SurfaceCard>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {roomData.gameSession ? (
        <div className="pointer-events-none fixed bottom-4 left-4 z-30 w-[calc(100vw-2rem)] sm:w-[min(520px,calc(100vw-2rem))]">
          <div className="pointer-events-auto">
            {isGamePanelMinimised ? (
              <button
                type="button"
                onClick={() => setIsGamePanelMinimised(false)}
                className="flex w-full items-center justify-between gap-3 rounded-2xl border border-brand-300/70 bg-white/95 px-4 py-3 text-left text-slate-900 shadow-lg backdrop-blur dark:border-brand-400/30 dark:bg-slate-900/95 dark:text-white"
                aria-label="Expand party game panel"
              >
                <span className="inline-flex items-center gap-2 text-sm font-semibold">
                  <Gamepad2 className="h-4 w-4 text-brand-600 dark:text-brand-200" />
                  {gameTitle}
                </span>
                <span className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                  {roomData.gameSession.status === "active"
                    ? `Round ${roomData.gameSession.round}`
                    : "Game over"}
                  <Maximize2 className="h-4 w-4" />
                </span>
              </button>
            ) : (
              <RoomGamePanel
                roomData={roomData}
                userName={name}
                onSubmitMove={handleSubmitGameMove}
                onEndGame={handleEndGame}
                onMinimise={() => setIsGamePanelMinimised(true)}
              />
            )}
          </div>
        </div>
      ) : null}

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

      <RoomGamesModal
        isOpen={isGamesModalOpen}
        roomData={roomData}
        onClose={() => setIsGamesModalOpen(false)}
        onStartGame={handleStartGame}
      />

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
        roundHistory={roomData.roundHistory}
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
        roundHistory={roomData.roundHistory}
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
        recordedRoundsCount={roomData.roundHistory?.length ?? 0}
        currentRoundVoteCount={Object.keys(roomData.votes).length}
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
