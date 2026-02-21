import { Lock, Timer } from "lucide-react";

import { EmptyState } from "@/components/ui/EmptyState";
import { RoomData } from "@/types";

interface VotesHiddenProps {
  votes: RoomData["votes"];
  structuredVotes?: RoomData["structuredVotes"];
  isStructuredVotingEnabled?: boolean;
  users: RoomData["users"];
  currentUserName: string;
  isAnonymousVoting?: boolean;
}

export function VotesHidden({
  votes,
  structuredVotes,
  isStructuredVotingEnabled,
  users,
  currentUserName,
  isAnonymousVoting,
}: VotesHiddenProps) {
  const getVoteKeyForUser = (userName: string) => {
    if (isAnonymousVoting) {
      const index = users.indexOf(userName);
      return index === -1 ? "Anonymous" : `Anonymous ${index + 1}`;
    }
    return userName;
  };

  const currentUserKey = getVoteKeyForUser(currentUserName);
  const currentClassicVote =
    votes[currentUserKey] ?? votes[currentUserName] ?? null;
  const currentStructuredVote =
    structuredVotes?.[currentUserKey] ??
    structuredVotes?.[currentUserName] ??
    undefined;
  const hasUserVote =
    currentClassicVote !== null && currentClassicVote !== undefined
      ? true
      : currentStructuredVote !== undefined;

  const votedUsers = new Set<string>();
  Object.entries(votes).forEach(([userKey, value]) => {
    if (value !== null && value !== undefined) {
      votedUsers.add(userKey);
    }
  });
  if (structuredVotes) {
    Object.keys(structuredVotes).forEach((userKey) => votedUsers.add(userKey));
  }

  const votesCastCount = votedUsers.size;
  const totalParticipants = users.length;
  const voteProgress =
    votesCastCount > 0 && totalParticipants > 0
      ? `${votesCastCount}/${totalParticipants} participants have voted`
      : null;

  return (
    <EmptyState
      icon={
        hasUserVote ? (
          <Lock className="w-12 h-12 text-indigo-600 dark:text-indigo-400" />
        ) : (
          <Timer className="w-12 h-12 text-orange-600 dark:text-orange-400" />
        )
      }
      title={hasUserVote ? "Votes are hidden" : "You haven't voted yet"}
      description={
        hasUserVote
          ? `Waiting for the moderator to reveal${
              voteProgress ? ` — ${voteProgress}` : ""
            }.`
          : isStructuredVotingEnabled
            ? "Score each criterion to submit your vote."
            : "Select a card to cast your vote."
      }
    />
  );
}
