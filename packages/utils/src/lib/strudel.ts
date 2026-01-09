export const strudelMusicPresets = {
  lobby: [
    {
      id: "lobby-ambient-1",
      name: "Ethereal Lobby Atmosphere",
      description:
        "Warm evolving sine textures with subtle bell tones — chill waiting room energy.",
      style: "ambient",
      complexity: "medium",
      prompt:
        "Create an expansive, gently evolving ambient atmosphere ideal for a calm lobby environment. Combine layered sine-based pads, soft harmonic clusters, and shimmering bell overtones that drift slowly over time. Introduce subtle motion through long filter sweeps, slow LFO modulation, and evolving stereo width. Avoid sharp transients or rhythmic anchors — the feeling should be serene, futuristic, and endlessly flowing. Ensure the texture loops seamlessly with imperceptible 16–32 bar evolutions that keep it alive without drawing too much attention.",
      exampleCode:
        'setcpm(60/4);\n$pad: note("<c4 g4 bb4 e5> <f4 a4 c5 d5>").slow(8).s("sine").room(0.9).lpf(rand.range(400,2000));\n$bells: note("<c6 ~ e6 ~ g6 ~>").s("triangle").slow(12).room(0.95).gain(0.3);\nstack($pad,$bells)',
    },
    {
      id: "lobby-lofi-1",
      name: "Lo-fi Waiting Groove",
      description:
        "Gentle lo-fi beat with filtered noise and drifting piano chords.",
      style: "ambient",
      complexity: "medium",
      prompt:
        "Generate a cozy, dusty lo-fi groove tailored for a welcoming lobby. Use a mellow tempo around 72–82 BPM with a soft, swung drum feel. Incorporate vinyl or pink-noise layers, subtle tape-warp modulation, and gently detuned Rhodes-style chord progressions built from warm jazzy voicings like maj7, min7, and add9. Add a simple, supportive bassline with round, soft attack. The mood should be nostalgic, warm, and slightly melancholic without ever becoming distracting. Include micro-timing imperfections and gradual filter drift so the loop feels human, organic, and comfortably imperfect. Aim for an 8–16 bar loop with delicate variations every 4 bars.",
      exampleCode:
        'setcpm(75/4);\n$noise: sound("pink").lpf(1200).gain(0.05);\n$chords: chord("<Cmaj7 Am7 Dm7 G7>").voicing().s("piano").slow(4).room(0.7).degradeBy(0.15);\n$drums: s("bd:1!2 cp:2(2,4,1) hh:3!4").bank("lofi").gain(0.4).room(0.2);\nstack($noise,$chords,$drums)',
    },
  ],
  voting: [
    {
      id: "voting-tech-minimal-1",
      name: "Procedural Tech Pulse",
      description:
        "Hypnotic ticking groove with synthetic kick and randomized hats.",
      style: "techno",
      complexity: "medium",
      prompt:
        "Create a tightly controlled, minimalist tech pulse designed for focused decision-making moments. Use a crisp, punchy kick as the rhythmic anchor, paired with randomized yet precise hi-hats that shift subtly across stereo space. Add a synthetic bass pulse that locks rhythmically with the kick but evolves through slow filter sweeps or LFO drive, giving a futuristic sense of momentum. Keep the arrangement hypnotic, restrained, and clean, avoiding unnecessary density. The overall sound should feel algorithmic, efficient, and modern — a subtle engine of motion beneath the voting UI. Use a 16-bar loop with micro-variations every 4 bars.",
      exampleCode:
        'setcpm(120/4);\n$kick: s("bd:1!4").bank("rolandtr909").room(0.1);\n$hats: s("hh(5,8)").bank("rolandtr909").gain(0.25).pan(rand.range(0,1));\n$bass: note("<41 36 43 38>").ply(8).s("sawtooth").lpf(700).postgain(0.5);\nstack($kick,$hats,$bass)',
    },
    {
      id: "voting-clock-1",
      name: "Analog Clock Pulse",
      description:
        "Mechanical ticking loop with synth plucks, like a metronome of focus.",
      style: "experimental",
      complexity: "simple",
      prompt:
        "Design a precise, mechanical ticking rhythm reminiscent of a futuristic analog clock. Use clean percussive ticks and tocks with alternating timbres, supported by minimal synth plucks that repeat in a calm, steady pattern. The mood should reinforce focus and forward motion without feeling tense or distracting. Maintain a simple 4–8 bar cycle with tiny tonal variations to keep the loop from becoming stale, leaning into a subtle metronomic aesthetic that feels both mechanical and musical.",
      exampleCode:
        'setcpm(90/4);\n$tick: s("hh(3,8)").bank("rolandtr808").gain(0.2).lpf(3000);\n$plucks: note("<c4 e4 g4>").slow(3).s("square").lpf(1200).gain(0.4);\nstack($tick,$plucks)',
    },
  ],
  discussion: [
    {
      id: "discussion-jazz-1",
      name: "Modal Jazz Flow",
      description: "Piano chords, soft ride cymbals, and upright-style bass.",
      style: "jazz",
      complexity: "medium",
      prompt:
        "Create a smooth modal jazz groove that encourages relaxed yet focused discussion. Use syncopated piano voicings inspired by modal progressions such as Dorian or Mixolydian, played with a gentle swing. Add a lightly brushed or softly struck ride cymbal pattern with natural human variation. Support the harmony with an upright-style bassline that walks minimally, prioritizing clarity and warmth. The loop should feel fluid, conversational, and sophisticated — energetic enough to keep momentum but mellow enough to avoid distraction. Aim for an 8-bar loop with light embellishments every 4 bars.",
      exampleCode:
        'setcpm(110/4);\n$chords: chord("<Dm9 G13 Cmaj9 A7>").voicing().s("piano").room(0.6).slow(2);\n$ride: s("hh:2(7,8)").bank("jazzkit").gain(0.15).degradeBy(0.1);\n$bass: n("0 3 5 7").scale("C2:mixolydian").sound("triangle").lpf(400);\nstack($chords,$ride,$bass)',
    },
    {
      id: "discussion-funky-1",
      name: "Funky Midtempo Loop",
      description: "Syncopated drums and bass with a relaxed groove.",
      style: "house",
      complexity: "medium",
      prompt:
        "Craft a lively yet unobtrusive midtempo groove with a distinctly funky character. Use syncopated kick and clap patterns, bright but soft hi-hats, and a playful bassline that bounces between chord tones. Maintain a tight, warm production aesthetic with subtle swing and humanized timing for feel. The loop should feel rhythmically engaging and upbeat without stealing attention from conversation. Structure it around an 8-bar loop containing tasteful fills or accents every 4 bars to keep the groove fresh.",
      exampleCode:
        'setcpm(115/4);\n$kick: s("bd:1!4").bank("rolandtr909");\n$clap: s("cp(2,8,1)").bank("rolandtr909").gain(0.4);\n$hat: s("hh!8").bank("rolandtr909").gain(0.15);\n$bass: n("0 0 3 5 7 5 3 0").scale("E2:minor").sound("sawtooth").lpf(600).gain(0.5);\nstack($kick,$clap,$hat,$bass)',
    },
  ],
  reveal: [
    {
      id: "reveal-victory-1",
      name: "Victory Pulse",
      description: "Bright, celebratory groove for consensus reveal.",
      style: "techno",
      complexity: "medium",
      prompt:
        "Compose a bright, high-energy celebratory groove that signals a moment of success. Use a driving four-on-the-floor kick, crisp claps, and vivid sawtooth chords that feel uplifting and triumphant. Add animated arpeggios or melodic figures that enhance the sense of rising energy. The overall mood should feel victorious and confident without becoming harsh or overly intense. Structure it as a 16-bar loop with light rhythmic or harmonic variations every 4 bars to emphasize momentum during the reveal moment.",
      exampleCode:
        'setcpm(130/4);\n$kick: s("bd:2!4").bank("rolandtr909").room(0.1);\n$clap: s("cp(3,8)").bank("rolandtr909").gain(0.3);\n$chords: chord("<Fmaj7 Gm7 Am7>").voicing().s("sawtooth").slow(2).room(0.6);\n$arps: note("<c5 e5 g5 a5>").fast(2).s("square").lpf(1500).gain(0.3);\nstack($kick,$clap,$chords,$arps)',
    },
    {
      id: "reveal-chip-hero-1",
      name: "Retro 8-Bit Win Theme",
      description: "Chiptune victory fanfare using square wave arps.",
      style: "experimental",
      complexity: "simple",
      prompt:
        "Design a short, punchy 8-bit victory jingle reminiscent of classic chiptune game triumphs. Use bright square-wave arpeggios, rapid note patterns, and cheerful major harmonies. Keep the texture simple and the transients sharp, ensuring the melody feels instantly celebratory and memorable. Aim for a compact 2–4 bar loop that sounds heroic and loops cleanly if repeated.",
      exampleCode:
        'setcpm(160/4);\n$mel: n("<0 4 7 12 7 4>*2").scale("C5:major").s("square").fast(3).gain(0.5);\n$pad: note("<c4 e4 g4 c5>").s("triangle").room(0.6).gain(0.4);\nstack($mel,$pad)',
    },
  ],
  wrapup: [
    {
      id: "wrapup-ambient-1",
      name: "Closing Horizon",
      description:
        "Ambient drone with fading piano chords — end-of-session vibe.",
      style: "ambient",
      complexity: "medium",
      prompt:
        "Generate a peaceful, reflective ambient drone perfect for ending a session. Layer long, soft sine or triangle drones with gentle harmonic evolution, complemented by distant, reverberant piano chords that fade naturally into the space. The atmosphere should feel like a slow exhale — calming, warm, and quietly expansive. Make the loop extremely smooth with long 16–32 bar cycles and almost imperceptible variations.",
      exampleCode:
        'setcpm(60/4);\n$drone: sound("sine").slow(16).gain(0.05);\n$piano: chord("<Cmaj7 Am7 Dm9>").voicing().s("piano").slow(4).room(0.9).release(3);\nstack($drone,$piano)',
    },
    {
      id: "wrapup-reflective-1",
      name: "Reflective Outro",
      description: "Slow, emotional outro with layered synth pads.",
      style: "ambient",
      complexity: "simple",
      prompt:
        "Create a gentle, reflective synth outro that conveys a sense of closure and calm. Use layered pads with soft attacks, slow filter movement, and warm harmonic intervals. Keep the mood introspective and soothing, with long, drifting chords and understated modulation. Maintain a very slow tempo and ensure the texture blends smoothly into a seamless loop suitable for winding down at the end of a session.",
      exampleCode:
        'setcpm(50/4);\n$pad1: note("<c4 e4 g4>").slow(8).s("sine").room(0.95);\n$pad2: note("<a3 f4 c5>").slow(8).s("triangle").room(0.9).gain(0.4);\nstack($pad1,$pad2)',
    },
  ],
};
