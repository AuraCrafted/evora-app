// Sound + haptics facade. Real synthesis lives in `@/lib/sounds`.
// This module keeps the legacy `sfx.*` API working while routing every
// event through the centralized sound manager.

import {
  playSound,
  isSoundEnabled,
  setSoundEnabled,
  primeAudio,
} from "@/lib/sounds";
import { haptic as nativeHaptic } from "@/lib/native";

function vibrate(pattern: number | number[]) {
  if (typeof window !== "undefined" && (window as any).Capacitor?.isNativePlatform?.()) {
    const len = Array.isArray(pattern) ? pattern.reduce((a, b) => a + b, 0) : pattern;
    if (len >= 80) nativeHaptic("heavy");
    else if (len >= 30) nativeHaptic("medium");
    else nativeHaptic("light");
    return;
  }
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      /* ignore */
    }
  }
}

// === Legacy mute helpers (still used by BottomNav toggle) ===
export function setMuted(value: boolean) {
  setSoundEnabled(!value);
}
export function isMuted() {
  return !isSoundEnabled();
}

// === Legacy `sfx` API ===
// Maps to the new centralized sound events. Keeps existing call sites working
// while components migrate to the richer `sfx.tab`, `sfx.coachMessage`, etc.
export const sfx = {
  tap() {
    playSound("tap");
    vibrate(6);
  },
  tab() {
    playSound("tab");
    vibrate(6);
  },
  rollStart() {
    primeAudio();
    playSound("roll");
    vibrate([15, 25, 15, 25, 15, 40]);
  },
  rollLand() {
    playSound("rollLand");
    vibrate([20, 20, 40]);
  },
  accept() {
    playSound("accept");
    vibrate([12, 18, 24]);
  },
  reject() {
    playSound("skip");
    vibrate(14);
  },
  skip() {
    playSound("skip");
    vibrate(14);
  },
  celebrate() {
    playSound("complete");
    vibrate([15, 20, 15, 30]);
  },
  streak() {
    playSound("streak");
    vibrate([15, 20, 15, 20, 40]);
  },
  coachMessage() {
    playSound("coachMessage");
  },
  purchase() {
    playSound("purchase");
    vibrate([20, 30, 60]);
  },
  error() {
    playSound("error");
    vibrate([30, 40]);
  },
  onboarding() {
    playSound("onboarding");
    vibrate([15, 25, 15, 40]);
  },
  timerDone() {
    playSound("timerDone");
    vibrate([100, 60, 100, 60, 160]);
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
    vibrate([100, 60, 100, 60, 160]);
    return;
  }
  sfx.timerDone();
}
