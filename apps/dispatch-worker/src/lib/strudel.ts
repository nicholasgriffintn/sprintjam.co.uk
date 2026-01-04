import {
  registerSynthSounds,
  samples,
  aliasBank,
  registerZZFXSounds,
  // @ts-expect-error - @strudel/webstudio has no type definitions
} from "@strudel/web";

const DOUGH_SAMPLES_BASE =
  "https://raw.githubusercontent.com/felixroos/dough-samples/main";
const TODEPOND_SAMPLES_BASE =
  "https://raw.githubusercontent.com/todepond/samples/main";
const DIRT_SAMPLES_BASE =
  "https://raw.githubusercontent.com/tidalcycles/Dirt-Samples/master";

async function prebake() {
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
