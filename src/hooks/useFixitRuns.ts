import { useEffect, useState } from "react";

import type { FixitRun } from "@/lib/fixits-service";
import { fetchFixitRuns } from "@/lib/fixits-service";

interface UseFixitRunsState {
  status: "idle" | "loading" | "ready" | "error";
  runs: FixitRun[];
  error?: string;
}

export function useFixitRuns(options?: {
  includeInactive?: boolean;
}): UseFixitRunsState {
  const [state, setState] = useState<UseFixitRunsState>({
    status: "idle",
    runs: [],
  });

  useEffect(() => {
    let canceled = false;
    setState((prev) => ({
      ...prev,
      status: prev.status === "ready" ? "ready" : "loading",
      error: undefined,
    }));

    fetchFixitRuns(options)
      .then((runs) => {
        if (!canceled) {
          setState({ status: "ready", runs });
        }
      })
      .catch((error) => {
        if (!canceled) {
          setState({
            status: "error",
            runs: [],
            error:
              error instanceof Error ? error.message : "Failed to load Fixit runs",
          });
        }
      });

    return () => {
      canceled = true;
    };
  }, [options?.includeInactive]);

  return state;
}
