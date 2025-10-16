import { Lock, Timer } from "lucide-react";

import { RoomData } from "../types";

export function VotesHidden({ votes }: { votes: RoomData['votes'] }) {
  return (
    <div>
      {Object.values(votes).some(v => v !== null) ? (
        <>
          <div className="mb-2 text-5xl flex justify-center text-indigo-600 dark:text-indigo-400"><Lock className="w-8 h-8" /></div>
          <p className="text-gray-500 dark:text-gray-400">
            Votes are hidden. Waiting for moderator to reveal.
          </p>
        </>
      ) : (
        <>
          <div className="mb-2 text-5xl flex justify-center text-orange-600 dark:text-orange-400"><Timer className="w-8 h-8" /></div>
          <p className="text-gray-500 dark:text-gray-400">
            No votes yet. Waiting for team members to vote.
          </p>
        </>
      )}
    </div>
  );
}