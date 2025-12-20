import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

import type { RoomData, VoteValue } from '@/types';
import { getUsersVoteTaskSize } from '@/utils/tasks';
import { TimerChip } from './TimerChip';
import { useRoomState } from '@/context/RoomContext';
import { getContrastingTextColor } from '@/utils/colors';
import { getExtraVoteValueSet } from '@/utils/votingOptions';

const parseOptionLabel = (optionText: string) => {
  const [first, ...rest] = optionText.split(' ');
  const hasLeadingEmoji =
    first && /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u.test(first);

  return {
    icon: hasLeadingEmoji ? first : '',
    label: hasLeadingEmoji ? rest.join(' ').trim() || first : optionText,
  };
};

export function UserEstimate({
  roomData,
  name,
  userVote,
  onVote,
}: {
  roomData: RoomData;
  name: string;
  userVote: VoteValue | null;
  onVote: (value: VoteValue) => void;
}) {
  const { roomData: contextRoomData } = useRoomState();
  const isVotingDisabled =
    roomData.showVotes &&
    !roomData.settings.allowVotingAfterReveal &&
    !roomData.settings.alwaysRevealVotes;
  const userTaskSize = getUsersVoteTaskSize(roomData, name);
  const extraVoteValues = useMemo(
    () => getExtraVoteValueSet(roomData.settings.extraVoteOptions),
    [roomData.settings.extraVoteOptions]
  );

  return (
    <div className="mb-8">
      {roomData.currentTicket && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Currently Voting On
            </span>
            <span className="font-mono text-sm font-semibold text-slate-900 dark:text-white">
              {roomData.currentTicket.ticketId}
            </span>
          </div>
          {roomData.currentTicket.title && (
            <p className="text-base font-medium text-slate-800 dark:text-slate-100">
              {roomData.currentTicket.title}
            </p>
          )}
          {roomData.currentTicket.description && (
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
              {roomData.currentTicket.description}
            </p>
          )}
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 md:gap-3 mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Your Estimate
          </h2>
          {userVote && userTaskSize && (
            <div>
              <span className="inline-flex items-center rounded-full border border-gray-300 dark:border-gray-600 px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-gray-900 dark:text-white bg-white dark:bg-gray-800">
                {userTaskSize}
              </span>
            </div>
          )}
        </div>
        {contextRoomData?.settings.showTimer && <TimerChip />}
      </div>
      <div className="flex flex-wrap gap-2 md:gap-3">
        {roomData.settings.estimateOptions.map((option) => {
          const optionLabel = `${option}`;
          const metadata = roomData.settings.voteOptionsMetadata?.find(
            (m) => m.value === option
          );
          const background =
            metadata?.background ||
            (option === userVote ? '#ebf5ff' : '#ffffff');
          const textColor = getContrastingTextColor(background);
          const { icon, label } = parseOptionLabel(optionLabel);

          return (
            <motion.button
              type="button"
              key={option}
              data-testid={`vote-option-${optionLabel}`}
              onClick={() => onVote(option)}
              disabled={isVotingDisabled}
              aria-label={`Vote ${option}`}
              aria-pressed={userVote === option}
              className={`relative w-14 h-18 md:w-18 md:h-26 px-3 py-3 flex flex-col items-center justify-center gap-1 text-base font-semibold border-2 rounded-lg shadow-sm ${
                isVotingDisabled
                  ? 'opacity-50 cursor-not-allowed border-gray-300 dark:border-gray-600'
                  : userVote === option
                  ? 'border-blue-500 shadow-md'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
              }`}
              style={{ backgroundColor: background }}
              whileHover={isVotingDisabled ? {} : { scale: 1.05 }}
              whileTap={isVotingDisabled ? {} : { scale: 0.95 }}
              animate={{
                scale: userVote === option ? 1.05 : 1,
              }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            >
              {userVote === option && (
                <div className="absolute top-1 right-1">
                  <div className="bg-blue-500 rounded-full p-0.5 shadow-sm">
                    <Check className="text-white" size={12} strokeWidth={3} />
                  </div>
                </div>
              )}
              <div
                className={`relative w-full h-full flex flex-col items-center justify-center ${
                  extraVoteValues.has(String(option)) ? 'gap-0.5' : 'gap-1'
                } text-center leading-tight`}
              >
                {(icon || extraVoteValues.has(String(option))) && (
                  <span
                    className={`${
                      extraVoteValues.has(String(option))
                        ? 'text-2xl md:text-3xl'
                        : 'text-xl md:text-2xl'
                    }`}
                    aria-hidden="true"
                  >
                    {icon || optionLabel}
                  </span>
                )}
                {!extraVoteValues.has(String(option)) && (
                  <span
                    className={`leading-tight ${
                      icon ? 'text-xs md:text-sm' : 'text-lg md:text-xl'
                    } font-semibold`}
                    style={{ color: textColor }}
                  >
                    {label}
                  </span>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
