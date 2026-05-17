import type { RetroCard } from "@sprintjam/types";

export type RetroCardVoteFilter = "all" | "voted" | "unvoted";
export type RetroCardSortMode = "newest" | "most-votes" | "fewest-votes";

interface FilterAndSortRetroCardsOptions {
  columnId: string;
  cards: RetroCard[];
  filter: RetroCardVoteFilter;
  sort: RetroCardSortMode;
}

export function filterAndSortRetroCards({
  columnId,
  cards,
  filter,
  sort,
}: FilterAndSortRetroCardsOptions): RetroCard[] {
  const filtered = cards.filter((card) => {
    if (card.columnId !== columnId) {
      return false;
    }

    if (filter === "voted") {
      return card.votes.length > 0;
    }

    if (filter === "unvoted") {
      return card.votes.length === 0;
    }

    return true;
  });

  return [...filtered].sort((a, b) => {
    if (sort === "most-votes") {
      return b.votes.length - a.votes.length || b.createdAt - a.createdAt;
    }

    if (sort === "fewest-votes") {
      return a.votes.length - b.votes.length || b.createdAt - a.createdAt;
    }

    return b.createdAt - a.createdAt;
  });
}

export function getUserVoteCount(cards: RetroCard[], userName: string): number {
  return cards.filter((card) => card.votes.includes(userName)).length;
}
