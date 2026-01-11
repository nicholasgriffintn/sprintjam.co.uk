export const strudelMusicPresets = {
  lobby: [
    {
      id: "lobby-lofi-chill-1",
      name: "Dusty Welcome",
      description:
        "Warm, inviting lofi beat with jazzy Rhodes chords and vinyl crackle.",
      style: "lofi",
      complexity: "medium",
      prompt:
        "Create a warm, welcoming lofi hip-hop beat for people joining a planning session. Use Rhodes-style electric piano with jazzy 7th and 9th chords (Cmaj7, Am7, Dm7, G7 progression works well). Add a gentle, swung drum pattern around 75 BPM with soft kicks, sidestick snares, and degraded hi-hats. Layer vinyl crackle at low volume for atmosphere. The bass should be deep and warm using sine waves with low-pass filtering. Add subtle tape wobble and filter drift. Keep the mood cozy, nostalgic, and unhurried — like settling into a comfortable chair before work begins.",
      exampleCode: `stack(
  s("bd ~ [~ bd] ~, ~ sd:1 ~ sd:1, hh*8?0.3")
    .bank("RolandTR808")
    .degradeBy(0.15)
    .crush(6)
    .late(0.01),
  chord("<Cmaj7 Am7 Dm7 G7>")
    .dict("ireal")
    .voicing()
    .s("piano")
    .lpf(sine.slow(8).range(800, 2000))
    .room(0.5)
    .gain(0.55),
  n("<0 ~ 2 ~> <3 5 3 0>")
    .scale("C2:minor")
    .s("sine")
    .lpf(400)
    .gain(0.65),
  sound("crackle")
    .gain(0.08)
    .lpf(3000)
).cpm(19)`,
    },
    {
      id: "lobby-lofi-dreamy-1",
      name: "Afternoon Drift",
      description:
        "Dreamy lofi atmosphere with soft pads and gentle percussion.",
      style: "lofi",
      complexity: "simple",
      prompt:
        "Generate a dreamy, soft lofi backdrop for a relaxed lobby environment. Use gentle pad textures layered with distant piano notes and subtle bell tones. The drums should be minimal — perhaps just a soft kick and brushed hi-hats with heavy swing. Keep the tempo around 70 BPM. Add vinyl noise and tape saturation for warmth. The mood should feel like a lazy afternoon — peaceful, slightly melancholic, and inviting. Avoid anything too attention-grabbing; this is background music for waiting.",
      exampleCode: `stack(
  s("bd:3 ~ ~ ~, ~ ~ hh:2 ~")
    .bank("RolandTR808")
    .gain(0.4)
    .room(0.3)
    .late(0.02),
  note("<c4 e4 g4 b4> <a3 c4 e4 g4>")
    .slow(4)
    .s("piano")
    .room(0.8)
    .lpf(1800)
    .gain(0.4),
  sound("crackle")
    .gain(0.06)
    .lpf(2500)
).cpm(17)`,
    },
    {
      id: "lobby-lofi-jazzhop-1",
      name: "Coffee Shop Vibes",
      description: "Jazzy lofi with walking bass hints and mellow keys.",
      style: "lofi",
      complexity: "medium",
      prompt:
        "Create a coffee shop style lofi beat perfect for casual gathering. Feature mellow electric piano voicings with jazz-influenced chord progressions (try Fmaj7, Em7, Dm7, Cmaj7). Add a gentle boom-bap drum pattern around 80 BPM with soft, compressed kicks and snappy but quiet snares. Include a subtle walking-style bass using sine or triangle waves. Layer light vinyl crackle and room reverb. The vibe should be sophisticated but unobtrusive — like background music in a cozy cafe where people chat before a meeting.",
      exampleCode: `stack(
  s("bd:2 ~ sd:1 ~, [~ hh]*4")
    .bank("RolandTR808")
    .degradeBy(0.1)
    .crush(5)
    .room(0.2),
  chord("<Fmaj7 Em7 Dm7 Cmaj7>")
    .dict("ireal")
    .voicing()
    .s("piano")
    .lpf(sine.slow(12).range(900, 1800))
    .room(0.6)
    .gain(0.5),
  n("0 3 5 7 5 3 0 ~")
    .scale("C2:major")
    .s("triangle")
    .lpf(500)
    .gain(0.55),
  sound("crackle")
    .gain(0.07)
).cpm(20)`,
    },
  ],
  voting: [
    {
      id: "voting-lofi-focus-1",
      name: "Focus Flow",
      description:
        "Steady lofi beat with a subtle pulse that aids concentration.",
      style: "lofi",
      complexity: "medium",
      prompt:
        "Create a focused, steady lofi beat designed to help people concentrate while making decisions. Use a consistent, reliable drum pattern around 85 BPM with a solid but soft kick on beats 1 and 3, and gentle snares. Hi-hats should tick steadily with slight swing. The chords should be simple and non-distracting — maybe a two-chord vamp using minor 7ths. Bass should be warm and predictable. Add subtle vinyl texture. The mood should feel productive and calm — like a gentle metronome that helps people think without rushing them.",
      exampleCode: `stack(
  s("bd ~ bd ~, ~ sd ~ sd, hh*8")
    .bank("RolandTR808")
    .degradeBy(0.08)
    .crush(5)
    .late(0.008),
  chord("<Am7 Dm7>")
    .dict("ireal")
    .voicing()
    .s("piano")
    .lpf(1400)
    .room(0.4)
    .gain(0.5),
  n("0 0 3 0 5 3 0 ~")
    .scale("A1:minor")
    .s("sine")
    .lpf(350)
    .gain(0.6),
  sound("crackle")
    .gain(0.05)
    .lpf(2800)
).cpm(21)`,
    },
    {
      id: "voting-lofi-minimal-1",
      name: "Quiet Deliberation",
      description: "Minimal lofi texture with sparse drums and soft tones.",
      style: "lofi",
      complexity: "simple",
      prompt:
        "Generate a minimal, unobtrusive lofi backdrop for focused voting. Use very sparse drums — perhaps just a soft kick every other bar and occasional hi-hat ticks. Add a simple, repeating piano motif using just 3-4 notes in a minor key. Keep the tempo around 70 BPM. The bass should be subtle and understated. Include vinyl crackle and heavy low-pass filtering for a muffled, distant quality. This should feel like thinking music — present but almost invisible, supporting concentration without any distraction.",
      exampleCode: `stack(
  s("bd:3 ~ ~ ~, ~ ~ ~ hh:1")
    .bank("RolandTR808")
    .slow(2)
    .gain(0.35)
    .crush(4),
  note("<e4 ~ g4 ~> <~ d4 ~ c4>")
    .slow(2)
    .s("piano")
    .lpf(1200)
    .room(0.6)
    .gain(0.4),
  n("<0 ~ ~ 0>")
    .scale("A1:minor")
    .s("sine")
    .slow(2)
    .lpf(300)
    .gain(0.5),
  sound("crackle")
    .gain(0.06)
).cpm(17)`,
    },
    {
      id: "voting-lofi-thoughtful-1",
      name: "Thoughtful Groove",
      description: "Midtempo lofi with gentle momentum for active thinking.",
      style: "lofi",
      complexity: "medium",
      prompt:
        'Create a thoughtful lofi beat that provides gentle momentum during voting without rushing anyone. Use a midtempo around 82 BPM with a classic boom-bap feel — kicks on 1 and the "and" of 2, snares on 2 and 4. Hi-hats should have nice swing with occasional open hats. Feature Rhodes-style chords with extensions (9ths, 11ths) that cycle through a 4-chord progression. Bass should groove subtly. Add tape warmth and vinyl texture. The mood should feel contemplative yet engaged — like music for making thoughtful decisions.',
      exampleCode: `stack(
  s("bd [~ bd] sd ~, hh*8?0.25, ~ ~ ~ oh")
    .bank("RolandTR808")
    .degradeBy(0.12)
    .crush(6)
    .late(0.012),
  chord("<Em9 Am11 Dm9 G13>")
    .dict("ireal")
    .voicing()
    .s("piano")
    .lpf(sine.slow(16).range(1000, 2200))
    .room(0.5)
    .gain(0.5),
  n("0 ~ 3 5 7 5 ~ 3")
    .scale("E2:dorian")
    .s("triangle")
    .lpf(450)
    .gain(0.55),
  sound("crackle")
    .gain(0.07)
).cpm(20)`,
    },
  ],
  discussion: [
    {
      id: "discussion-lofi-conversational-1",
      name: "Round Table Groove",
      description: "Upbeat lofi beat perfect for lively team discussions.",
      style: "lofi",
      complexity: "medium",
      prompt:
        "Create an upbeat, conversational lofi beat that energizes team discussion without overpowering voices. Use a slightly faster tempo around 88-92 BPM with a bouncy, swung drum pattern. Feature bright but filtered piano chords with jazzy voicings that change every 2 bars. The bass should have some movement and groove. Hi-hats should be lively with ghost notes. Add vinyl crackle and subtle room reverb. The mood should feel collaborative and positive — like the musical equivalent of a productive brainstorm where everyone is engaged.",
      exampleCode: `stack(
  s("bd ~ [~ bd] sd, ~ sd ~ ~, hh*8?0.2")
    .bank("RolandTR808")
    .degradeBy(0.1)
    .crush(5)
    .late(0.01)
    .room(0.2),
  chord("<Cmaj7 Am7 Fmaj7 G7>")
    .dict("ireal")
    .voicing()
    .s("piano")
    .lpf(sine.slow(8).range(1200, 2400))
    .room(0.45)
    .gain(0.55),
  n("0 3 5 7 [5 7] 3 5 0")
    .scale("C2:major")
    .s("sawtooth")
    .lpf(500)
    .gain(0.5),
  sound("crackle")
    .gain(0.06)
).cpm(23)`,
    },
    {
      id: "discussion-lofi-jazzy-1",
      name: "Jazz Cafe Discussion",
      description: "Sophisticated jazzy lofi for thoughtful team dialogue.",
      style: "lofi",
      complexity: "complex",
      prompt:
        "Generate a sophisticated jazzy lofi beat that encourages thoughtful discussion. Use a relaxed tempo around 85 BPM with brushed-style drums — soft kick, sidestick snare, and gentle ride-style hi-hats. Feature rich jazz chord voicings (Dm9, G13, Cmaj9, A7alt) with slight timing variations for a human feel. Add a walking-inspired bassline using warm sine tones. Include vinyl atmosphere and generous reverb. The vibe should feel like a late-night jazz club conversation — intimate, intelligent, and flowing. Every 8 bars, add subtle variations to keep it alive.",
      exampleCode: `stack(
  s("bd:1 ~ sd:2 ~, [hh:3 ~]*4, ~ ~ ~ oh:1")
    .bank("RolandTR808")
    .degradeBy(0.15)
    .crush(4)
    .late(0.015)
    .room(0.3),
  chord("<Dm9 G13 Cmaj9 A7>")
    .dict("ireal")
    .voicing()
    .s("piano")
    .lpf(sine.slow(12).range(900, 1900))
    .room(0.6)
    .gain(0.5)
    .every(8, x => x.add(note(12))),
  n("0 2 3 5 7 5 3 2")
    .scale("C2:dorian")
    .s("sine")
    .lpf(400)
    .gain(0.6)
    .sometimes(x => x.late(0.01)),
  sound("crackle")
    .gain(0.08)
    .lpf(2500)
).cpm(21)`,
    },
    {
      id: "discussion-lofi-mellow-1",
      name: "Mellow Consensus",
      description: "Gentle lofi backdrop that supports calm team dialogue.",
      style: "lofi",
      complexity: "simple",
      prompt:
        "Create a mellow, supportive lofi beat for calm team discussions. Use a gentle tempo around 78 BPM with soft, understated drums — just enough rhythm to keep energy present without competing with voices. Feature simple, warm piano chords using major 7ths for a positive, open feeling. Bass should be round and supportive. Add plenty of vinyl texture and tape warmth. The mood should feel supportive and harmonious — like background music that makes agreement feel natural and conversation flow easily.",
      exampleCode: `stack(
  s("bd ~ ~ bd, ~ sd ~ ~, hh*4")
    .bank("RolandTR808")
    .gain(0.35)
    .crush(5)
    .room(0.25),
  chord("<Gmaj7 Dmaj7 Emaj7 Cmaj7>")
    .dict("ireal")
    .voicing()
    .s("piano")
    .lpf(1600)
    .room(0.55)
    .gain(0.45),
  n("0 ~ 4 ~ 7 ~ 4 ~")
    .scale("G2:major")
    .s("sine")
    .lpf(350)
    .gain(0.55),
  sound("crackle")
    .gain(0.07)
).cpm(19)`,
    },
  ],
  reveal: [
    {
      id: "reveal-lofi-triumph-1",
      name: "Consensus Victory",
      description:
        "Uplifting lofi moment with bright chords for successful reveals.",
      style: "lofi",
      complexity: "medium",
      prompt:
        "Create an uplifting lofi beat for the moment when votes are revealed and consensus is reached. Use a brighter, more energetic tempo around 95 BPM. Feature triumphant major chord progressions with satisfying resolutions. Add some melodic movement — perhaps an ascending arpeggio or hopeful piano motif. Drums should be crisp but still have that lofi warmth. The mood should feel like a small victory — satisfying, positive, and celebratory without being over the top. Include a sense of resolution and accomplishment.",
      exampleCode: `stack(
  s("bd sd bd sd, hh*8, ~ ~ ~ [cp cp]")
    .bank("RolandTR808")
    .degradeBy(0.08)
    .crush(5)
    .room(0.3),
  chord("<Cmaj7 G Fmaj7 G>")
    .dict("ireal")
    .voicing()
    .s("piano")
    .lpf(2200)
    .room(0.5)
    .gain(0.6),
  n("0 4 7 11 7 4 0 ~")
    .scale("C4:major")
    .s("triangle")
    .lpf(2500)
    .room(0.4)
    .gain(0.4),
  n("0 3 5 7")
    .scale("C2:major")
    .s("sine")
    .lpf(450)
    .gain(0.6),
  sound("crackle")
    .gain(0.05)
).cpm(24)`,
    },
    {
      id: "reveal-lofi-surprise-1",
      name: "Plot Twist",
      description: "Playful lofi beat for unexpected or split vote reveals.",
      style: "lofi",
      complexity: "medium",
      prompt:
        "Generate a playful, slightly quirky lofi beat for moments when vote results are surprising or split. Use an interesting tempo around 88 BPM with some rhythmic playfulness — maybe a syncopated kick pattern or unexpected hi-hat accents. Feature chord progressions with some tension and release — minor to major movements work well. Add a curious melodic element that feels questioning or intriguing. The mood should feel like an interesting plot twist — not negative, but engaging and thought-provoking. Keep the lofi warmth with vinyl texture and filtering.",
      exampleCode: `stack(
  s("[bd ~] bd [~ bd] sd, hh*8?0.3, ~ cp ~ ~")
    .bank("RolandTR808")
    .degradeBy(0.1)
    .crush(6)
    .late(0.01),
  chord("<Am7 Dm7 Fmaj7 E7>")
    .dict("ireal")
    .voicing()
    .s("piano")
    .lpf(sine.slow(4).range(1000, 2000))
    .room(0.5)
    .gain(0.55),
  n("<0 3 5 7> <7 5 3 0>")
    .scale("A3:minor")
    .s("square")
    .lpf(1200)
    .gain(0.35),
  n("0 ~ 3 ~ 5 ~ 7 ~")
    .scale("A1:minor")
    .s("sine")
    .lpf(400)
    .gain(0.55),
  sound("crackle")
    .gain(0.07)
).cpm(22)`,
    },
    {
      id: "reveal-lofi-zen-1",
      name: "Zen Resolution",
      description: "Calm, satisfying lofi for peaceful vote resolution.",
      style: "lofi",
      complexity: "simple",
      prompt:
        "Create a calm, satisfying lofi beat for peaceful vote reveals. Use a gentle tempo around 80 BPM with soft, resolving drums. Feature warm, open major 7th chords that feel conclusive and harmonious. Add a simple, descending melodic motif that suggests settling and resolution. The bass should be grounded and stable. Include generous vinyl warmth and reverb. The mood should feel like a satisfying conclusion — peaceful, complete, and ready for the next topic. Think of the feeling after a good decision has been made together.",
      exampleCode: `stack(
  s("bd ~ sd ~, hh*4")
    .bank("RolandTR808")
    .gain(0.4)
    .crush(5)
    .room(0.35),
  chord("<Fmaj7 Cmaj7 Dm7 Cmaj7>")
    .dict("ireal")
    .voicing()
    .s("piano")
    .lpf(1800)
    .room(0.6)
    .gain(0.5),
  note("<g4 e4 d4 c4>")
    .slow(2)
    .s("triangle")
    .room(0.5)
    .gain(0.4),
  n("0 ~ ~ 0")
    .scale("C2:major")
    .s("sine")
    .lpf(350)
    .gain(0.55),
  sound("crackle")
    .gain(0.06)
).cpm(20)`,
    },
  ],
  wrapup: [
    {
      id: "wrapup-lofi-sunset-1",
      name: "Session Sunset",
      description:
        "Warm, fading lofi beat for winding down after a planning session.",
      style: "lofi",
      complexity: "medium",
      prompt:
        "Create a warm, fading lofi beat perfect for ending a planning session. Use a slow tempo around 68-72 BPM with drums that gradually become more sparse. Feature nostalgic, bittersweet chord progressions that feel like a satisfying ending — perhaps moving toward a final major resolution. Add extended reverb tails and slowly closing filters. The bass should be soft and supportive. Include heavier vinyl crackle for a cozy, vintage ending feel. The mood should feel like a session well spent — accomplishment mixed with relaxation, ready to part ways until next time.",
      exampleCode: `stack(
  s("bd ~ ~ ~, ~ sd ~ ~, hh*4?0.3")
    .bank("RolandTR808")
    .degradeBy(0.2)
    .crush(4)
    .room(0.5)
    .slow(1.2),
  chord("<Dm7 Am7 Fmaj7 Cmaj7>")
    .dict("ireal")
    .voicing()
    .s("piano")
    .lpf(sine.slow(16).range(600, 1400))
    .room(0.7)
    .gain(0.45),
  n("<0 2 4 7>")
    .scale("C3:major")
    .s("triangle")
    .slow(2)
    .room(0.6)
    .gain(0.35),
  n("0 ~ ~ ~")
    .scale("C2:major")
    .s("sine")
    .lpf(300)
    .gain(0.5),
  sound("crackle")
    .gain(0.1)
    .lpf(2000)
).cpm(17)`,
    },
    {
      id: "wrapup-lofi-drift-1",
      name: "Drifting Away",
      description: "Dreamy, dissolving lofi texture for session endings.",
      style: "lofi",
      complexity: "simple",
      prompt:
        "Generate a dreamy, dissolving lofi texture for the end of a session. Use very sparse elements — occasional soft kicks, distant piano notes that ring out with heavy reverb, and gentle pad textures. Keep tempo around 65 BPM or slower. The drums should feel like they are fading into the distance. Add plenty of vinyl noise and tape saturation. The mood should feel like peacefully drifting off — the musical equivalent of closing your laptop and taking a deep breath. This is ambient lofi for gentle conclusions.",
      exampleCode: `stack(
  s("bd:3 ~ ~ ~")
    .bank("RolandTR808")
    .slow(2)
    .gain(0.3)
    .room(0.7),
  note("<c4 ~ e4 ~> <~ g4 ~ a4>")
    .slow(4)
    .s("piano")
    .lpf(1000)
    .room(0.9)
    .release(2)
    .gain(0.35),
  note("<c3 e3 g3>")
    .slow(8)
    .s("sine")
    .lpf(sine.slow(16).range(200, 600))
    .room(0.8)
    .gain(0.3),
  sound("crackle")
    .gain(0.12)
    .lpf(1500)
).cpm(16)`,
    },
    {
      id: "wrapup-lofi-gratitude-1",
      name: "Thankful Outro",
      description:
        "Warm, appreciative lofi beat expressing gratitude for teamwork.",
      style: "lofi",
      complexity: "medium",
      prompt:
        "Create a warm, appreciative lofi beat that expresses gratitude for a productive planning session. Use a gentle tempo around 75 BPM with soft, unhurried drums. Feature warm major chord progressions with satisfying voicings that feel thankful and complete. Add a simple, memorable melodic motif that feels like a friendly wave goodbye. Bass should be round and comforting. Include vinyl warmth and medium reverb. The mood should feel like genuine appreciation — the musical equivalent of thanking your teammates for good collaboration before signing off.",
      exampleCode: `stack(
  s("bd ~ sd ~, [~ hh]*4")
    .bank("RolandTR808")
    .degradeBy(0.15)
    .crush(5)
    .room(0.4)
    .gain(0.4),
  chord("<Gmaj7 Em7 Cmaj7 D7>")
    .dict("ireal")
    .voicing()
    .s("piano")
    .lpf(sine.slow(12).range(800, 1600))
    .room(0.6)
    .gain(0.5),
  note("<g4 b4 d5 g5> <d5 b4 g4 d4>")
    .slow(4)
    .s("triangle")
    .lpf(1400)
    .room(0.5)
    .gain(0.35),
  n("0 ~ 4 ~")
    .scale("G2:major")
    .s("sine")
    .lpf(400)
    .gain(0.5),
  sound("crackle")
    .gain(0.08)
).cpm(19)`,
    },
  ],
};
