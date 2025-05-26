import { type FC, useMemo, useState, useEffect, useRef } from 'react';
import { BarChart3, Gavel, ChevronDown, ChevronUp, Users, AlertTriangle, CheckCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';

import type { RoomData, VoteValue } from '../types';
import ConnectionStatus from './ConnectionStatus';
import ErrorBanner from './ErrorBanner';
import SettingsModal from './SettingsModal';
import ShareRoomModal from './ShareRoomModal';

interface RoomStats {
  avg: number | string;
  mode: VoteValue | null;
  distribution: Record<VoteValue, number>;
  totalVotes: number;
  votedUsers: number;
  totalUsers: number;
  judgeScore: VoteValue | null;
}

interface RoomScreenProps {
  roomData: RoomData;
  name: string;
  isModeratorView: boolean;
  userVote: VoteValue | null;
  votingOptions: VoteValue[];
  onVote: (value: VoteValue) => void;
  onToggleShowVotes: () => void;
  onResetVotes: () => void;
  onUpdateSettings: (settings: RoomData['settings']) => void;
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
  error,
  onClearError,
  isConnected,
  onLeaveRoom,
}) => {
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isParticipantsExpanded, setIsParticipantsExpanded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
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

  const votingProgress = useMemo(() => {
    return roomData.users.length > 0
      ? Math.round((stats.votedUsers / roomData.users.length) * 100)
      : 0;
  }, [stats.votedUsers, roomData.users.length]);

  useEffect(() => {
    console.log('Room settings updated:', roomData.settings);
    console.log('Vote options metadata:', roomData.settings.voteOptionsMetadata);
  }, [roomData.settings]);

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

  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [timerRunning]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

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

  function getUsersVoteTaskSize() {
    const usersVote = roomData.votes[name];
    const metadata = roomData.settings.voteOptionsMetadata?.find(m => m.value === usersVote);
    const taskSize = metadata?.taskSize || null;

    switch (taskSize) {
      case 'xs':
        return 'Extra Small';
      case 'sm':
        return 'Small';
      case 'md':
        return 'Medium';
      case 'lg':
        return 'Large';
      case 'xl':
        return 'Extra Large';
      default:
        return 'Unknown';
    }
  }

  return (
    <div className="flex flex-col h-screen">
      {error && <ErrorBanner message={error} onClose={onClearError} />}

      <header className="p-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 md:space-x-4">
            <h1 className="text-lg md:text-xl font-bold">SprintJam</h1>
            <div className="flex items-stretch h-7">
              <div className="px-2 md:px-3 py-1 text-xs md:text-sm bg-blue-800 rounded-l-md truncate max-w-[80px] md:max-w-none flex items-center">
                {roomData.key}
              </div>
              <button
                type="button"
                onClick={() => setIsShareModalOpen(true)}
                className="px-2 py-1 bg-blue-700 hover:bg-blue-800 rounded-r-md border-l border-blue-600 flex items-center"
                title="Share Room"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <title>Share Room</title>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </button>
            </div>
            <button
              type="button"
              onClick={onLeaveRoom}
              className="text-xs md:text-sm px-2 md:px-3 py-1 bg-gray-700 hover:bg-gray-800 rounded-md transition-colors"
              title="Leave Room"
            >
              Leave Room
            </button>
          </div>

          <div className="flex items-center space-x-2 md:space-x-4">
            <ConnectionStatus isConnected={isConnected} />
            <div className="hidden sm:block text-xs md:text-sm px-2 md:px-3 py-1 bg-blue-800 rounded-md">
              {isModeratorView ? 'Moderator' : 'Team Member'}
            </div>
            {isModeratorView && (
              <button
                type="button"
                onClick={() => setIsSettingsModalOpen(true)}
                className="p-1 md:p-1.5 rounded-full bg-blue-800 hover:bg-blue-900 transition-colors"
                title="Room Settings"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 md:h-5 md:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <title>Room Settings</title>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </header>

      <motion.div 
        className="grid grid-cols-1 md:grid-cols-[25%_75%] flex-1 h-full"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="bg-gray-100 border-b md:border-b-0 md:border-r overflow-y-auto md:p-4">
          <div className="flex items-center justify-between p-4 md:p-0 md:mb-4">
            <h2 className="text-lg font-medium flex items-center">
              <Users size={18} className="mr-1 md:hidden" />
              Participants ({roomData.users.length})
            </h2>
            <button 
              className="block md:hidden rounded-md p-1 hover:bg-gray-200 transition-colors"
              onClick={() => setIsParticipantsExpanded(!isParticipantsExpanded)}
              aria-label={isParticipantsExpanded ? "Collapse participants" : "Expand participants"}
            >
              {isParticipantsExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
          </div>
          <div className={`px-4 pb-4 md:p-0 ${isParticipantsExpanded ? 'block' : 'hidden md:block'}`}>
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span>Voting Progress</span>
              <span>{stats.votedUsers}/{roomData.users.length}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <motion.div
                className="bg-blue-600 h-2.5 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${votingProgress}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
          </div>
          <ul className="space-y-2">
            {roomData.users.map((user: string) => (
              <motion.li
                key={user}
                className="flex items-center justify-between p-2 bg-white rounded-md shadow-sm hover:shadow-md"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ 
                  duration: 0.2,
                  delay: roomData.users.indexOf(user) * 0.05
                }}
                whileHover={{ scale: 1.01 }}
              >
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${roomData.votes[user] !== undefined && roomData.votes[user] !== null
                      ? 'bg-green-500'
                      : 'bg-gray-300'
                    }`} />
                  <span className={`${user === name ? 'font-medium' : ''}`}>
                    {user}
                    {user === roomData.moderator && (
                      <span className="ml-1 text-xs text-blue-600">(Mod)</span>
                    )}
                    {user === name && (
                      <span className="ml-1 text-xs text-gray-500">(You)</span>
                    )}
                    {roomData.settings.showUserPresence && (
                      <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${roomData.connectedUsers?.[user]
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-200 text-gray-700'
                        }`}>
                        {roomData.connectedUsers?.[user] ? 'Online' : 'Offline'}
                      </span>
                    )}
                  </span>
                </div>
                {(roomData.votes[user] !== undefined && roomData.votes[user] !== null) && (
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${roomData.showVotes
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-200'
                      }`}>
                    {roomData.settings.anonymousVotes && roomData.showVotes
                      ? '✓'
                      : roomData.showVotes
                        ? roomData.votes[user]
                        : '✓'}
                  </span>
                )}
              </motion.li>
            ))}
          </ul>
          </div>
        </div>

        <div className="flex flex-col p-4 md:p-6 overflow-y-auto">
          {roomData.settings.showTimer && (
            <div className="mb-4 flex items-center space-x-2">
              <span className="font-mono text-lg">{formatTime(timerSeconds)}</span>
              <motion.button
                type="button"
                onClick={() => setTimerRunning(!timerRunning)}
                className="p-1 rounded bg-blue-200 hover:bg-blue-300"
                title={timerRunning ? "Pause Timer" : "Start Timer"}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                {timerRunning ? "⏸" : "▶️"}
              </motion.button>
              <motion.button
                type="button"
                onClick={() => {
                  setTimerRunning(false);
                  setTimerSeconds(0);
                }}
                className="p-1 rounded bg-blue-200 hover:bg-blue-300"
                title="Reset Timer"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                🔄
              </motion.button>
            </div>
          )}
          <div className="mb-8">
            <div className="flex flex-wrap gap-2 md:gap-3">
              <h2 className="mb-4 text-xl font-semibold">Your Estimate</h2>
              {userVote && (
                <div>
                  <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-foreground">
                    {getUsersVoteTaskSize()}
                  </span>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2 md:gap-3">
              {roomData.settings.estimateOptions.map((option) => {
                const metadata = roomData.settings.voteOptionsMetadata?.find(m => m.value === option);
                const background = metadata?.background || (option === userVote ? '#ebf5ff' : '#ffffff');

                return (
                  <motion.button
                    type="button"
                    key={option}
                    onClick={() => onVote(option)}
                    className={`w-12 h-16 md:w-16 md:h-24 flex flex-col items-center justify-center text-lg font-medium border-2 rounded-lg ${userVote === option
                      ? 'border-blue-500 shadow-md'
                      : 'border-gray-300 hover:border-gray-400'
                    }`}
                    style={{ backgroundColor: background }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    animate={{
                      scale: userVote === option ? 1.05 : 1,
                      borderColor: userVote === option ? '#3b82f6' : '#d1d5db'
                    }}
                    transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                  >
                    <span className="text-lg">{option}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {roomData.users.length > 0 && (
            <div className="mb-4">
              <div className="flex flex-wrap items-center justify-between mb-2">
                <h2 className="text-xl font-semibold flex items-center space-x-2 gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Results
                </h2>
                <div className="flex flex-wrap mt-2 sm:mt-0 gap-2 sm:space-x-3">
                  {(isModeratorView || roomData.settings.allowOthersToShowEstimates) && (
                    <motion.button
                      type="button"
                      onClick={onToggleShowVotes}
                      className={`px-3 py-1.5 text-sm sm:text-base rounded-md ${!roomData.showVotes
                          ? 'bg-blue-500 text-white hover:bg-blue-600'
                          : 'bg-yellow-500 text-white hover:bg-yellow-600'
                        }`}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      layout
                    >
                      {roomData.showVotes ? 'Hide Votes' : 'Show Votes'}
                    </motion.button>
                  )}
                  {(isModeratorView || roomData.settings.allowOthersToDeleteEstimates) && (
                    <motion.button
                      type="button"
                      onClick={onResetVotes}
                      className="px-3 py-1.5 text-sm sm:text-base bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      Reset Votes
                    </motion.button>
                  )}
                </div>
              </div>
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
                  <div className="mb-4">
                    <div className="flex items-center mb-2">
                      {showJudgeAnimation ? (
                        <motion.div 
                          className="mr-2"
                          animate={{ 
                            y: [0, -10, 0],
                            rotate: [0, -10, 10, -5, 0] 
                          }}
                          transition={{ 
                            duration: 0.8,
                            repeat: 2,
                            repeatType: "reverse" 
                          }}
                        >
                          <Gavel className="text-amber-700" />
                        </motion.div>
                      ) : (
                        <Gavel className="mr-2 text-amber-700" />
                      )}
                      <h3 className="text-lg font-semibold">The Judge's Verdict</h3>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                      <motion.div 
                        className="flex flex-col sm:flex-row sm:justify-between sm:items-center"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3, delay: 0.2 }}
                      >
                        <div className="flex flex-row items-center gap-3 mb-2 sm:mb-0">
                          <div className="text-4xl sm:text-5xl font-bold text-gray-800">
                            {stats.judgeScore !== null ? stats.judgeScore : 0}
                          </div>
                          <div className="flex flex-col">
                            {roomData.judgeMetadata?.confidence === 'high' && (
                              <span className="px-2.5 py-1 bg-green-100 text-green-800 rounded-full text-xs sm:text-sm font-medium flex items-center">
                                <CheckCircle className="w-3.5 h-3.5 mr-1" /> High Confidence
                              </span>
                            )}
                            {roomData.judgeMetadata?.confidence === 'medium' && (
                              <span className="px-2.5 py-1 bg-blue-100 text-blue-800 rounded-full text-xs sm:text-sm font-medium flex items-center">
                                Medium Confidence
                              </span>
                            )}
                            {roomData.judgeMetadata?.confidence === 'low' && (
                              <span className="px-2.5 py-1 bg-red-100 text-red-800 rounded-full text-xs sm:text-sm font-medium flex items-center">
                                <AlertTriangle className="w-3.5 h-3.5 mr-1" /> Low Confidence
                              </span>
                            )}
                            <span className="text-xs text-gray-500 mt-1 flex items-center sm:hidden">
                              <Users className="inline w-3 h-3 mr-1" /> {stats.votedUsers} votes
                            </span>
                          </div>
                        </div>
                        <div className="mb-2 sm:mb-0">
                          <div className="text-xs sm:text-sm text-gray-600 font-medium sm:text-right">
                            {roomData.settings.judgeAlgorithm === 'smartConsensus' && 'Smart Consensus'}
                            {roomData.settings.judgeAlgorithm === 'conservativeMode' && 'Conservative Mode'}
                            {roomData.settings.judgeAlgorithm === 'optimisticMode' && 'Optimistic Mode'}
                            {roomData.settings.judgeAlgorithm === 'simpleAverage' && 'Simple Average'}
                            <span className="text-gray-500 ml-2 hidden sm:inline">
                              <Users className="inline w-3.5 h-3.5 mr-1" /> {stats.votedUsers} votes
                            </span>
                          </div>
                        </div>
                      </motion.div>
                      
                      {roomData.judgeMetadata?.reasoning && (
                        <p className="mt-2 text-sm text-gray-700">
                          {roomData.judgeMetadata.reasoning}
                        </p>
                      )}
                      
                      {roomData.judgeMetadata?.needsDiscussion && (
                        <div className="mt-3 bg-amber-50 border border-amber-200 rounded-md p-3 flex items-start">
                          <AlertTriangle className="w-4 h-4 text-amber-800 mr-2 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-amber-800">Discussion Recommended</p>
                            <p className="text-sm text-amber-700">Wide spread suggests different understanding of requirements.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
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
                  <h3 className="mb-4 text-sm font-medium text-gray-500">Vote Distribution</h3>
                  <div className="space-y-3">
                    {roomData.settings.estimateOptions.map((option) => {
                      const metadata = roomData.settings.voteOptionsMetadata?.find(m => m.value === option);
                      const background = metadata?.background || '#ebf5ff';

                      return (
                        <motion.div 
                          key={option} 
                          className="flex items-center mb-2"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: 0.1 * roomData.settings.estimateOptions.indexOf(option) }}
                        >
                          <div className="w-8 text-center font-medium rounded" style={{ backgroundColor: background }}>
                            {option}
                          </div>
                          <div className="flex-1 mx-2">
                            <div className="w-full bg-gray-200 rounded-full h-4">
                              <motion.div
                                className="h-4 rounded-full"
                                initial={{ width: 0 }}
                                animate={{ 
                                  width: `${roomData.users.length > 0
                                    ? (stats.distribution[option] / roomData.users.length) * 100
                                    : 0}%`
                                }}
                                transition={{ duration: 0.8, delay: 0.1 * roomData.settings.estimateOptions.indexOf(option) }}
                                style={{ backgroundColor: background }}
                              />
                            </div>
                          </div>
                          <div className="w-10 text-center">
                            <span className="px-2 py-1 rounded bg-grey-100 border-grey-200 text-grey-800">
                              {stats.distribution[option] || 0}
                            </span>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
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
                  {Object.values(roomData.votes).some(v => v !== null) ? (
                    <>
                      <div className="mb-2 text-4xl">🔒</div>
                      <p className="text-gray-500">
                        Votes are hidden. Waiting for moderator to reveal.
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="mb-2 text-4xl">⏳</div>
                      <p className="text-gray-500">
                        No votes yet. Waiting for team members to vote.
                      </p>
                    </>
                  )}
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