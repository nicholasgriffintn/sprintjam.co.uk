import type { RetroData, RetroStateData } from "@sprintjam/types";

export function toClientRetroData(data: RetroStateData): RetroData {
  const {
    passcodeHash: _passcodeHash,
    sessionTokens: _sessionTokens,
    workspaceUserIds: _workspaceUserIds,
    ...clientData
  } = data;

  return clientData;
}
