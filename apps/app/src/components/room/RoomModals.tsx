import { AnimatePresence } from "framer-motion";
import type { TeamSession } from "@sprintjam/types";

import { useRoomActions } from "@/context/RoomContext";
import { useSessionState } from "@/context/SessionContext";
import { CompleteSessionModal } from "@/components/modals/CompleteSessionModal";
import { PrePointingSummaryModal } from "@/components/modals/PrePointingSummaryModal";
import { SaveToWorkspaceModal } from "@/components/modals/SaveToWorkspaceModal";
import ShareRoomModal from "@/components/modals/ShareRoomModal";
import SettingsModal from "@/components/modals/SettingsModal";
import { TicketQueueModal } from "@/components/modals/TicketQueueModal";
import { RoomGamesModal } from "@/components/games/RoomGamesModal";
import type { RoomData, RoomStats, ServerDefaults } from "@/types";
import type { RoomSettingsTabId } from "@/components/RoomSettingsTabs";

interface RoomModalsProps {
  roomData: RoomData;
  serverDefaults: ServerDefaults;
  stats: RoomStats;
  isQueueEnabled: boolean;
  canManageQueue: boolean;
  showSaveToWorkspace: boolean;
  linkedWorkspaceSession: TeamSession | null;
  linkedWorkspaceTeamName: string | null;
  isSettingsModalOpen: boolean;
  settingsInitialTab?: RoomSettingsTabId;
  onCloseSettings: () => void;
  isShareModalOpen: boolean;
  onCloseShareModal: () => void;
  isQueueModalOpen: boolean;
  onCloseQueueModal: () => void;
  isCompleteSessionOpen: boolean;
  onCloseCompleteSession: () => void;
  isSummaryOpen: boolean;
  onCloseSummary: () => void;
  summaryNote: string;
  onSummaryNoteChange: (note: string) => void;
  pendingNextTicket: boolean;
  onPendingNextTicketChange: (pending: boolean) => void;
  isSaveToWorkspaceOpen: boolean;
  onCloseSaveToWorkspace: () => void;
  onOpenSaveToWorkspace: () => void;
  onWorkspaceSessionSaved: (session: TeamSession) => void;
  isGamesModalOpen: boolean;
  onCloseGamesModal: () => void;
}

export const RoomModals = ({
  roomData,
  serverDefaults,
  stats,
  isQueueEnabled,
  canManageQueue,
  showSaveToWorkspace,
  linkedWorkspaceSession,
  linkedWorkspaceTeamName,
  isSettingsModalOpen,
  settingsInitialTab,
  onCloseSettings,
  isShareModalOpen,
  onCloseShareModal,
  isQueueModalOpen,
  onCloseQueueModal,
  isCompleteSessionOpen,
  onCloseCompleteSession,
  isSummaryOpen,
  onCloseSummary,
  summaryNote,
  onSummaryNoteChange,
  pendingNextTicket,
  onPendingNextTicketChange,
  isSaveToWorkspaceOpen,
  onCloseSaveToWorkspace,
  onOpenSaveToWorkspace,
  onWorkspaceSessionSaved,
  isGamesModalOpen,
  onCloseGamesModal,
}: RoomModalsProps) => {
  const { name } = useSessionState();
  const {
    handleUpdateSettings,
    handleSelectTicket,
    handleNextTicket,
    handleAddTicket,
    handleUpdateTicket,
    handleDeleteTicket,
    reportRoomError,
    handleCompleteSession,
    handleStartGame,
  } = useRoomActions();

  return (
    <>
      <AnimatePresence>
        {isSettingsModalOpen && (
          <SettingsModal
            isOpen={isSettingsModalOpen}
            onClose={onCloseSettings}
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
        onClose={onCloseGamesModal}
        onStartGame={handleStartGame}
      />

      <AnimatePresence>
        {isShareModalOpen && (
          <ShareRoomModal
            isOpen={isShareModalOpen}
            onClose={onCloseShareModal}
            roomKey={roomData.key}
          />
        )}
      </AnimatePresence>

      <TicketQueueModal
        isOpen={isQueueModalOpen}
        onClose={onCloseQueueModal}
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
        onClose={onCloseCompleteSession}
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
        canManageQueue={canManageQueue}
        onSaveToWorkspace={onOpenSaveToWorkspace}
        showSaveToWorkspace={showSaveToWorkspace}
        linkedWorkspaceSession={linkedWorkspaceSession}
        linkedWorkspaceTeamName={linkedWorkspaceTeamName}
        onCompleteSession={handleCompleteSession}
        recordedRoundsCount={roomData.roundHistory?.length ?? 0}
        currentRoundVoteCount={Object.keys(roomData.votes).length}
        onError={reportRoomError}
      />

      <PrePointingSummaryModal
        isOpen={isSummaryOpen}
        onClose={onCloseSummary}
        votes={roomData.votes}
        stats={stats}
        currentTicket={roomData.currentTicket}
        currentUser={name}
        note={summaryNote}
        onNoteChange={onSummaryNoteChange}
        onConfirm={async () => {
          if (pendingNextTicket) return;
          onPendingNextTicketChange(true);
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
            onPendingNextTicketChange(false);
            onCloseSummary();
          }
        }}
      />

      <SaveToWorkspaceModal
        isOpen={isSaveToWorkspaceOpen}
        onClose={onCloseSaveToWorkspace}
        roomKey={roomData.key}
        suggestedName={roomData.currentTicket?.title}
        linkedSession={linkedWorkspaceSession}
        onSaved={onWorkspaceSessionSaved}
      />
    </>
  );
};
