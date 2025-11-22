import { motion } from "framer-motion";
import { Check } from "lucide-react";

import type { RoomData, VoteValue } from "@/types";
import { getUsersVoteTaskSize } from "@/utils/tasks";

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
  return (
    <div className="mb-8">
      <div className="flex flex-wrap gap-2 md:gap-3">
        <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
          Your Estimate
        </h2>
        {userVote && (
          <div>
            <span className="inline-flex items-center rounded-full border border-gray-300 dark:border-gray-600 px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-gray-900 dark:text-white bg-white dark:bg-gray-800">
              {getUsersVoteTaskSize(roomData, name)}
            </span>
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-2 md:gap-3">
        {roomData.settings.estimateOptions.map((option) => {
          const optionLabel = `${option}`;
          const metadata = roomData.settings.voteOptionsMetadata?.find(
            (m) => m.value === option,
          );
          const background =
            metadata?.background ||
            (option === userVote ? "#ebf5ff" : "#ffffff");

          return (
            <motion.button
              type="button"
              key={option}
              data-testid={`vote-option-${optionLabel}`}
              onClick={() => onVote(option)}
              aria-label={`Vote ${option}`}
              aria-pressed={userVote === option}
              className={`w-12 h-16 md:w-16 md:h-24 flex flex-col items-center justify-center text-lg font-medium border-2 rounded-lg ${userVote === option
                ? "border-blue-500 shadow-md"
                : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                }`}
              style={{ backgroundColor: background }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              animate={{
                scale: userVote === option ? 1.05 : 1,
              }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <div className="relative w-full h-full flex items-center justify-center">
                {userVote === option && (
                  <div className="absolute top-1 right-1">
                    <div className="bg-blue-500 rounded-full p-0.5">
                      <Check className="text-white" size={12} strokeWidth={3} />
                    </div>
                  </div>
                )}
                <span className="text-lg font-semibold text-slate-900">
                  {option}
                </span>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
