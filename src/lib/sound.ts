/**
 * Audio notification utility using Web Audio API.
 * Synthesizes a clean, pleasant, multi-harmonic completion chime.
 * No external sound files or network requests required.
 */
export function playCompletionChime(): void {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // Harmonic bell sequence: F5 (698.46Hz) -> A5 (880Hz) -> C6 (1046.5Hz)
    const notes = [
      { freq: 698.46, delay: 0, duration: 0.45, gain: 0.18 },
      { freq: 880.0, delay: 0.1, duration: 0.55, gain: 0.22 },
      { freq: 1046.5, delay: 0.22, duration: 0.8, gain: 0.26 },
    ];

    notes.forEach(({ freq, delay, duration, gain: peakGain }) => {
      const startTime = now + delay;
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      // Subtle overtone for warmth
      gainNode.gain.setValueAtTime(0.0001, startTime);
      gainNode.gain.exponentialRampToValueAtTime(peakGain, startTime + 0.03);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration + 0.05);
    });

    // Auto-close context after chime ends to free resources
    setTimeout(() => {
      try {
        ctx.close().catch(() => {});
      } catch {
        // ignore
      }
    }, 1500);
  } catch (err) {
    console.warn('Audio chime notification failed to play:', err);
  }
}
