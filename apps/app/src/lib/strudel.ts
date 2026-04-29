export type StrudelRuntime = typeof import("@strudel/web");

let runtimePromise: Promise<StrudelRuntime> | null = null;

export function loadStrudelRuntime(): Promise<StrudelRuntime> {
  if (typeof window === "undefined") {
    return Promise.reject(
      new Error("Strudel playback can only be initialized in the browser"),
    );
  }

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
