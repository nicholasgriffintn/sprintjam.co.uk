import { useState, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { useRoom } from '@/context/RoomContext';
import { useSession } from '@/context/SessionContext';
import { useRoomStats } from '@/hooks/useRoomStats';
import { useConsensusCelebration } from '@/hooks/useConsensusCelebration';
import ErrorBanner from '@/components/ui/ErrorBanner';
import Header from '@/components/Header';
import { Timer } from '@/components/voting/Timer';
import { UserEstimate } from '@/components/voting/UserEstimate';
import { ResultsControls } from '@/components/results/ResultsControls';
import { VotesHidden } from '@/components/results/VotesHidden';
import { StructuredVotingPanel } from '@/components/voting/StructuredVotingPanel';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { StrudelMiniPlayer } from '@/components/StrudelPlayer/StrudelMiniPlayer';
import { FallbackLoading } from '@/components/ui/FallbackLoading';
import { TicketQueueModal } from '@/components/modals/TicketQueueModal';
import { PrePointingSummaryModal } from '@/components/modals/PrePointingSummaryModal';
import { QueueProviderSetupModal } from '@/components/modals/QueueProviderSetupModal';
import { ErrorBannerAuth } from '@/components/errors/ErrorBannerAuth';
import { ErrorBannerConnection } from '@/components/errors/ErrorBannerConnection';
import { RoomSidebar } from '@/components/layout/RoomSidebar';
import { TableView } from '@/components/layout/TableView';
import { getVoteKeyForUser } from '@/utils/room';
import { useDisplayQueueSetup } from '@/hooks/useDisplayQueueSetup';
import { usePageMeta } from '@/hooks/usePageMeta';
import { META_CONFIGS } from '@/config/meta';
import { Footer } from '@/components/layout/Footer';

const SettingsModal = lazy(() => import('@/components/modals/SettingsModal'));
const ShareRoomModal = lazy(() => import('@/components/modals/ShareRoomModal'));
const UnifiedResults = lazy(() =>
  import('@/components/results/UnifiedResults').then((m) => ({
    default: m.UnifiedResults,
  }))
);
const RoomScreen = () => {
  usePageMeta(META_CONFIGS.room);
  const {
    roomData,
    isModeratorView,
    userVote,
    serverDefaults,
    handleVote,
    handleToggleShowVotes,
    handleResetVotes,
    handleUpdateSettings,
    handleNextTicket,
    handleAddTicket,
    handleUpdateTicket,
    handleDeleteTicket,
    roomError,
    roomErrorKind,
    clearRoomError,
    reportRoomError,
    isSocketConnected,
    connectionIssue,
    retryConnection,
    handleLeaveRoom,
  } = useRoom();
  const { name } = useSession();
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isQueueModalOpen, setIsQueueModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [pendingNextTicket, setPendingNextTicket] = useState(false);

  if (!roomData || !serverDefaults) {
    return <FallbackLoading />;
  }

  const stats = useRoomStats(roomData);
  useConsensusCelebration({ roomData, stats });

  const isQueueEnabled = roomData.settings.enableTicketQueue ?? false;
  const queueProvider = roomData.settings.externalService || 'none';

  const { isQueueSetupModalOpen, setIsQueueSetupModalOpen } =
    useDisplayQueueSetup({
      isQueueEnabled: isQueueEnabled,
      queueProvider: queueProvider,
      roomData: roomData,
      name: name,
    });

  const showReconnectBanner =
    connectionIssue?.type === 'disconnected' ||
    (!isSocketConnected && !connectionIssue);

  const showAuthBanner = connectionIssue?.type === 'auth';

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white">
      {showAuthBanner && (
        <ErrorBannerAuth
          onRetryConnection={retryConnection}
          onLeaveRoom={handleLeaveRoom}
        />
      )}

      {!showAuthBanner && (connectionIssue || showReconnectBanner) && (
        <ErrorBannerConnection
          connectionIssue={connectionIssue}
          onRetryConnection={retryConnection}
        />
      )}

      {roomError && (
        <ErrorBanner
          message={roomError}
          onClose={clearRoomError}
          variant={roomErrorKind === 'permission' ? 'warning' : 'error'}
        />
      )}

      <Header
        roomData={roomData}
        isModeratorView={isModeratorView}
        isConnected={isSocketConnected}
        onLeaveRoom={handleLeaveRoom}
        setIsShareModalOpen={setIsShareModalOpen}
        setIsSettingsModalOpen={setIsSettingsModalOpen}
        onViewModeChange={(viewMode) => {
          handleUpdateSettings({ ...roomData.settings, viewMode });
        }}
      />

      <motion.div
        className={
          roomData.settings.viewMode === 'table'
            ? 'flex flex-1 flex-col py-0'
            : 'flex flex-1 flex-col py-0 md:grid md:grid-cols-[minmax(280px,360px)_1fr] md:items-start'
        }
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {roomData.settings.viewMode !== 'table' && (
          <RoomSidebar
            isQueueEnabled={isQueueEnabled}
            stats={stats}
            setIsQueueModalOpen={setIsQueueModalOpen}
          />
        )}

        <div className="flex flex-col gap-4 py-3 md:min-h-0 md:py-5 px-4">
          {roomData.settings.viewMode === 'table' && (
            <TableView roomData={roomData} stats={stats} name={name} />
          )}
          {roomData.settings.showTimer && <Timer />}

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
            />
          ) : (
            <UserEstimate
              roomData={roomData}
              name={name}
              userVote={typeof userVote === 'object' ? null : userVote}
              onVote={handleVote}
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
              onRevisitLater={async () => {
                if (!roomData.currentTicket) return;
                const pendingQueue = roomData.ticketQueue || [];
                const maxOrdinal =
                  pendingQueue.reduce(
                    (max, t) => (t.ordinal > max ? t.ordinal : max),
                    0
                  ) + 1;
                await handleUpdateTicket(roomData.currentTicket.id, {
                  status: 'pending',
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
                    <Suspense fallback={<FallbackLoading variant="inline" />}>
                      <UnifiedResults
                        roomData={roomData}
                        stats={stats}
                        criteria={roomData.settings.votingCriteria}
                        displayJudge={roomData.settings.enableJudge}
                        showVotes={roomData.showVotes}
                      />
                    </Suspense>
                  </motion.div>
                </SurfaceCard>

                <Footer displayRepoLink={false} />
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
                    <VotesHidden votes={roomData.votes} />
                  </motion.div>
                </SurfaceCard>

                <Footer displayRepoLink={false} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <AnimatePresence>
        {isSettingsModalOpen && (
          <Suspense fallback={<FallbackLoading />}>
            <SettingsModal
              isOpen={isSettingsModalOpen}
              onClose={() => setIsSettingsModalOpen(false)}
              settings={roomData.settings}
              onSaveSettings={handleUpdateSettings}
              defaultSettings={serverDefaults.roomSettings}
              structuredVotingOptions={serverDefaults.structuredVotingOptions}
            />
          </Suspense>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isShareModalOpen && (
          <Suspense fallback={<FallbackLoading />}>
            <ShareRoomModal
              isOpen={isShareModalOpen}
              onClose={() => setIsShareModalOpen(false)}
              roomKey={roomData.key}
            />
          </Suspense>
        )}
      </AnimatePresence>

      {isQueueEnabled && (
        <TicketQueueModal
          isOpen={isQueueModalOpen}
          onClose={() => setIsQueueModalOpen(false)}
          currentTicket={roomData.currentTicket}
          queue={roomData.ticketQueue || []}
          externalService={roomData.settings.externalService || 'none'}
          roomKey={roomData.key}
          userName={name}
          onAddTicket={handleAddTicket}
          onUpdateTicket={handleUpdateTicket}
          onDeleteTicket={handleDeleteTicket}
          canManageQueue={
            isModeratorView ||
            roomData.settings.allowOthersToManageQueue === true
          }
          onError={reportRoomError}
        />
      )}

      {isQueueEnabled && queueProvider !== 'none' && (
        <QueueProviderSetupModal
          isOpen={isQueueSetupModalOpen}
          provider={queueProvider as 'jira' | 'linear'}
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
    </div>
  );
};

export default RoomScreen;
