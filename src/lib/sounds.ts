/**
 * Evora sound manager — ASMR-inspired, premium, calming.
 *
 * All sounds are synthesized with the Web Audio API so we ship nothing
 * extra in the bundle, stay 100% royalty-free, and keep each effect short
 * and tactile. Map app events to keys here and call `playSound("key")`
 * from anywhere; never play tones directly in components.
 */

export type SoundEvent =
  | "roll"          // dice tumble
  | "rollLand"      // dice settle
  | "accept"        // task accepted
  | "skip"          // task skipped / declined
  | "complete"      // task completed
  | "streak"        // streak increased
  | "tab"           // bottom-nav / link tap
  | "tap"           // generic ui tick (very soft)
  | "coachMessage"  // AI coach reply received
  | "purchase"      // subscription purchase success
  | "error"         // failed action
  | "onboarding"    // onboarding complete welcome
  | "timerDone";    // task timer reached zero

interface Settings {
  enabled: boolean;
  haptics: boolean;
  volume: number; // 0..1
}

const KEYS = {
  enabled: "evora.sound.enabled.v1",
  haptics: "evora.haptics.enabled.v1",
  volume: "evora.sound.volume.v1",
  legacyMute: "nudge.muted.v1",
} as const;

function readBool(key: string, fallback: boolean): boolean {
  if (typeof window === "undefined") return fallback;
  const v = localStorage.getItem(key);
  if (v === null) return fallback;
  return v !== "false";
}

function loadSettings(): Settings {
  // Migrate legacy mute key once.
  let enabled = readBool(KEYS.enabled, true);
  if (typeof window !== "undefined" && localStorage.getItem(KEYS.enabled) === null) {
    const legacy = localStorage.getItem(KEYS.legacyMute);
    if (legacy !== null) enabled = legacy !== "true";
  }
  const haptics = readBool(KEYS.haptics, true);
  const rawVol = typeof window !== "undefined" ? localStorage.getItem(KEYS.volume) : null;
  const volume = rawVol === null ? 0.7 : Math.max(0, Math.min(1, parseFloat(rawVol)));
  return { enabled, haptics, volume };
}

let settings: Settings = loadSettings();

type Listener = (s: Settings) => void;
const listeners = new Set<Listener>();
function emit() {
  listeners.forEach((l) => l(settings));
}

export function subscribeSoundSettings(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getSoundSettings(): Settings {
  return { ...settings };
}

export function setSoundEnabled(v: boolean) {
  settings = { ...settings, enabled: v };
  if (typeof window !== "undefined") {
    localStorage.setItem(KEYS.enabled, String(v));
    localStorage.setItem(KEYS.legacyMute, String(!v));
  }
  emit();
}

export function setHapticsEnabled(v: boolean) {
  settings = { ...settings, haptics: v };
  if (typeof window !== "undefined") localStorage.setItem(KEYS.haptics, String(v));
  emit();
}

export function setVolume(v: number) {
  const clamped = Math.max(0, Math.min(1, v));
  settings = { ...settings, volume: clamped };
  if (typeof window !== "undefined") localStorage.setItem(KEYS.volume, String(clamped));
  emit();
}

export const isSoundEnabled = () => settings.enabled;
export const isHapticsEnabled = () => settings.haptics;
export const getVolume = () => settings.volume;

// ---------- Audio engine ----------

let ctx: AudioContext | null = null;
let master: GainNode | null = null;

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!settings.enabled) return null;
  if (!ctx) {
    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = settings.volume;
      master.connect(ctx.destination);
    } catch {
      return null;
    }
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  if (master) master.gain.value = settings.volume;
  return ctx;
}

interface ToneOpts {
  freq: number;
  duration: number;
  type?: OscillatorType;
  volume?: number;
  attack?: number;
  release?: number;
  delay?: number;
  freqEnd?: number;
  filterFreq?: number; // optional lowpass to soften
}

