// @ts-expect-error - no types available for @strudel/web
export type StrudelRuntime = typeof import("@strudel/web");

let runtimePromise: Promise<StrudelRuntime> | null = null;

export const STRUDEL_LOG_EVENT_KEY = "strudel.log";

const STRUDEL_LOG_ERROR_PREFIX = /^\[[^\]]+\]\s*error:\s*/;

const isStrudelLogDetail = (
  detail: unknown,
): detail is { message?: unknown; type?: unknown } =>
  typeof detail === "object" && detail !== null;

export const getStrudelLogErrorMessage = (detail: unknown): string | null => {
  if (!isStrudelLogDetail(detail) || typeof detail.message !== "string") {
    return null;
  }

  const message = detail.message.trim();
  if (!message) {
    return null;
  }

  if (STRUDEL_LOG_ERROR_PREFIX.test(message)) {
    return message.replace(STRUDEL_LOG_ERROR_PREFIX, "");
  }

  if (detail.type === "error") {
    return message;
  }

  if (message.includes("unknown chord")) {
    return message;
  }

  return null;
};

export function loadStrudelRuntime(): Promise<StrudelRuntime> {
  if (typeof window === "undefined") {
    return Promise.reject(
      new Error("Strudel playback can only be initialized in the browser"),
    );
  }

  // @ts-expect-error - no types available for @strudel/web
  runtimePromise ??= import("@strudel/web");
  return runtimePromise;
}

const DOUGH_SAMPLES_BASE =
  "https://raw.githubusercontent.com/felixroos/dough-samples/main";
const TODEPOND_SAMPLES_BASE =
  "https://raw.githubusercontent.com/todepond/samples/main";
const DIRT_SAMPLES_BASE =
  "https://raw.githubusercontent.com/tidalcycles/Dirt-Samples/master";

async function prebake(runtime: StrudelRuntime) {
  const { registerSynthSounds, samples, aliasBank, registerZZFXSounds } =
    runtime;

  await Promise.all([
    registerSynthSounds(),
    registerZZFXSounds(),
    samples(`${DOUGH_SAMPLES_BASE}/tidal-drum-machines.json`),
    samples(`${DOUGH_SAMPLES_BASE}/piano.json`),
    samples(`${DOUGH_SAMPLES_BASE}/Dirt-Samples.json`),
    samples(`${DOUGH_SAMPLES_BASE}/EmuSP12.json`),
    samples(`${DOUGH_SAMPLES_BASE}/vcsl.json`),
    samples(`${DOUGH_SAMPLES_BASE}/mridangam.json`),
    samples(`${DIRT_SAMPLES_BASE}/strudel.json`),
  ]);
  await aliasBank(`${TODEPOND_SAMPLES_BASE}/tidal-drum-machines-alias.json`);
}

export { prebake };
