let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") {
    return null;
  }

  const AudioContextClass =
    window.AudioContext ||
    (
      window as Window &
        typeof globalThis & {
          webkitAudioContext?: typeof AudioContext;
        }
    ).webkitAudioContext;

  if (!AudioContextClass) {
    return null;
  }

  if (!audioContext || audioContext.state === "closed") {
    audioContext = new AudioContextClass();
  }

  if (audioContext.state === "suspended") {
    audioContext.resume().catch(() => {});
  }

  return audioContext;
}

function playTone({
  frequency,
  duration,
  type = "sine",
  volume = 0.12,
}: {
  frequency: number;
  duration: number;
  type?: OscillatorType;
  volume?: number;
}) {
  const ctx = getAudioContext();
  if (!ctx) {
    return;
  }

  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;

  gain.gain.setValueAtTime(0.001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(volume, ctx.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + duration);
}

export function playFidgetPopSound(isPopped: boolean): void {
  playTone({
    frequency: isPopped ? 210 : 330,
    duration: 0.08,
    type: "triangle",
    volume: 0.1,
  });
}

export function playFidgetSpinSound(): void {
  playTone({
    frequency: 560,
    duration: 0.06,
    type: "sine",
    volume: 0.09,
  });
}

export function playFidgetStickSound(strength: number): void {
  playTone({
    frequency: 180 + strength * 420,
    duration: 0.05,
    type: "square",
    volume: 0.045,
  });
}

export function playFidgetSwitchSound(isOn: boolean): void {
  playTone({
    frequency: isOn ? 420 : 260,
    duration: 0.045,
    type: "square",
    volume: 0.08,
  });
}

export function playFidgetSlideSound(position: number): void {
  playTone({
    frequency: 240 + position * 44,
    duration: 0.04,
    type: "triangle",
    volume: 0.055,
  });
}

export function playFidgetBeadSound(position: number): void {
  playTone({
    frequency: 300 + position * 36,
    duration: 0.05,
    type: "sine",
    volume: 0.075,
  });
}
