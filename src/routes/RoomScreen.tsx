import { type FC, useMemo, useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';

import type { RoomData, RoomStats, VoteValue, JiraTicket, StructuredVote } from '../types';
import ErrorBanner from '../components/ErrorBanner';
import SettingsModal from '../components/SettingsModal';
import ShareRoomModal from '../components/ShareRoomModal';
import Header from '../components/Header';
import { ParticipantsList } from '../components/ParticipantsList';
import { Timer } from '../components/Timer';
import { UserEstimate } from '../components/UserEstimate';
import { ResultsControls } from '../components/ResultsControls';
import { JudgeResult } from '../components/JudgeResult';
import { VotesHidden } from '../components/VotesHidden';
import JiraTicketPanel from '../components/JiraTicketPanel';
import { StructuredVotingPanel } from '../components/StructuredVotingPanel';
import { UnifiedResults } from '../components/UnifiedResults';

export interface RoomScreenProps {
  roomData: RoomData;
  name: string;
  isModeratorView: boolean;
  userVote: VoteValue | StructuredVote | null;
  votingOptions: VoteValue[];
  onVote: (value: VoteValue | StructuredVote) => void;
  onToggleShowVotes: () => void;
  onResetVotes: () => void;
  onUpdateSettings: (settings: RoomData['settings']) => void;
  onJiraTicketFetched?: (ticket: JiraTicket) => void;
  onJiraTicketUpdated?: (ticket: JiraTicket) => void;
  error: string;
  onClearError: () => void;
  isConnected: boolean;
  onLeaveRoom: () => void;
}

const RoomScreen: FC<RoomScreenProps> = ({
  roomData,
  name,
  isModeratorView,
  userVote,
  onVote,
  onToggleShowVotes,
  onResetVotes,
  onUpdateSettings,
  onJiraTicketFetched,
  onJiraTicketUpdated,
  error,
  onClearError,
  isConnected,
  onLeaveRoom,
}) => {
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [showJudgeAnimation, setShowJudgeAnimation] = useState(false);
  const prevJudgeScoreRef = useRef<VoteValue | null>(null);

  const stats: RoomStats = useMemo(() => {
    const votes = Object.values(roomData.votes).filter((v): v is VoteValue => v !== null && v !== '?');
    const numericVotes = votes.filter(v => !Number.isNaN(Number(v))).map(Number);

    const distribution: Record<VoteValue, number> = {} as Record<VoteValue, number>;
    for (const option of roomData.settings.estimateOptions) {
      distribution[option] = 0;
    }

    for (const vote of Object.values(roomData.votes)) {
      if (vote !== null) {
        distribution[vote] = (distribution[vote] || 0) + 1;
      }
    }

    const avg = numericVotes.length > 0
      ? numericVotes.reduce((a, b) => a + b, 0) / numericVotes.length
      : 0;
    let maxCount = 0;
    let mode: VoteValue | null = null;

    for (const [vote, count] of Object.entries(distribution)) {
      if (count > maxCount) {
        maxCount = count;
        mode = vote as VoteValue;
      }
    }

    const votedUsers = Object.values(roomData.votes).filter(v => v !== null).length;

    return {
      avg: Number.isNaN(avg) ? 'N/A' : avg.toFixed(1),
      mode: maxCount > 0 ? mode : null,
      distribution,
      totalVotes: votes.length,
      votedUsers,
      totalUsers: roomData.users.length,
      judgeScore: roomData.judgeScore
    };
  }, [roomData.votes, roomData.users.length, roomData.settings.estimateOptions, roomData.judgeScore]);

  // Effect to show hammer animation when judge score changes
  useEffect(() => {
    if (roomData.settings.enableJudge &&
      roomData.judgeScore !== null &&
      roomData.judgeScore !== prevJudgeScoreRef.current &&
      roomData.showVotes) {
      setShowJudgeAnimation(true);

      const timer = setTimeout(() => {
        setShowJudgeAnimation(false);
      }, 2000);

      prevJudgeScoreRef.current = roomData.judgeScore;

      return () => clearTimeout(timer);
    }
  }, [roomData.judgeScore, roomData.showVotes, roomData.settings.enableJudge]);

  const hasCelebratedRef = useRef(false);

  // Trigger confetti if everyone voted the same option
  useEffect(() => {
    if (
      roomData.showVotes &&
      stats.votedUsers === roomData.users.length &&
      stats.mode !== null &&
      stats.distribution[stats.mode] === stats.votedUsers
    ) {
      if (!hasCelebratedRef.current) {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        hasCelebratedRef.current = true;
      }
    } else if (stats.votedUsers < roomData.users.length) {
      hasCelebratedRef.current = false;
    }
  }, [roomData.showVotes, stats.votedUsers, stats.mode, stats.distribution, roomData.users.length]);

  return (
    <div className="flex flex-col h-screen">
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
        className="grid grid-cols-1 md:grid-cols-[25%_75%] flex-1 h-full"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <ParticipantsList roomData={roomData} stats={stats} name={name} />

        <div className="flex flex-col p-4 md:p-6 overflow-y-auto">
          {roomData.settings.showTimer && (
            <Timer />
          )}

          {roomData.settings.enableStructuredVoting && roomData.settings.votingCriteria ? (
            <StructuredVotingPanel
              criteria={roomData.settings.votingCriteria}
              currentVote={roomData.structuredVotes?.[name] || null}
              onVote={onVote}
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
              onToggleShowVotes={onToggleShowVotes}
              onResetVotes={onResetVotes}
            />
          )}

          {roomData.settings.enableJiraIntegration && (roomData.jiraTicket || isModeratorView) && (
            <div className="mb-4">
              <JiraTicketPanel
                isModeratorView={isModeratorView}
                currentJiraTicket={roomData.jiraTicket}
                judgeScore={roomData.judgeScore}
                roomKey={roomData.key}
                userName={name}
                onJiraTicketFetched={onJiraTicketFetched || (() => {})}
                onJiraTicketUpdated={onJiraTicketUpdated || (() => {})}
                onError={onClearError}
              />
            </div>
          )}

          <AnimatePresence mode="wait">
            {roomData.showVotes ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="p-6 bg-gray-100 rounded-lg shadow-inner"
                key="results"
              >
                {roomData.settings.enableJudge && roomData.showVotes && (
                  <JudgeResult
                    roomData={roomData}
                    stats={stats}
                    showJudgeAnimation={showJudgeAnimation}
                  />
                )}

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <UnifiedResults
                    roomData={roomData}
                    stats={stats}
                    criteria={roomData.settings.votingCriteria}
                  />
                </motion.div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="flex items-center justify-center p-12 bg-gray-100 rounded-lg"
                key="waiting"
              >
                <motion.div
                  className="text-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.3 }}
                >
                  <VotesHidden votes={roomData.votes} />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <AnimatePresence>
        {isSettingsModalOpen && (
          <SettingsModal
            isOpen={isSettingsModalOpen}
            onClose={() => setIsSettingsModalOpen(false)}
            settings={roomData.settings}
            onSaveSettings={onUpdateSettings}
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
    </div>
  );
};

export default RoomScreen;