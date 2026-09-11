// Web Audio API Gentle Chime Synthesizer
// Works in all modern browsers without external audio assets

export function playChimeSound(type: 'bell' | 'alert' | 'success' = 'bell') {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;

    if (type === 'bell') {
      // Pleasant dual-tone bell chime (C6 + G5)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(1046.5, now); // C6
      osc1.frequency.exponentialRampToValueAtTime(1046.5, now + 1.2);

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(783.99, now); // G5
      osc2.frequency.exponentialRampToValueAtTime(783.99, now + 1.2);

      gainNode.gain.setValueAtTime(0.25, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 1.2);
      osc2.stop(now + 1.2);
    } else if (type === 'alert') {
      // Two short alert pulses
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(1174, now + 0.15);

      gainNode.gain.setValueAtTime(0.2, now);
      gainNode.gain.setValueAtTime(0.02, now + 0.12);
      gainNode.gain.setValueAtTime(0.25, now + 0.15);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.6);
    } else {
      // Success tone (E5 to A5)
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);

      gainNode.gain.setValueAtTime(0.2, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.5);
    }
  } catch (err) {
    console.debug('Audio chime skipped:', err);
  }
}
