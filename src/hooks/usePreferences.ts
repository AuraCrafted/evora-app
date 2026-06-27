import { useEffect, useState } from "react";
import type { Goal, TaskType } from "@/data/suggestions";

const KEY = "evora.preferences.v1";

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

function save(p: Preferences) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
    window.dispatchEvent(new CustomEvent("evora:prefs-changed"));
  } catch {
    /* noop */
  }
}

export function usePreferences() {
  const [prefs, setPrefs] = useState<Preferences>(() => load());

  useEffect(() => {
    const sync = () => setPrefs(load());
    window.addEventListener("evora:prefs-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("evora:prefs-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const update = (patch: Partial<Preferences>) =>
    setPrefs((p) => {
      const next = { ...p, ...patch };
      save(next);
      return next;
    });
  const complete = (patch: Partial<Preferences> = {}) =>
    setPrefs((p) => {
      const next = { ...p, ...patch, completedAt: Date.now() };
      save(next);
      return next;
    });
  const reset = () => {
    save(EMPTY);
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
