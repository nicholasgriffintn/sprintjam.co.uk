import { motion } from 'framer-motion';
import { Gavel, Users, AlertTriangle, CheckCircle } from 'lucide-react';

import type { RoomData, RoomStats } from '../types';

export function JudgeResult({
  roomData,
  stats,
  showJudgeAnimation
}: {
  roomData: RoomData;
  stats: RoomStats;
  showJudgeAnimation: boolean;
}) {
  return (
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
  )
}