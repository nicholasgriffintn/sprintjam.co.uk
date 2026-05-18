import type { RetroData, RetroStateData } from "@sprintjam/types";

export function toClientRetroData(
  data: RetroStateData,
  viewerName?: string,
): RetroData {
  const {
    passcodeHash: _passcodeHash,
    sessionTokens: _sessionTokens,
    workspaceUserIds: _workspaceUserIds,
    ...clientData
  } = data;

  if (
    !viewerName ||
    data.phase !== "input" ||
    !data.settings.hideCardsDuringInput
  ) {
    return clientData;
  }

  return {
    ...clientData,
    cards: clientData.cards.map((card) => {
      const cardOwner = card.owner ?? card.author;
      if (cardOwner === viewerName) {
        return card;
      }

      return {
        ...card,
        text: "",
        author: "",
        owner: undefined,
        groupTitle: undefined,
      };
    }),
  };
}
