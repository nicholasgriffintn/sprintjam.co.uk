import type { RetroCard, RetroPhase } from "@sprintjam/types";

interface RetroCardDeleteContext {
  card: RetroCard;
  moderator: string;
  userName: string;
}

export function canDeleteRetroCard({
  card,
  moderator,
  userName,
}: RetroCardDeleteContext): boolean {
  if (moderator === userName) return true;
  return (card.owner ?? card.author) === userName;
}

export function canSetRetroPhase(phase: RetroPhase): boolean {
  return phase !== "completed";
}
