/**
 * High-definition synthetic chime for kitchen order alerts using Web Audio API.
 * Requires 0 external assets, 0 network latency, and works on all modern browsers.
 */

let sharedAudioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioCtx) return null;

  if (!sharedAudioContext || sharedAudioContext.state === "closed") {
    sharedAudioContext = new AudioCtx();
  }
  return sharedAudioContext;
}

/**
 * Resumes audio context on user interaction to comply with browser autoplay policies.
 */
export async function unlockAudioContext(): Promise<boolean> {
  const ctx = getAudioContext();
  if (!ctx) return false;
  if (ctx.state === "suspended") {
    try {
      await ctx.resume();
      return true;
    } catch {
      return false;
    }
  }
  return true;
}

/**
 * Plays a pleasant, crisp, distinctive Japanese restaurant chime (dual bell chord).
 * Repeat count defaults to 2 for kitchen clarity.
 */
export async function playOrderChime(repeats = 2): Promise<void> {
  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch {
      return;
    }
  }

  const now = ctx.currentTime;

  function scheduleBellNote(
    freq: number,
    startTime: number,
    duration: number,
    gainLevel: number,
  ) {
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // Sine tone with subtle overtone
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, startTime);

    // Attack - Decay envelope (fast attack, natural metallic bell decay)
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(gainLevel, startTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
  }

  for (let r = 0; r < repeats; r += 1) {
    const cycleStart = now + r * 0.75;

    // Harmonic 1 (G#5 - 830.6 Hz)
    scheduleBellNote(830.61, cycleStart, 0.45, 0.28);
    // Harmonic 1 overtone (2491.8 Hz)
    scheduleBellNote(2491.8, cycleStart, 0.25, 0.08);

    // Harmonic 2 (C#6 - 1108.7 Hz) - 160ms later
    scheduleBellNote(1108.73, cycleStart + 0.16, 0.65, 0.32);
    // Harmonic 2 overtone (3326.2 Hz)
    scheduleBellNote(3326.2, cycleStart + 0.16, 0.3, 0.09);
  }
}
