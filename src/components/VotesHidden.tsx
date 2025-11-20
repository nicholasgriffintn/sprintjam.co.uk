import { Lock, Timer } from "lucide-react";

import { EmptyState } from "./ui/EmptyState";
import { RoomData } from "../types";

export function VotesHidden({ votes }: { votes: RoomData["votes"] }) {
  const hasVotes = Object.values(votes).some((v) => v !== null);

  return (
    <EmptyState
      icon={
        hasVotes ? (
          <Lock className="w-12 h-12 text-indigo-600 dark:text-indigo-400" />
        ) : (
          <Timer className="w-12 h-12 text-orange-600 dark:text-orange-400" />
        )
      }
      title={hasVotes ? "Votes are hidden" : "No votes yet"}
      description={
        hasVotes
          ? "Waiting for moderator to reveal."
          : "Waiting for team members to vote."
      }
    />
  );
}
