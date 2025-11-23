export const playChime = () => {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();

    const makeBeep = (timeOffset: number, frequency: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(frequency, ctx.currentTime + timeOffset);

        gain.gain.setValueAtTime(0.001, ctx.currentTime + timeOffset);
        gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + timeOffset + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + timeOffset + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + timeOffset);
        osc.stop(ctx.currentTime + timeOffset + 0.3);
    };

    makeBeep(0, 880);
    makeBeep(0.15, 1046);
};
