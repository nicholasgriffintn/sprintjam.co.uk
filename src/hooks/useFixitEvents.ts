import { useEffect, useState } from "react";

import type { FixitEvent } from "@/lib/fixits-service";
import { fetchFixitEvents } from "@/lib/fixits-service";

export function useFixitEvents(fixitId: string | null) {
  const [events, setEvents] = useState<FixitEvent[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!fixitId) {
      setEvents([]);
      setStatus("idle");
      return;
    }

    let cancelled = false;
    setStatus("loading");
    setError(null);

    fetchFixitEvents({ fixitId, limit: 30 })
      .then((data) => {
        if (!cancelled) {
          setEvents(data);
          setStatus("ready");
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setStatus("error");
          setError(err instanceof Error ? err.message : "Failed to load events");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [fixitId]);

  return { events, status, error, setEvents };
}