function tone(o: ToneOpts) {
  const c = ac();
  if (!c || !master) return;
  const start = c.currentTime + (o.delay ?? 0);
  const end = start + o.duration;
  const vol = o.volume ?? 0.14;
  const attack = Math.min(o.attack ?? 0.012, o.duration * 0.4);
  const release = Math.min(o.release ?? 0.18, o.duration * 0.7);
  const sustainStart = Math.max(start + attack, end - release);

  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = o.type ?? "sine";
  osc.frequency.setValueAtTime(o.freq, start);
  if (o.freqEnd !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.freqEnd), end);
  }
  gain.gain.setValueAtTime(0.00001, start);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, vol), start + attack);
  gain.gain.setValueAtTime(vol, sustainStart);
  gain.gain.exponentialRampToValueAtTime(0.00005, end);

  let tail: AudioNode = gain;
  if (o.filterFreq) {
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = o.filterFreq;
    gain.connect(lp);
    tail = lp;
  }
  osc.connect(gain);
  tail.connect(master);
  osc.start(start);
  osc.stop(end + 0.05);
}

/** Soft noise burst, e.g. for a wooden clack. */
function noise(opts: { duration: number; volume?: number; delay?: number; filterFreq?: number }) {
  const c = ac();
  if (!c || !master) return;
  const start = c.currentTime + (opts.delay ?? 0);
  const dur = opts.duration;
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buffer = c.createBuffer(1, len, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) {
    // exponential decay
    const t = i / len;
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 3);
  }
  const src = c.createBufferSource();
  src.buffer = buffer;
  const gain = c.createGain();
  gain.gain.value = opts.volume ?? 0.12;
  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = opts.filterFreq ?? 1200;
  src.connect(lp).connect(gain).connect(master);
  src.start(start);
  src.stop(start + dur + 0.05);
}

// ---------- Throttle ----------
const lastPlayed = new Map<SoundEvent, number>();
const THROTTLE_MS: Partial<Record<SoundEvent, number>> = {
  tap: 60,
  tab: 80,
  skip: 120,
  coachMessage: 200,
};

