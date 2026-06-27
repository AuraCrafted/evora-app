import { useEffect, useState } from "react";
import type { Goal, TaskType } from "@/data/suggestions";

const KEY = "evora.preferences.v1";
const PREFS_EVENT = "evora:prefs-changed";

export type Interest =
  | "fitness"
  | "mindfulness"
  | "creativity"
  | "learning"
  | "productivity"
  | "connection"
  | "outdoors"
  | "home";

export type Struggle = "focus" | "motivation" | "stress" | "energy" | "loneliness" | "routine";

export type Avoid = "loud" | "social" | "screens" | "outdoor" | "chores" | "intense";

export interface Preferences {
  interests: Interest[];
  goals: Goal[];
  preferredTypes: TaskType[];
  struggles: Struggle[];
  avoid: Avoid[];
  completedAt?: number;
}

const EMPTY: Preferences = {
  interests: [],
  goals: [],
  preferredTypes: [],
  struggles: [],
  avoid: [],
};

function load(): Preferences {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<Preferences>;
    return { ...EMPTY, ...parsed };
  } catch {
    return EMPTY;
  }
}

function save(p: Preferences, reason: "update" | "complete" | "reset" = "update") {
  try {
    if (reason === "complete") {
      console.log("[ONBOARDING DEBUG] Saving preferences", p);
    }
    localStorage.setItem(KEY, JSON.stringify(p));
    if (reason === "complete") {
      const saved = load();
      console.log("[ONBOARDING DEBUG] Preferences saved", saved);
      console.log("[ONBOARDING DEBUG] completedAt value", saved.completedAt);
      console.log("[ONBOARDING DEBUG] Dispatch onboarding complete event");
    }
    window.dispatchEvent(new CustomEvent(PREFS_EVENT, { detail: { reason, prefs: p } }));
    return p;
  } catch (error) {
    if (reason === "complete") {
      console.error("[ONBOARDING DEBUG] Preferences save failed", error);
    }
    return p;
  }
}

export function usePreferences() {
  const [prefs, setPrefs] = useState<Preferences>(() => load());

  useEffect(() => {
    const sync = () => setPrefs(load());
    window.addEventListener(PREFS_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(PREFS_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const update = (patch: Partial<Preferences>) => {
    const next = { ...load(), ...patch };
    save(next);
    setPrefs(next);
    return next;
  };

  const complete = (patch: Partial<Preferences> = {}) => {
    const next = { ...load(), ...patch, completedAt: Date.now() };
    save(next, "complete");
    setPrefs(next);
    return next;
  };

  const reset = () => {
    save(EMPTY, "reset");
    setPrefs(EMPTY);
  };

  return {
    prefs,
    update,
    complete,
    reset,
    isComplete: !!prefs.completedAt,
  };
}

/** Read prefs synchronously outside React (for non-component code). */
export function readPreferences(): Preferences {
  return load();
}
