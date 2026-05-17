import type { RetroCard } from "@sprintjam/types";

export type RetroBoardDragPayload =
  | { type: "card"; cardId: string }
  | { type: "group"; groupId: string };

export type RetroBoardDropTarget =
  | { type: "column"; columnId: string }
  | { type: "card"; cardId: string }
  | { type: "group"; groupId: string };

export type RetroBoardDropAction =
  | { type: "none" }
  | {
      type: "moveCards";
      cardIds: string[];
      columnId: string;
      ungroupCardIds?: string[];
    }
  | {
      type: "groupCards";
      cardIds: string[];
      columnId: string;
      title: string;
      ungroupCardIds?: string[];
    };

interface ResolveRetroBoardDropOptions {
  cards: RetroCard[];
  payload: RetroBoardDragPayload | null;
  target: RetroBoardDropTarget;
}

const emptyDropAction: RetroBoardDropAction = { type: "none" };

export function resolveRetroBoardDrop({
  cards,
  payload,
  target,
}: ResolveRetroBoardDropOptions): RetroBoardDropAction {
  if (!payload) {
    return emptyDropAction;
  }

  const sourceCards = getPayloadCards(cards, payload);
  if (sourceCards.length === 0) {
    return emptyDropAction;
  }

  if (target.type === "column") {
    const movingCardIds = sourceCards
      .filter((card) => card.columnId !== target.columnId)
      .map((card) => card.id);
    const ungroupCardIds =
      payload.type === "card"
        ? getUngroupedCardMoveIds(cards, sourceCards[0])
        : [];

    return movingCardIds.length > 0 || ungroupCardIds.length > 0
      ? {
          type: "moveCards",
          cardIds: movingCardIds,
          columnId: target.columnId,
          ...(ungroupCardIds.length > 0 ? { ungroupCardIds } : {}),
        }
      : emptyDropAction;
  }

  const targetCards = getTargetCards(cards, target);
  if (targetCards.length === 0) {
    return emptyDropAction;
  }

  if (areCardsInSameGroup(sourceCards, targetCards)) {
    return emptyDropAction;
  }

  const groupedCardIds = uniqueIds([
    ...sourceCards.map((card) => card.id),
    ...targetCards.map((card) => card.id),
  ]);

  if (groupedCardIds.length < 2 || sameIds(groupedCardIds, sourceCards)) {
    return emptyDropAction;
  }

  const targetCard = targetCards[0];
  const sourceCard = sourceCards[0];
  const ungroupCardIds =
    payload.type === "card"
      ? getOrphanedSourceGroupCardIds(cards, sourceCard, groupedCardIds)
      : [];

  return {
    type: "groupCards",
    cardIds: groupedCardIds,
    columnId: targetCard.columnId,
    title:
      targetCard.groupTitle ??
      sourceCard.groupTitle ??
      truncateGroupTitle(targetCard.text),
    ...(ungroupCardIds.length > 0 ? { ungroupCardIds } : {}),
  };
}

function getPayloadCards(
  cards: RetroCard[],
  payload: RetroBoardDragPayload,
): RetroCard[] {
  if (payload.type === "group") {
    return cards.filter((card) => card.groupId === payload.groupId);
  }

  const sourceCard = cards.find((card) => card.id === payload.cardId);
  if (!sourceCard) {
    return [];
  }

  return [sourceCard];
}

function getTargetCards(
  cards: RetroCard[],
  target: Exclude<RetroBoardDropTarget, { type: "column" }>,
): RetroCard[] {
  if (target.type === "group") {
    return cards.filter((card) => card.groupId === target.groupId);
  }

  const targetCard = cards.find((card) => card.id === target.cardId);
  if (!targetCard) {
    return [];
  }

  return targetCard.groupId
    ? cards.filter((card) => card.groupId === targetCard.groupId)
    : [targetCard];
}

function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids)];
}

function sameIds(ids: string[], cards: RetroCard[]): boolean {
  const cardIds = new Set(cards.map((card) => card.id));
  return ids.length === cardIds.size && ids.every((id) => cardIds.has(id));
}

function areCardsInSameGroup(
  sourceCards: RetroCard[],
  targetCards: RetroCard[],
): boolean {
  const groupId = sourceCards[0]?.groupId;
  return (
    groupId !== undefined &&
    sourceCards.every((card) => card.groupId === groupId) &&
    targetCards.every((card) => card.groupId === groupId)
  );
}

function getUngroupedCardMoveIds(
  cards: RetroCard[],
  sourceCard: RetroCard | undefined,
): string[] {
  if (!sourceCard?.groupId) {
    return [];
  }

  return [
    sourceCard.id,
    ...getOrphanedSourceGroupCardIds(cards, sourceCard, [sourceCard.id]),
  ];
}

function getOrphanedSourceGroupCardIds(
  cards: RetroCard[],
  sourceCard: RetroCard | undefined,
  movedCardIds: string[],
): string[] {
  if (!sourceCard?.groupId) {
    return [];
  }

  const movedIds = new Set(movedCardIds);
  const remainingGroupCards = cards.filter(
    (card) => card.groupId === sourceCard.groupId && !movedIds.has(card.id),
  );

  return remainingGroupCards.length < 2
    ? remainingGroupCards.map((card) => card.id)
    : [];
}

function truncateGroupTitle(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length <= 48) {
    return trimmed || "Grouped cards";
  }

  return `${trimmed.slice(0, 45)}...`;
}

export function getRetroBoardDropTargetKey(
  target: RetroBoardDropTarget,
): string {
  if (target.type === "column") {
    return `column:${target.columnId}`;
  }

  if (target.type === "group") {
    return `group:${target.groupId}`;
  }

  return `card:${target.cardId}`;
}

export function getRetroBoardDropTargetFromElement(
  element: Element | null,
): RetroBoardDropTarget | null {
  if (!(element instanceof HTMLElement)) {
    return null;
  }

  const cardElement = element.closest<HTMLElement>("[data-retro-card-id]");
  if (cardElement?.dataset.retroCardId) {
    return { type: "card", cardId: cardElement.dataset.retroCardId };
  }

  const groupElement = element.closest<HTMLElement>("[data-retro-group-id]");
  if (groupElement?.dataset.retroGroupId) {
    return { type: "group", groupId: groupElement.dataset.retroGroupId };
  }

  const columnElement = element.closest<HTMLElement>("[data-retro-column-id]");
  if (columnElement?.dataset.retroColumnId) {
    return { type: "column", columnId: columnElement.dataset.retroColumnId };
  }

  return null;
}
