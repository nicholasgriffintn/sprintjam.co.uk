export type ShareSessionType = "retro" | "room" | "standup" | "wheel";

const shareSessionPaths = {
  retro: (sessionKey: string) => `/retro/join/${sessionKey}`,
  room: (sessionKey: string) => `/room/${sessionKey}`,
  standup: (sessionKey: string) => `/standup/join/${sessionKey}`,
  wheel: (sessionKey: string) => `/wheel/${sessionKey}`,
} satisfies Record<ShareSessionType, (sessionKey: string) => string>;

export function getSessionSharePath(
  sessionType: ShareSessionType,
  sessionKey: string,
) {
  return shareSessionPaths[sessionType](sessionKey);
}

export function getSessionShareUrl(
  sessionType: ShareSessionType,
  sessionKey: string,
  origin?: string,
) {
  const baseOrigin =
    origin ?? (typeof window === "undefined" ? "" : window.location.origin);

  if (!baseOrigin) {
    return "";
  }

  return `${baseOrigin}${getSessionSharePath(sessionType, sessionKey)}`;
}
