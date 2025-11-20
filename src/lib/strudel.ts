import {
  registerSynthSounds,
  samples,
  aliasBank,
  registerZZFXSounds,
  // @ts-expect-error - @strudel/webstudio has no type definitions
} from "@strudel/web";

async function prebake() {
  const ds = "https://raw.githubusercontent.com/felixroos/dough-samples/main/";
  const ts = "https://raw.githubusercontent.com/todepond/samples/main/";
  const drts =
    "https://raw.githubusercontent.com/tidalcycles/Dirt-Samples/master/";
  await Promise.all([
    registerSynthSounds(),
    registerZZFXSounds(),
    samples(`${ds}/tidal-drum-machines.json`),
    samples(`${ds}/piano.json`),
    samples(`${ds}/Dirt-Samples.json`),
    samples(`${ds}/EmuSP12.json`),
    samples(`${ds}/vcsl.json`),
    samples(`${ds}/mridangam.json`),
    samples(`${drts}/strudel.json`),
  ]);
  aliasBank(`${ts}/tidal-drum-machines-alias.json`);
}

export { prebake };
