import { useCallback } from "react";
import { getRecoveryPasskeyStorageKey } from "@/constants";
import { safeLocalStorage } from "@/utils/storage";

type Feature = "room" | "standup" | "wheel";

export function useRecoveryPasskey(
  feature: Feature,
  sessionKey: string,
  userName: string,
) {
  const storageKey = getRecoveryPasskeyStorageKey(
    feature,
    sessionKey,
    userName,
  );

  const savePasskey = useCallback(
    (passkey: string) => {
      safeLocalStorage.set(storageKey, passkey);
    },
    [storageKey],
  );

  const loadPasskey = useCallback((): string | null => {
    return safeLocalStorage.get(storageKey);
  }, [storageKey]);

  const clearPasskey = useCallback(() => {
    safeLocalStorage.remove(storageKey);
  }, [storageKey]);

  return { savePasskey, loadPasskey, clearPasskey };
}
