import { useEffect, useRef, useState, useCallback } from "react";
// @ts-ignore - no types available
import { initStrudel, evaluate, hush } from "@strudel/web";

import { prebake } from "../lib/strudel";
import { safeLocalStorage } from "../utils/storage";

interface UseStrudelPlayerOptions {
  onError?: (error: Error) => void;
}

interface UseStrudelPlayerReturn {
  isPlaying: boolean;
  isMuted: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  play: () => void;
  pause: () => void;
  toggleMute: () => void;
  playCode: (code: StrudelCodePayload) => Promise<void>;
  stop: () => void;
}

const MUTE_STORAGE_KEY = "strudel-player-muted";

interface StrudelCodeObjectPayload {
  code?: unknown;
  data?: {
    code?: unknown;
    [key: string]: unknown;
  } | null;
  [key: string]: unknown;
}

type StrudelCodePayload = string | StrudelCodeObjectPayload;

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

const extractCodeFromObjectPayload = (
  payload: StrudelCodeObjectPayload,
): string | null => {
  if (isNonEmptyString(payload.code)) {
    return payload.code;
  }

  const nestedCode = payload.data?.code;
  if (isNonEmptyString(nestedCode)) {
    return nestedCode;
  }

  return null;
};

const tryParseJson = (value: string): unknown | null => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const parseStrudelCodePayload = (payload: StrudelCodePayload): string => {
  if (typeof payload === "string") {
    const trimmed = payload.trim();

    if (!trimmed) {
      throw new Error("Received empty Strudel code payload");
    }

    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      const parsed = tryParseJson(trimmed);
      if (parsed !== null) {
        if (typeof parsed === "string" && isNonEmptyString(parsed)) {
          return parsed;
        }

        if (parsed && typeof parsed === "object") {
          const parsedCode = extractCodeFromObjectPayload(
            parsed as StrudelCodeObjectPayload,
          );
          if (parsedCode) {
            return parsedCode;
          }
        }

        throw new Error("Strudel payload missing code property");
      }
    }

    return payload;
  }

  const extracted = extractCodeFromObjectPayload(payload);
  if (extracted) {
    return extracted;
  }

  throw new Error("Strudel payload missing code property");
};

export function useStrudelPlayer(
  options: UseStrudelPlayerOptions = {},
): UseStrudelPlayerReturn {
  const { onError } = options;

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(() => {
    const stored = safeLocalStorage.get(MUTE_STORAGE_KEY);
    return stored === "true";
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const currentCodeRef = useRef<string | null>(null);
  const onErrorRef = useRef<UseStrudelPlayerOptions["onError"]>(onError);
  const reportError = useCallback((error: Error) => {
    onErrorRef.current?.(error);
  }, []);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    let mounted = true;

    const notifyError = (error: unknown) => {
      if (!mounted) return;
      const normalizedError =
        error instanceof Error
          ? error
          : new Error("Failed to initialize Strudel");
      onErrorRef.current?.(normalizedError);
    };

    const init = async () => {
      try {
        await initStrudel({
          prebake,
        });

        if (mounted) {
          setIsInitialized(true);
        }
      } catch (error) {
        console.error("Failed to initialize Strudel:", error);
        notifyError(error);
      }
    };

    init();

    return () => {
      mounted = false;
      try {
        console.info("StrudelPlayer] Cleaning up Strudel");
        hush();
      } catch (e) {
        console.error("Failed to clean up Strudel:", e);
      }
    };
  }, []);

  useEffect(() => {
    safeLocalStorage.set(MUTE_STORAGE_KEY, String(isMuted));
  }, [isMuted]);

  const play = useCallback(async () => {
    if (!isInitialized || !currentCodeRef.current || isMuted) return;

    try {
      await evaluate(currentCodeRef.current);
      console.info(`StrudelPlayer] Playing code:`, currentCodeRef.current);
      setIsPlaying(true);
    } catch (error) {
      console.error("Failed to play:", error);
      if (onErrorRef.current) {
        reportError(
          error instanceof Error ? error : new Error("Failed to play"),
        );
      }
    }
  }, [isInitialized, isMuted, reportError]);

  const pause = useCallback(() => {
    try {
      console.info("StrudelPlayer] Pausing playback");
      hush();
      setIsPlaying(false);
    } catch (error) {
      console.error("Failed to pause:", error);
      if (onErrorRef.current) {
        reportError(
          error instanceof Error ? error : new Error("Failed to pause"),
        );
      }
    }
  }, [reportError]);

  const stop = useCallback(() => {
    try {
      console.info("StrudelPlayer] Stopping playback");
      hush();
      setIsPlaying(false);
      currentCodeRef.current = null;
    } catch (error) {
      console.error("Failed to stop:", error);
      if (onErrorRef.current) {
        reportError(
          error instanceof Error ? error : new Error("Failed to stop"),
        );
      }
    }
  }, [reportError]);

  const toggleMute = useCallback(() => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);

    if (newMuted && isPlaying) {
      try {
        console.info("StrudelPlayer] Muting playback");
        hush();
        setIsPlaying(false);
      } catch (error) {
        console.error("Failed to mute:", error);
      }
    }
  }, [isMuted, isPlaying]);

  const playCode = useCallback(
    async (code: StrudelCodePayload) => {
      if (!isInitialized) {
        console.warn("Strudel not initialized yet");
        return;
      }
      if (code == null) {
        console.warn("No Strudel code provided");
        return;
      }

      if (isPlaying) {
        try {
          console.info(
            "StrudelPlayer] Stopping existing playback before playing new code",
          );
          hush();
          setIsPlaying(false);
        } catch (error) {
          console.error("Failed to stop existing playback:", error);
        }
      }

      setIsLoading(true);
      try {
        const parsedCode = parseStrudelCodePayload(code);
        currentCodeRef.current = parsedCode;
      } catch (parseError) {
        const errorMessage =
          parseError instanceof Error
            ? parseError.message
            : "Invalid Strudel code payload";
        console.error("Failed to parse Strudel response:", parseError);
        reportError(new Error(errorMessage));
        setIsPlaying(false);
        setIsLoading(false);
        return;
      }

      try {
        console.info("StrudelPlayer] Stopping any existing playback");
        hush();

        await new Promise((resolve) => setTimeout(resolve, 100));

        if (!isMuted && currentCodeRef.current) {
          await evaluate(currentCodeRef.current);
          console.info(`StrudelPlayer] Playing code:`, currentCodeRef.current);
          setIsPlaying(true);
        } else {
          setIsPlaying(false);
        }
      } catch (error) {
        console.error("Failed to play Strudel code:", error);
        const errorMessage =
          error instanceof Error
            ? `Invalid Strudel code: ${error.message}`
            : "Failed to play code";

        reportError(new Error(errorMessage));
        setIsPlaying(false);
      } finally {
        setIsLoading(false);
      }
    },
    [isInitialized, isMuted, reportError],
  );

  return {
    isPlaying,
    isMuted,
    isLoading,
    isInitialized,
    play,
    pause,
    toggleMute,
    playCode,
    stop,
  };
}
