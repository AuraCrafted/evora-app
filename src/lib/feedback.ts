// Sound + haptics utility — Web Audio API generated tones (no asset files needed)

let ctx: AudioContext | null = null;
let muted = false;

const MUTE_KEY = "nudge.muted.v1";

if (typeof window !== "undefined") {
  muted = localStorage.getItem(MUTE_KEY) === "true";
}

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (muted) return null;
  if (!ctx) {
    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      ctx = new AC();
    } catch {
      return null;
    }
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

export function setMuted(value: boolean) {
  muted = value;
  if (typeof window !== "undefined") {
    localStorage.setItem(MUTE_KEY, String(value));
  }
}

export function isMuted() {
  return muted;
}

interface ToneOptions {
  freq: number;
  duration: number;
  type?: OscillatorType;
  volume?: number;
  attack?: number;
  release?: number;
  delay?: number;
  freqEnd?: number;
}

function tone({
  freq,
  duration,
  type = "sine",
  volume = 0.18,
  attack = 0.005,
  release = 0.08,
  delay = 0,
  freqEnd,
}: ToneOptions) {
  const ac = getCtx();
  if (!ac) return;
  const start = ac.currentTime + delay;
  const end = start + duration;
  const safeAttack = Math.min(attack, duration * 0.3);
  const safeRelease = Math.min(release, duration * 0.5);
  const sustainStart = Math.max(start + safeAttack, end - safeRelease);

  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (freqEnd !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), end);
  }
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(volume, start + safeAttack);
  gain.gain.setValueAtTime(volume, sustainStart);
  gain.gain.exponentialRampToValueAtTime(0.0001, end);

  osc.connect(gain).connect(ac.destination);
  osc.start(start);
  osc.stop(end + 0.02);
}

function vibrate(pattern: number | number[]) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // ignore
    }
  }
}

// === Public sound effects ===

export const sfx = {
  // Clickable tap — short tick
  tap() {
    tone({ freq: 520, duration: 0.06, type: "triangle", volume: 0.1 });
    vibrate(8);
  },

  // Dice rolling — tumbling rattle of short blips
  rollStart() {
    const beats = 8;
    for (let i = 0; i < beats; i++) {
      const f = 180 + Math.random() * 320;
      tone({
        freq: f,
        duration: 0.05,
        type: "square",
        volume: 0.08,
        delay: i * 0.11,
      });
    }
    vibrate([20, 40, 20, 40, 20, 40, 20, 60]);
  },

  // Dice landed — soft confirming thud + bell
  rollLand() {
    tone({ freq: 220, duration: 0.18, type: "sine", volume: 0.18, freqEnd: 140 });
    tone({ freq: 660, duration: 0.25, type: "sine", volume: 0.1, delay: 0.05 });
    tone({ freq: 990, duration: 0.3, type: "sine", volume: 0.07, delay: 0.08 });
    vibrate([30, 30, 60]);
  },

  // Accept — bright rising chime
  accept() {
    tone({ freq: 523.25, duration: 0.12, type: "sine", volume: 0.16 });
    tone({ freq: 659.25, duration: 0.14, type: "sine", volume: 0.16, delay: 0.08 });
    tone({ freq: 783.99, duration: 0.22, type: "sine", volume: 0.18, delay: 0.16 });
    vibrate([15, 25, 35]);
  },

  // Reject — soft falling note
  reject() {
    tone({ freq: 440, duration: 0.1, type: "sine", volume: 0.1, freqEnd: 330 });
    vibrate(20);
  },

  // Upgrade success — celebratory arpeggio
  celebrate() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      tone({ freq: f, duration: 0.18, type: "triangle", volume: 0.15, delay: i * 0.08 });
    });
    vibrate([20, 30, 20, 30, 20, 60]);
  },

  // Timer complete — repeating alarm chime
  timerDone() {
    for (let i = 0; i < 3; i++) {
      const base = i * 0.45;
      tone({ freq: 880, duration: 0.18, type: "sine", volume: 0.22, delay: base });
      tone({ freq: 1318.51, duration: 0.22, type: "sine", volume: 0.2, delay: base + 0.18 });
    }
    vibrate([120, 80, 120, 80, 200]);
  },
};

// === Timer-complete sound preference ===
const TIMER_SOUND_KEY = "nudge.timerSound.v1";
let timerSoundEnabled = true;
if (typeof window !== "undefined") {
  const stored = localStorage.getItem(TIMER_SOUND_KEY);
  if (stored !== null) timerSoundEnabled = stored !== "false";
}

export function isTimerSoundEnabled() {
  return timerSoundEnabled;
}

export function setTimerSoundEnabled(value: boolean) {
  timerSoundEnabled = value;
  if (typeof window !== "undefined") {
    localStorage.setItem(TIMER_SOUND_KEY, String(value));
  }
}

export function playTimerComplete() {
  if (!timerSoundEnabled) {
    vibrate([120, 80, 120, 80, 200]);
    return;
  }
  sfx.timerDone();
}
