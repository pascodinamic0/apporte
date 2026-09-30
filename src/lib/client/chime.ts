"use client";
/** Two-tone kitchen chime synthesised with WebAudio (no audio file to load). */
let ctx: AudioContext | null = null;

export function audioState(): "unsupported" | "locked" | "ready" {
  if (typeof window === "undefined") return "unsupported";
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return "unsupported";
  if (!ctx || ctx.state !== "running") return "locked";
  return "ready";
}

/** Must be called from a user gesture (tap / click) the first time. */
export async function unlockAudio(): Promise<boolean> {
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return false;
  if (!ctx) ctx = new AC();
  try {
    if (ctx.state !== "running") await ctx.resume();
  } catch {}
  return ctx.state === "running";
}

function tone(freq: number, start: number, dur: number, gain = 0.25) {
  if (!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = "sine";
  o.frequency.setValueAtTime(freq, start);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(gain, start + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g).connect(ctx.destination);
  o.start(start);
  o.stop(start + dur + 0.05);
}

/** Plays the chime; returns false when audio is still locked by the browser. */
export function playChime(): boolean {
  if (!ctx || ctx.state !== "running") return false;
  const t = ctx.currentTime + 0.02;
  tone(988, t, 0.5); // B5
  tone(1319, t + 0.18, 0.7); // E6
  tone(988, t + 0.9, 0.5);
  tone(1319, t + 1.08, 0.8);
  const w = window as unknown as { __apporteChimes?: number };
  w.__apporteChimes = (w.__apporteChimes || 0) + 1;
  return true;
}
