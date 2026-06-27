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

export function usePreferences() {
  const [prefs, setPrefs] = useState<Preferences>(() => load());

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(prefs));
    } catch {
      /* noop */
    }
  }, [prefs]);

  const update = (patch: Partial<Preferences>) => setPrefs((p) => ({ ...p, ...patch }));
  const complete = (patch: Partial<Preferences> = {}) =>
    setPrefs((p) => ({ ...p, ...patch, completedAt: Date.now() }));
  const reset = () => setPrefs(EMPTY);

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
