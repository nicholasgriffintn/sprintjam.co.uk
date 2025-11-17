import { useEffect, useRef } from 'react';

import { safeLocalStorage } from '../utils/storage';

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
      const savedName = safeLocalStorage.get('sprintjam_username');
      if (savedName) {
        onNameLoaded(savedName);
      }
      didLoadName.current = true;
      return;
    }

    if (name === '' && !safeLocalStorage.get('sprintjam_username')) {
      return;
    }

    const saveTimeout = setTimeout(() => {
      safeLocalStorage.set('sprintjam_username', name);
    }, 500);

    return () => clearTimeout(saveTimeout);
  }, [name, onNameLoaded]);
};
