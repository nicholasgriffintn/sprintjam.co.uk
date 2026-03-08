const STANDUP_NOTICE_STORAGE_KEY_PREFIX = "sprintjam_standup_notice_";

function getNoticeKey(standupKey: string): string {
  return `${STANDUP_NOTICE_STORAGE_KEY_PREFIX}${standupKey.toUpperCase()}`;
}

export function setStandupNotice(standupKey: string, message: string): void {
  try {
    window.sessionStorage.setItem(getNoticeKey(standupKey), message);
  } catch {
    // Ignore storage failures (private mode/quota), notice is non-critical.
  }
}

export function consumeStandupNotice(standupKey: string): string | null {
  try {
    const key = getNoticeKey(standupKey);
    const message = window.sessionStorage.getItem(key);
    if (message) {
      window.sessionStorage.removeItem(key);
    }
    return message;
  } catch {
    return null;
  }
}
