import { useEffect } from "react";

import { toast } from "@/components/ui";
import { getRecoveryPasskeyStorageKey } from "@/constants";
import { safeLocalStorage } from "@/utils/storage";

type RecoveryFeature = "room" | "standup" | "wheel";

interface UseRecoveryPasskeyNoticeOptions {
  feature: RecoveryFeature;
  sessionKey: string | null | undefined;
  userName: string | null | undefined;
  enabled?: boolean;
}

export function useRecoveryPasskeyNotice({
  feature,
  sessionKey,
  userName,
  enabled = true,
}: UseRecoveryPasskeyNoticeOptions) {
  useEffect(() => {
    if (!enabled || !sessionKey || !userName) {
      return;
    }

    const storageKey = getRecoveryPasskeyStorageKey(feature, sessionKey, userName);
    const stored = safeLocalStorage.get(storageKey);
    if (!stored) {
      return;
    }

    safeLocalStorage.remove(storageKey);
    toast.info({
      title: "Save your recovery passkey",
      description:
        "Use this passkey to reclaim your session from another browser or device if you get locked out.",
      timeout: 0,
      data: {
        code: stored,
        detail: "Keep this somewhere safe - it won't be shown again.",
      },
    });
  }, [enabled, feature, sessionKey, userName]);
}
