import { useState, useCallback, useEffect } from "react";

import {
  fetchDefaultSettings,
  getCachedDefaultSettings,
} from "@/lib/api-service";
import {
  serverDefaultsCollection,
  ensureServerDefaultsCollectionReady,
} from "@/lib/data/collections";
import { useServerDefaults as useServerDefaultsFromCollection } from "@/lib/data/hooks";
import type { ServerDefaults } from "@/types";
import { cloneServerDefaults } from "@/utils/settings";

export const useServerDefaults = () => {
  const cachedDefaults = getCachedDefaultSettings();
  const serverDefaultsFromCollection = useServerDefaultsFromCollection();

  const [serverDefaults, setServerDefaults] = useState<ServerDefaults | null>(
    () => (cachedDefaults ? cloneServerDefaults(cachedDefaults) : null),
  );
  const [isLoadingDefaults, setIsLoadingDefaults] =
    useState<boolean>(!cachedDefaults);
  const [defaultsError, setDefaultsError] = useState<string | null>(null);

  const applyServerDefaults = useCallback(async (defaults?: ServerDefaults) => {
    if (!defaults) {
      return;
    }

    await ensureServerDefaultsCollectionReady();
    serverDefaultsCollection.utils.writeUpsert(defaults);
    setDefaultsError(null);
  }, []);

  const loadDefaults = useCallback(async (forceRefresh = false) => {
    setIsLoadingDefaults(true);
    try {
      await fetchDefaultSettings(forceRefresh);
      setDefaultsError(null);
    } catch (err) {
      console.error("Failed to load default settings", err);
      const message =
        err instanceof Error
          ? err.message
          : "Unable to load default settings from server";
      setDefaultsError(message);
    } finally {
      setIsLoadingDefaults(false);
    }
  }, []);

  const handleRetryDefaults = useCallback(() => {
    loadDefaults(true);
  }, [loadDefaults]);

  useEffect(() => {
    if (!cachedDefaults) {
      loadDefaults();
    }
  }, [cachedDefaults, loadDefaults]);

  useEffect(() => {
    if (serverDefaultsFromCollection) {
      setServerDefaults(cloneServerDefaults(serverDefaultsFromCollection));
    } else {
      setServerDefaults(null);
    }
  }, [serverDefaultsFromCollection]);

  return {
    serverDefaults,
    isLoadingDefaults,
    defaultsError,
    applyServerDefaults,
    handleRetryDefaults,
  };
};
