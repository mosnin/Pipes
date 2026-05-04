// Pure WebAudio synth. No asset files. Three subtle effects: build complete,
// message tick, error.
//
// All effects are intentionally quiet. Peak gain caps at 0.08. The point is
// confirmation, not entertainment. See docs/agent-product.md.

type SupportedAudioContext = typeof AudioContext;

interface WebkitAudioWindow {
  AudioContext?: SupportedAudioContext;
  webkitAudioContext?: SupportedAudioContext;
}

let cachedCtx: AudioContext | null = null;

function getAudioContextCtor(): SupportedAudioContext | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as WebkitAudioWindow;
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

function context(): AudioContext | null {
  if (cachedCtx) return cachedCtx;
  const Ctor = getAudioContextCtor();
  if (!Ctor) return null;
  cachedCtx = new Ctor();
  return cachedCtx;
}

interface ToneSpec {
  frequency: number;
  startAt: number; // seconds offset from now
  duration: number; // seconds
  attack: number; // seconds
  decay: number; // seconds
  peak: number; // 0..1, capped at 0.08
}

function playTone(ctx: AudioContext, spec: ToneSpec): void {
  const peak = Math.min(spec.peak, 0.08);
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = spec.frequency;
  const t0 = ctx.currentTime + spec.startAt;
  const tAttackEnd = t0 + spec.attack;
  const tDecayStart = t0 + Math.max(spec.duration - spec.decay, spec.attack);
  const tEnd = t0 + spec.duration;
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(peak, tAttackEnd);
  gain.gain.setValueAtTime(peak, tDecayStart);
  gain.gain.linearRampToValueAtTime(0, tEnd);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t0);
  osc.stop(tEnd + 0.02);
}

// A tiny three-note ascending chime: C5, E5, G5, each 80 ms,
// 60 ms attack + 40 ms decay (clipped against duration), peak 0.06.
// Total duration ~ 240 ms.
export function playBuildComplete(): void {
  const ctx = context();
  if (!ctx) return;
  const notes = [523.25, 659.25, 783.99];
  notes.forEach((freq, i) => {
    playTone(ctx, {
      frequency: freq,
      startAt: i * 0.08,
      duration: 0.08,
      attack: 0.02,
      decay: 0.04,
      peak: 0.06,
    });
  });
}

// A single soft "tick" — 1.5 kHz sine for 30 ms, 5 ms attack + 25 ms decay,
// peak 0.04.
export function playMessage(): void {
  const ctx = context();
  if (!ctx) return;
  playTone(ctx, {
    frequency: 1500,
    startAt: 0,
    duration: 0.03,
    attack: 0.005,
    decay: 0.025,
    peak: 0.04,
  });
}

// Two descending notes — F4, C4, each 100 ms, peak 0.05.
export function playError(): void {
  const ctx = context();
  if (!ctx) return;
  const notes = [349.23, 261.63];
  notes.forEach((freq, i) => {
    playTone(ctx, {
      frequency: freq,
      startAt: i * 0.1,
      duration: 0.1,
      attack: 0.01,
      decay: 0.05,
      peak: 0.05,
    });
  });
}

// Test seam — clear the cached context so unit tests can re-initialize.
export function __resetSoundContextForTests(): void {
  if (cachedCtx) {
    try {
      void cachedCtx.close();
    } catch {
      /* noop */
    }
  }
  cachedCtx = null;
}
