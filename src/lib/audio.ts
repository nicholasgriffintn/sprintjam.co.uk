let cachedAudioContext: AudioContext | null = null;

const getAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const AudioContextClass =
    window.AudioContext ||
    (window as typeof window & {
      webkitAudioContext?: typeof AudioContext;
    }).webkitAudioContext;

  if (!AudioContextClass) {
    return null;
  }

  if (!cachedAudioContext || cachedAudioContext.state === 'closed') {
    cachedAudioContext = new AudioContextClass();
  }

  return cachedAudioContext;
};

const makeBeep = (
  ctx: AudioContext,
  timeOffset: number,
  frequency: number
) => {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(frequency, ctx.currentTime + timeOffset);

  gain.gain.setValueAtTime(0.001, ctx.currentTime + timeOffset);
  gain.gain.exponentialRampToValueAtTime(
    0.3,
    ctx.currentTime + timeOffset + 0.01
  );
  gain.gain.exponentialRampToValueAtTime(
    0.001,
    ctx.currentTime + timeOffset + 0.25
  );

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(ctx.currentTime + timeOffset);
  osc.stop(ctx.currentTime + timeOffset + 0.3);

  osc.onended = () => {
    gain.disconnect();
    osc.disconnect();
  };
};

const scheduleChime = (ctx: AudioContext) => {
  makeBeep(ctx, 0, 880);
  makeBeep(ctx, 0.15, 1046);
};

export const primeChimeAudio = () => {
  const ctx = getAudioContext();
  if (!ctx) {
    return;
  }

  if (ctx.state === 'suspended') {
    ctx.resume().catch((err) => {
      console.warn('Unable to resume audio context', err);
    });
  }
};

export const playChime = () => {
  const ctx = getAudioContext();
  if (!ctx) {
    return;
  }

  const play = () => scheduleChime(ctx);

  if (ctx.state === 'suspended') {
    ctx
      .resume()
      .then(play)
      .catch((err) => {
        console.warn('Unable to resume audio context for timer chime', err);
      });
    return;
  }

  play();
};
