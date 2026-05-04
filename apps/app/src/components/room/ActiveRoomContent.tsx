import { useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { useRoomActions, useRoomState } from "@/context/RoomContext";
import { useSessionState } from "@/context/SessionContext";
import { Footer } from "@/components/layout/Footer";
import { ResultsControls } from "@/components/results/ResultsControls";
import { UnifiedResults } from "@/components/results/UnifiedResults";
import { VotesHidden } from "@/components/results/VotesHidden";
import { RoomCalloutCard } from "@/components/room/RoomCalloutCard";
import { StrudelMiniPlayer } from "@/components/StrudelPlayer/StrudelMiniPlayer";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { StructuredVotingPanel } from "@/components/voting/StructuredVotingPanel";
import { UserEstimate } from "@/components/voting/UserEstimate";
import { useFacilitationPrompt } from "@/hooks/useFacilitationPrompt";
import { useRoomFollowUpActions } from "@/hooks/useRoomFollowUpActions";
import { useRoomOnboardingHints } from "@/hooks/useRoomOnboardingHints";
import type { RoomData, RoomStats } from "@/types";
import type { RoomSettingsTabId } from "@/components/RoomSettingsTabs";
import { getVoteKeyForUser } from "@/utils/room";
import { getVoteSpreadSummary } from "@/utils/room-guidance";

interface ActiveRoomContentProps {
  roomData: RoomData;
  stats: RoomStats;
  isModeratorView: boolean;
  isQueueEnabled: boolean;
  canManageQueue: boolean;
  isSpectator: boolean;
  onOpenSettings: (tab?: RoomSettingsTabId) => void;
  onOpenGames: () => void;
  onOpenCompleteSession: () => void;
  onOpenSummary: (note: string) => void;
}

export const ActiveRoomContent = ({
  roomData,
  stats,
  isModeratorView,
  isQueueEnabled,
  canManageQueue,
  isSpectator,
  onOpenSettings,
  onOpenGames,
  onOpenCompleteSession,
  onOpenSummary,
}: ActiveRoomContentProps) => {
  const { userVote } = useRoomState();
  const {
    handleVote,
    handleToggleShowVotes,
    handleResetVotes,
    handleUpdateSettings,
    handleNextTicket,
    handleUpdateTicket,
  } = useRoomActions();
  const { name } = useSessionState();
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
  const {
    getSuggestedNote,
    captureUnknownsFollowUp,
    splitCurrentTicket,
    startRevote,
  } = useRoomFollowUpActions(roomData, spreadSummary, dismissHints);

  return (
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
          primaryAction={
            facilitationPrompt.title === "Unknowns flagged" && isQueueEnabled
              ? {
                  label: "Add follow-up",
                  onClick: captureUnknownsFollowUp,
                }
              : facilitationPrompt.title === "Quick consensus" &&
                  roomData.currentTicket
                ? {
                    label: "Add note",
                    onClick: () => onOpenSummary(getSuggestedNote()),
                  }
                : undefined
          }
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
          currentUserVote={userVote}
          onOpenVotingSettings={
            isModeratorView ? () => onOpenSettings("voting") : undefined
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
            isModeratorView ? () => onOpenSettings("voting") : undefined
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
            onOpenSummary(existingNote || getSuggestedNote());
          }}
          onCompleteSession={canManageQueue ? onOpenCompleteSession : undefined}
          onOpenResultsSettings={
            isModeratorView ? () => onOpenSettings("results") : undefined
          }
          onRevisitLater={async () => {
            if (!roomData.currentTicket) return;
            const pendingQueue = roomData.ticketQueue || [];
            const maxOrdinal =
              pendingQueue.reduce(
                (max, ticket) => (ticket.ordinal > max ? ticket.ordinal : max),
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
                    label: "Re-vote",
                    onClick: startRevote,
                  }}
                  secondaryAction={
                    isQueueEnabled
                      ? {
                          label: "Split ticket",
                          onClick: splitCurrentTicket,
                        }
                      : {
                          label: "Got it",
                          onClick: dismissHints,
                        }
                  }
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
              onOpenGames={onOpenGames}
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
              onOpenGames={onOpenGames}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
