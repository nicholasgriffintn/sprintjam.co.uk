import { useEffect, useRef } from "react";

import { safeLocalStorage } from "@/utils/storage";
import { USERNAME_STORAGE_KEY } from '@/constants';

interface UseUserPersistenceOptions {
  name: string;
  onNameLoaded: (name: string) => void;
}

export const useUserPersistence = ({
  name,
  onNameLoaded,
}: UseUserPersistenceOptions) => {
  const didLoadName = useRef(false);

  useEffect(() => {
    if (!didLoadName.current) {
      const savedName = safeLocalStorage.get(USERNAME_STORAGE_KEY);
      if (savedName) {
        onNameLoaded(savedName);
      }
      didLoadName.current = true;
      return;
    }

    if (name === '' && !safeLocalStorage.get(USERNAME_STORAGE_KEY)) {
      return;
    }

    const saveTimeout = setTimeout(() => {
      safeLocalStorage.set(USERNAME_STORAGE_KEY, name);
    }, 500);

    return () => clearTimeout(saveTimeout);
  }, [name, onNameLoaded]);
};
