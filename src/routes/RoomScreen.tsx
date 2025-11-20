import { type FC, useState, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import type {
  RoomData,
  VoteValue,
  StructuredVote,
  ServerDefaults,
  TicketQueueItem,
} from '../types';
import { useRoomStats } from '../hooks/useRoomStats';
import { useConsensusCelebration } from '../hooks/useConsensusCelebration';
import ErrorBanner from '../components/ui/ErrorBanner';
import Header from '../components/Header';
import { ParticipantsList } from '../components/ParticipantsList';
import { Timer } from '../components/Timer';
import { UserEstimate } from '../components/UserEstimate';
import { ResultsControls } from '../components/ResultsControls';
import { VotesHidden } from '../components/VotesHidden';
import { StructuredVotingPanel } from '../components/StructuredVotingPanel';
import { SurfaceCard } from '../components/ui/SurfaceCard';
import { StrudelMiniPlayer } from '../components/StrudelPlayer/StrudelMiniPlayer';
import { FallbackLoading } from '../components/ui/FallbackLoading';
import { TicketQueueModal } from '../components/TicketQueueModal';
import { TicketQueueSidebar } from '../components/TicketQueueSidebar';
import { PrePointingSummaryModal } from '../components/modals/PrePointingSummaryModal';

const SettingsModal = lazy(() => import('../components/SettingsModal'));
const ShareRoomModal = lazy(() => import('../components/ShareRoomModal'));
const UnifiedResults = lazy(() =>
  import('../components/UnifiedResults').then((m) => ({
    default: m.UnifiedResults,
  }))
);

export interface RoomScreenProps {
  roomData: RoomData;
  name: string;
  isModeratorView: boolean;
  userVote: VoteValue | StructuredVote | null;
  votingOptions: VoteValue[];
  serverDefaults: ServerDefaults;
  onVote: (value: VoteValue | StructuredVote) => void;
  onToggleShowVotes: () => void;
  onResetVotes: () => void;
  onUpdateSettings: (settings: RoomData['settings']) => void;
  onNextTicket: () => void;
  onAddTicket: (ticket: Partial<TicketQueueItem>) => void;
  onUpdateTicket: (ticketId: number, updates: Partial<TicketQueueItem>) => void;
  onDeleteTicket: (ticketId: number) => void;
  error: string;
  onClearError: () => void;
  onError: (message: string) => void;
  isConnected: boolean;
  onLeaveRoom: () => void;
}

const RoomScreen: FC<RoomScreenProps> = ({
  roomData,
  name,
  isModeratorView,
  userVote,
  serverDefaults,
  onVote,
  onToggleShowVotes,
  onResetVotes,
  onUpdateSettings,
  onNextTicket,
  onAddTicket,
  onUpdateTicket,
  onDeleteTicket,
  error,
  onClearError,
  onError,
  isConnected,
  onLeaveRoom,
}) => {
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isQueueModalOpen, setIsQueueModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [pendingNextTicket, setPendingNextTicket] = useState(false);
  const isQueueEnabled = roomData.settings.enableTicketQueue ?? false;

  const stats = useRoomStats(roomData);
  useConsensusCelebration({ roomData, stats });

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white">
      {error && <ErrorBanner message={error} onClose={onClearError} />}

      <Header
        roomData={roomData}
        isModeratorView={isModeratorView}
        isConnected={isConnected}
        onLeaveRoom={onLeaveRoom}
        setIsShareModalOpen={setIsShareModalOpen}
        setIsSettingsModalOpen={setIsSettingsModalOpen}
      />

      <motion.div
        className="flex flex-1 flex-col gap-4 px-4 py-0 md:grid md:grid-cols-[1fr_3fr] md:px-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex flex-col gap-4 border-b border-white/30 dark:border-white/10 md:h-full md:border-b-0 md:border-r">
          <ParticipantsList roomData={roomData} stats={stats} name={name} />
          {isQueueEnabled && (
            <TicketQueueSidebar
              roomData={roomData}
              canManageQueue={
                isModeratorView ||
                roomData.settings.allowOthersToManageQueue === true
              }
              onViewQueue={() => setIsQueueModalOpen(true)}
              onUpdateTicket={onUpdateTicket}
              className="flex flex-col gap-3 px-0 md:mt-auto md:pr-4 md:py-5"
            />
          )}
        </div>

        <div className="flex flex-col gap-4 py-3 md:py-5">
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
              currentVote={roomData.structuredVotes?.[name] || null}
              onVote={onVote}
              displaySettings={roomData.settings.structuredVotingDisplay}
            />
          ) : (
            <UserEstimate
              roomData={roomData}
              name={name}
              userVote={typeof userVote === 'object' ? null : userVote}
              onVote={onVote}
            />
          )}

          {roomData.users.length > 0 && (
            <ResultsControls
              roomData={roomData}
              isModeratorView={isModeratorView}
              queueEnabled={isQueueEnabled}
              onToggleShowVotes={onToggleShowVotes}
              onResetVotes={onResetVotes}
              onNextTicket={() => setIsSummaryOpen(true)}
              onRevisitLater={async () => {
                if (!roomData.currentTicket) return;
                const pendingQueue = roomData.ticketQueue || [];
                const maxOrdinal =
                  pendingQueue.reduce(
                    (max, t) => (t.ordinal > max ? t.ordinal : max),
                    0
                  ) + 1;
                await onUpdateTicket(roomData.currentTicket.id, {
                  status: 'pending',
                  ordinal: maxOrdinal,
                });
                onNextTicket();
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
              onSaveSettings={onUpdateSettings}
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
          onAddTicket={onAddTicket}
          onUpdateTicket={onUpdateTicket}
          onDeleteTicket={onDeleteTicket}
          canManageQueue={
            isModeratorView ||
            roomData.settings.allowOthersToManageQueue === true
          }
          onError={onError}
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
            onNextTicket();
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