// ---------- Voicings (ASMR-style, short, soft) ----------
function voice(event: SoundEvent) {
  switch (event) {
    case "tap":
      // very soft tick
      tone({ freq: 880, duration: 0.05, type: "sine", volume: 0.06, attack: 0.004, release: 0.04, filterFreq: 2200 });
      return;

    case "tab":
      // subtle UI tick, a hair warmer than tap
      tone({ freq: 660, duration: 0.06, type: "sine", volume: 0.07, attack: 0.004, release: 0.05, filterFreq: 2000 });
      tone({ freq: 1320, duration: 0.05, type: "sine", volume: 0.03, delay: 0.005, release: 0.04 });
      return;

    case "roll":
      // wooden tumble: a few muted noise clacks of varying pitch
      for (let i = 0; i < 5; i++) {
        const delay = i * 0.085;
        noise({ duration: 0.07, volume: 0.07 + Math.random() * 0.04, delay, filterFreq: 700 + Math.random() * 600 });
        tone({
          freq: 180 + Math.random() * 80,
          duration: 0.08,
          type: "sine",
          volume: 0.05,
          delay,
          freqEnd: 120,
          filterFreq: 1500,
        });
      }
      return;

    case "rollLand":
      // soft settle: low thump + tiny shimmer
      noise({ duration: 0.12, volume: 0.09, filterFreq: 500 });
      tone({ freq: 160, duration: 0.22, type: "sine", volume: 0.13, freqEnd: 110, release: 0.18 });
      tone({ freq: 880, duration: 0.18, type: "sine", volume: 0.04, delay: 0.06, release: 0.16 });
      return;

    case "accept":
      // warm two-note confirmation, perfect fifth
      tone({ freq: 523.25, duration: 0.16, type: "sine", volume: 0.11, release: 0.12, filterFreq: 3000 });
      tone({ freq: 783.99, duration: 0.22, type: "sine", volume: 0.10, delay: 0.07, release: 0.18, filterFreq: 3000 });
      return;

    case "skip":
      // muted low tap
      tone({ freq: 340, duration: 0.09, type: "sine", volume: 0.07, freqEnd: 260, release: 0.07, filterFreq: 1500 });
      return;

    case "complete":
      // gentle sparkle, ascending triad with a tiny shimmer
      [659.25, 880, 1174.66].forEach((f, i) => {
        tone({
          freq: f,
          duration: 0.26,
          type: "sine",
          volume: 0.09,
          delay: i * 0.07,
          release: 0.22,
          filterFreq: 4000,
        });
      });
      tone({ freq: 2349.32, duration: 0.18, type: "sine", volume: 0.035, delay: 0.18, release: 0.16 });
      return;

    case "streak":
      // warmer, slightly more rewarding, four-note rise
      [523.25, 659.25, 783.99, 987.77].forEach((f, i) => {
        tone({
          freq: f,
          duration: 0.22,
          type: "sine",
          volume: 0.1,
          delay: i * 0.085,
          release: 0.18,
          filterFreq: 3500,
        });
      });
      tone({ freq: 1567.98, duration: 0.22, type: "sine", volume: 0.04, delay: 0.3, release: 0.2 });
      return;

    case "coachMessage":
      // soft bubble pop: short rising blip + tiny tail
      tone({
        freq: 420,
        duration: 0.11,
        type: "sine",
        volume: 0.09,
        freqEnd: 720,
        attack: 0.005,
        release: 0.09,
        filterFreq: 2400,
      });
      tone({ freq: 1100, duration: 0.08, type: "sine", volume: 0.03, delay: 0.05, release: 0.07 });
      return;

    case "purchase":
      // premium confirmation: warm low + soft bell
      tone({ freq: 261.63, duration: 0.4, type: "sine", volume: 0.09, release: 0.3, filterFreq: 2500 });
      tone({ freq: 523.25, duration: 0.4, type: "sine", volume: 0.08, delay: 0.06, release: 0.32 });
      tone({ freq: 1046.5, duration: 0.45, type: "sine", volume: 0.05, delay: 0.14, release: 0.38 });
      tone({ freq: 1567.98, duration: 0.5, type: "sine", volume: 0.03, delay: 0.22, release: 0.42 });
      return;

    case "error":
      // gentle low thud, not alarming
      tone({ freq: 220, duration: 0.18, type: "sine", volume: 0.1, freqEnd: 150, release: 0.14, filterFreq: 900 });
      noise({ duration: 0.1, volume: 0.04, filterFreq: 350 });
      return;

    case "onboarding":
      // calm welcome: airy major 7 spread
      [392, 523.25, 659.25, 987.77].forEach((f, i) => {
        tone({
          freq: f,
          duration: 0.55,
          type: "sine",
          volume: 0.08,
          delay: i * 0.12,
          attack: 0.04,
          release: 0.4,
          filterFreq: 3500,
        });
      });
      return;

    case "timerDone":
      // soft 3-note bell, never harsh
      for (let i = 0; i < 3; i++) {
        tone({ freq: 880, duration: 0.28, type: "sine", volume: 0.11, delay: i * 0.42, release: 0.22 });
        tone({ freq: 1318.51, duration: 0.32, type: "sine", volume: 0.08, delay: i * 0.42 + 0.08, release: 0.26 });
      }
      return;
  }
}

export function playSound(event: SoundEvent) {
  if (!settings.enabled) return;
  const now = (typeof performance !== "undefined" ? performance.now() : Date.now());
  const min = THROTTLE_MS[event];
  if (min !== undefined) {
    const last = lastPlayed.get(event) ?? 0;
    if (now - last < min) return;
  }
  lastPlayed.set(event, now);
  try {
    voice(event);
  } catch {
    // ignore audio failures
  }
}

/** Preload / warm up the audio context after a user gesture. */
export function primeAudio() {
  ac();
}
