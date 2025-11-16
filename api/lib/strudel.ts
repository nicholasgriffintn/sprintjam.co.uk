export const strudelMusicPresets = {
  lobby: [
    {
      id: 'lobby-ambient-1',
      name: 'Ethereal Lobby Atmosphere',
      description:
        'Warm, evolving pads with glassy bell overtones — serene, futuristic waiting-room vibe.',
      style: 'ambient',
      complexity: 'medium',
      prompt:
        'Create an evolving ambient lobby bed with layered sine/triangle pads and airy bell overtones. Keep it serene and futuristic, not static. Very slow motion, gentle filter drift, and subtle stereo movement. 16–32 bar evolution, seamless loop.',
      exampleCode:
        'setcpm(60/4);\n' +
        '$pad: note("<c4 g4 bb4 e5> <f4 a4 c5 d5>").slow(8)\n' +
        '  .s("sine")\n' +
        '  .room(0.9)\n' +
        '  .lpf(rand.range(500,1800))\n' +
        '  .pan(perlin.range(0.35,0.65).slow(32))\n' +
        '  .gain(0.5);\n' +
        '$bells: note("<c6 ~ e6 ~ g6 ~>")\n' +
        '  .s("triangle")\n' +
        '  .slow(12)\n' +
        '  .room(0.95)\n' +
        '  .degradeBy(0.1)\n' +
        '  .gain(0.25);\n' +
        '$air: sound("pink")\n' +
        '  .hpf(400)\n' +
        '  .lpf(4000)\n' +
        '  .gain(0.03);\n' +
        'stack($pad,$bells,$air)',
    },
    {
      id: 'lobby-lofi-1',
      name: 'Lo-fi Waiting Groove',
      description:
        'Gentle lo-fi beat with dusty noise and drifting electric-piano chords.',
      style: 'ambient',
      complexity: 'medium',
      prompt:
        'Generate a chilled lo-fi lobby groove. Include vinyl/pink noise, warm EP/Rhodes chords, lazy swung drums, and light tape wobble. Loop in 8 bars with a tiny 4-bar variation.',
      exampleCode:
        'setcpm(76/4);\n' +
        '$noise: sound("pink").lpf(1400).gain(0.05).degradeBy(0.2);\n' +
        '$chords: chord("<Cmaj7 Am7 Dm7 G7>").voicing()\n' +
        '  .s("piano")\n' +
        '  .slow(4)\n' +
        '  .room(0.7)\n' +
        '  .lpf(2200)\n' +
        '  .pan(perlin.range(0.4,0.6).slow(16))\n' +
        '  .gain(0.45);\n' +
        '$drums: s("bd:1 ~ cp:2 ~ hh:3!2 hh:3!2")\n' +
        '  .bank("lofi")\n' +
        '  .swing(0.56)\n' +
        '  .humanize(0.03)\n' +
        '  .gain(0.38);\n' +
        'stack($noise,$chords,$drums)',
    },
  ],
  voting: [
    {
      id: 'voting-tech-minimal-1',
      name: 'Procedural Tech Pulse',
      description:
        'Hypnotic minimal pulse with tight kick, randomized hats, and synthetic bass.',
      style: 'techno',
      complexity: 'medium',
      prompt:
        'Build a precise but hypnotic minimal groove for a voting screen. Tight kick, subtly randomized hats, and a synthetic bass pulse. Add gentle filter motion and 8–16 bar development without getting busy.',
      exampleCode:
        'setcpm(122/4);\n' +
        '$kick: s("bd:1!4").bank("rolandtr909").room(0.08).gain(0.9);\n' +
        '$hats: s("hh(5,8) ~ hh(3,8)")\n' +
        '  .bank("rolandtr909")\n' +
        '  .gain(0.22)\n' +
        '  .pan(rand.range(0.2,0.8))\n' +
        '  .degradeBy(0.08);\n' +
        '$bass: note("<41 36 43 38>").ply(8)\n' +
        '  .s("sawtooth")\n' +
        '  .lpf(perlin.range(500,900).slow(16))\n' +
        '  .gain(0.5);\n' +
        '$ghosts: s("~ cp ~ ~").bank("rolandtr909").gain(0.12).degradeBy(0.4);\n' +
        'stack($kick,$hats,$bass,$ghosts)',
    },
    {
      id: 'voting-clock-1',
      name: 'Analog Clock Pulse',
      description:
        'Mechanical tick-tock with synth plucks — metronomic focus without harshness.',
      style: 'experimental',
      complexity: 'simple',
      prompt:
        'Generate a musical ticking loop that feels mechanical yet calm: alternating tick-tock, soft synth plucks, subtle filtering. 4–8 bar loop, minimal but engaging.',
      exampleCode:
        'setcpm(90/4);\n' +
        '$tick: s("hh(3,8)")\n' +
        '  .bank("rolandtr808")\n' +
        '  .gain(0.22)\n' +
        '  .lpf(3200)\n' +
        '  .pan(0.3);\n' +
        '$tock: s("rim:1(3,8,1)")\n' +
        '  .bank("rolandtr808")\n' +
        '  .gain(0.18)\n' +
        '  .lpf(2400)\n' +
        '  .pan(0.7);\n' +
        '$plucks: note("<c4 e4 g4>")\n' +
        '  .s("square")\n' +
        '  .slow(3)\n' +
        '  .lpf(1200)\n' +
        '  .gain(0.35);\n' +
        'stack($tick,$tock,$plucks)',
    },
  ],
  discussion: [
    {
      id: 'discussion-jazz-1',
      name: 'Modal Jazz Flow',
      description:
        'Modal piano voicings, soft ride swing, and upright-style bass — conversational and cool.',
      style: 'jazz',
      complexity: 'medium',
      prompt:
        'Create a modal jazz groove for group discussion: syncopated piano voicings, subtle ride cymbal swing, and smooth upright-style bass. Midtempo, lightly humanized, loop in 8 bars with tasteful passing chords.',
      exampleCode:
        'setcpm(110/4);\n' +
        '$chords: chord("<Dm9 G13 Cmaj9 A7>").voicing()\n' +
        '  .s("piano")\n' +
        '  .room(0.6)\n' +
        '  .slow(2)\n' +
        '  .swing(0.57)\n' +
        '  .gain(0.5);\n' +
        '$ride: s("hh:2(7,8)")\n' +
        '  .bank("jazzkit")\n' +
        '  .gain(0.16)\n' +
        '  .degradeBy(0.12)\n' +
        '  .humanize(0.02);\n' +
        '$bass: n("0 3 5 7 5 3 2 0")\n' +
        '  .scale("C2:mixolydian")\n' +
        '  .sound("triangle")\n' +
        '  .lpf(420)\n' +
        '  .swing(0.57)\n' +
        '  .gain(0.55);\n' +
        'stack($chords,$ride,$bass)',
    },
    {
      id: 'discussion-funky-1',
      name: 'Funky Midtempo Loop',
      description:
        'Syncopated kick/clap/hat and a playful bassline — lively but unobtrusive.',
      style: 'house',
      complexity: 'medium',
      prompt:
        'Make a midtempo funky loop with syncopated kick, clap, open/closed hats, and a friendly bass riff. Keep it energetic yet supportive for conversation. 8-bar loop with fills every 4 bars.',
      exampleCode:
        'setcpm(115/4);\n' +
        '$kick: s("bd:1!4").bank("rolandtr909").gain(0.9);\n' +
        '$clap: s("~ cp ~ cp(3,8)")\n' +
        '  .bank("rolandtr909")\n' +
        '  .gain(0.35);\n' +
        '$hat: s("hh!6 ~ oh ~")\n' +
        '  .bank("rolandtr909")\n' +
        '  .gain(0.16)\n' +
        '  .degradeBy(0.06);\n' +
        '$bass: n("0 0 3 5 7 5 3 0")\n' +
        '  .scale("E2:minor")\n' +
        '  .sound("sawtooth")\n' +
        '  .lpf(600)\n' +
        '  .swing(0.56)\n' +
        '  .gain(0.52);\n' +
        'stack($kick,$clap,$hat,$bass)',
    },
  ],
  reveal: [
    {
      id: 'reveal-victory-1',
      name: 'Victory Pulse',
      description:
        'Bright, celebratory pulse with confident tempo — chords, arps, and driving drums.',
      style: 'techno',
      complexity: 'medium',
      prompt:
        'Compose an energetic, celebratory groove for reveal: bright chords, driving four-on-the-floor, and animated arps. Clear 16-bar arc with small build and reset. Keep it clean and punchy.',
      exampleCode:
        'setcpm(130/4);\n' +
        '$kick: s("bd:2!4").bank("rolandtr909").room(0.08).gain(0.95);\n' +
        '$clap: s("~ cp(3,8) ~ cp(5,8)")\n' +
        '  .bank("rolandtr909")\n' +
        '  .gain(0.3);\n' +
        '$chords: chord("<Fmaj7 Gm7 Am7>").voicing()\n' +
        '  .s("sawtooth")\n' +
        '  .slow(2)\n' +
        '  .room(0.55)\n' +
        '  .lpf(2200)\n' +
        '  .gain(0.5);\n' +
        '$arps: note("<c5 e5 g5 a5>").fast(2)\n' +
        '  .s("square")\n' +
        '  .lpf(1600)\n' +
        '  .gain(0.32);\n' +
        'stack($kick,$clap,$chords,$arps)',
    },
    {
      id: 'reveal-chip-hero-1',
      name: 'Retro 8-Bit Win Theme',
      description:
        'Short chiptune victory fanfare — square arps and bright stacked harmony.',
      style: 'experimental',
      complexity: 'simple',
      prompt:
        'Generate a 2–4 bar chiptune fanfare for a win moment. Use square waves, brisk arpeggios, and bright triadic harmony. Keep it punchy and loopable.',
      exampleCode:
        'setcpm(160/4);\n' +
        '$mel: n("<0 4 7 12 7 4>*2")\n' +
        '  .scale("C5:major")\n' +
        '  .s("square")\n' +
        '  .fast(3)\n' +
        '  .gain(0.52);\n' +
        '$pad: note("<c4 e4 g4 c5>")\n' +
        '  .s("triangle")\n' +
        '  .room(0.6)\n' +
        '  .gain(0.38);\n' +
        'stack($mel,$pad)',
    },
  ],
  wrapup: [
    {
      id: 'wrapup-ambient-1',
      name: 'Closing Horizon',
      description:
        'Soft drones and fading piano voicings — gentle end-of-session calm.',
      style: 'ambient',
      complexity: 'medium',
      prompt:
        'Generate a peaceful wrap-up drone: long sine/triangle beds with soft, slowly fading piano voicings. Very slow tempo, large space, and a sense of exhale. 16-bar loop.',
      exampleCode:
        'setcpm(60/4);\n' +
        '$drone: sound("sine").slow(16).gain(0.06).lpf(1200).room(0.9);\n' +
        '$piano: chord("<Cmaj7 Am7 Dm9>").voicing()\n' +
        '  .s("piano")\n' +
        '  .slow(4)\n' +
        '  .room(0.92)\n' +
        '  .release(3)\n' +
        '  .gain(0.48);\n' +
        'stack($drone,$piano)',
    },
    {
      id: 'wrapup-reflective-1',
      name: 'Reflective Outro',
      description:
        'Slow, emotional outro with evolving soft-filter pads — gentle goodbye.',
      style: 'ambient',
      complexity: 'simple',
      prompt:
        'Create a reflective synth outro: smooth layered pads with very slow filter movement and subtle stereo drift. Keep it sparse, warm, and conclusive.',
      exampleCode:
        'setcpm(50/4);\n' +
        '$pad1: note("<c4 e4 g4>")\n' +
        '  .slow(8)\n' +
        '  .s("sine")\n' +
        '  .room(0.95)\n' +
        '  .lpf(perlin.range(900,1600).slow(24))\n' +
        '  .pan(perlin.range(0.4,0.6).slow(20));\n' +
        '$pad2: note("<a3 f4 c5>")\n' +
        '  .slow(8)\n' +
        '  .s("triangle")\n' +
        '  .room(0.9)\n' +
        '  .gain(0.4)\n' +
        '  .lpf(1800);\n' +
        'stack($pad1,$pad2)',
    },
  ],
};
