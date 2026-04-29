import { useEffect } from "react";

import {
  ensureServerDefaultsCollectionReady,
  serverDefaultsCollection,
} from "@/lib/data/collections";
import type { ServerDefaults } from "@/types";

interface RouteDataHydratorProps {
  serverDefaults: ServerDefaults | null;
}

export function RouteDataHydrator({ serverDefaults }: RouteDataHydratorProps) {
  useEffect(() => {
    if (!serverDefaults) {
      return;
    }

    const hydrateDefaults = async () => {
      await ensureServerDefaultsCollectionReady();
      serverDefaultsCollection.utils.writeUpsert(serverDefaults);
    };

    void hydrateDefaults();
  }, [serverDefaults]);

  return null;
}
