import { useEffect } from "react";

import { safeLocalStorage } from "@/utils/storage";
import { AVATAR_STORAGE_KEY, USERNAME_STORAGE_KEY } from "@/constants";
import type { AvatarId } from "@/types";
import { sanitiseAvatarValue } from "@/utils/avatars";

interface UseUserPersistenceOptions {
  name: string;
  avatar: AvatarId | null;
}

export const getStoredUserName = () =>
  safeLocalStorage.get(USERNAME_STORAGE_KEY) ?? "";

export const persistUserName = (name: string) => {
  if (name === "") {
    safeLocalStorage.remove(USERNAME_STORAGE_KEY);
    return;
  }

  safeLocalStorage.set(USERNAME_STORAGE_KEY, name);
};

export const getStoredUserAvatar = (): AvatarId | null => {
  const avatar = safeLocalStorage.get(AVATAR_STORAGE_KEY);
  return (sanitiseAvatarValue(avatar) as AvatarId | null) ?? null;
};

export const useUserPersistence = ({
  name,
  avatar,
}: UseUserPersistenceOptions) => {
  useEffect(() => {
    if (name === "") {
      persistUserName(name);
      return;
    }

    const saveTimeout = setTimeout(() => {
      persistUserName(name);
    }, 500);

    return () => clearTimeout(saveTimeout);
  }, [name]);

  useEffect(() => {
    if (!avatar) {
      safeLocalStorage.remove(AVATAR_STORAGE_KEY);
      return;
    }

    safeLocalStorage.set(AVATAR_STORAGE_KEY, avatar);
  }, [avatar]);
};
