import { type FC, useMemo, useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';

import type { RoomData, RoomStats, VoteValue, JiraTicket } from '../types';
import ErrorBanner from './ErrorBanner';
import SettingsModal from './SettingsModal';
import ShareRoomModal from './ShareRoomModal';
import Header from './Header';
import { ParticipantsList } from './ParticipantsList';
import { Timer } from './Timer';
import { UserEstimate } from './UserEstimate';
import { ResultsControls } from './ResultsControls';
import { JudgeResult } from './JudgeResult';
import { VoteDistribution } from './VoteDistribution';
import { VotesHidden } from './VotesHidden';
import JiraTicketPanel from './JiraTicketPanel';

export interface RoomScreenProps {
  roomData: RoomData;
  name: string;
  isModeratorView: boolean;
  userVote: VoteValue | null;
  votingOptions: VoteValue[];
  onVote: (value: VoteValue) => void;
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
  }, [roomData.votes, roomData.users.length, roomData.settings.estimateOptions]);

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

          <UserEstimate
            roomData={roomData}
            name={name}
            userVote={userVote}
            onVote={onVote}
          />

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
                  className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {roomData.settings.showAverage && (
                    <div className="p-4 bg-white rounded-lg shadow-sm">
                      <h3 className="mb-2 text-sm font-medium text-gray-500">
                        Average
                      </h3>
                      <p className="text-3xl font-bold text-blue-600">
                        {stats.avg}
                      </p>
                    </div>
                  )}
                  {roomData.settings.showMedian && (
                    <div className="p-4 bg-white rounded-lg shadow-sm">
                      <h3 className="mb-2 text-sm font-medium text-gray-500">
                        Most Common
                      </h3>
                      <p className="text-3xl font-bold text-blue-600">
                        {stats.mode || 'N/A'}
                      </p>
                    </div>
                  )}
                </motion.div>

                <motion.div
                  className="bg-white p-4 rounded-lg shadow-sm"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                >
                  <VoteDistribution
                    roomData={roomData}
                    stats={stats}
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