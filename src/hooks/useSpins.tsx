import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Suggestion } from "@/data/suggestions";
import { useSubscription } from "@/hooks/useSubscription";

const STORAGE_KEY = "nudge.spins.v3";
const FREE_ROLLS_PER_DAY = 5;
// Legacy keys, cleared so they can't be used to escalate tier from devtools.
const LEGACY_PRO_KEY = "nudge.pro.v1";
const LEGACY_TIER_KEY = "nudge.pro.tier.v1";
const LEGACY_RESET_KEY = "nudge.pro.reset.v2";

export type PlanTier = "free" | "month" | "year";

if (typeof window !== "undefined") {
  localStorage.removeItem(LEGACY_PRO_KEY);
  localStorage.removeItem(LEGACY_TIER_KEY);
  localStorage.removeItem(LEGACY_RESET_KEY);
}

export interface HistoryEntry {
  id: string;
  suggestionId: string;
  emoji: string;
  title: string;
  category: string;
  ts: number;
  accepted: boolean | null;
}

interface SpinState {
  dayStart: number;
  used: number;
  bonus: number;
  history: HistoryEntry[];
  hiddenBeforeTs?: number;
  recentIds?: string[];
}

const RECENT_MAX = 15;

function startOfDay(ts: number = Date.now()): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function load(): SpinState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      console.info("[SPINS HYDRATE] no saved state, starting fresh");
      throw new Error("empty");
    }
    const parsed = JSON.parse(raw) as SpinState;
    const today = startOfDay();
    console.info("[SPINS HYDRATE] loaded", {
      historyCount: parsed.history?.length ?? 0,
      used: parsed.used,
      bonus: parsed.bonus,
      sameDay: parsed.dayStart === today,
    });
    if (parsed.dayStart !== today) {
      // New day: reset daily counters but PRESERVE history, hiddenBeforeTs, recentIds
      return {
        dayStart: today,
        used: 0,
        bonus: 0,
        history: parsed.history ?? [],
        hiddenBeforeTs: parsed.hiddenBeforeTs,
        recentIds: parsed.recentIds ?? [],
      };
    }
    return { bonus: 0, ...parsed };
  } catch {
    return { dayStart: startOfDay(), used: 0, bonus: 0, history: [] };
  }
}

function calcStreak(history: HistoryEntry[]): number {
  const acceptedDays = new Set(
    history.filter((h) => h.accepted).map((h) => startOfDay(h.ts)),
  );
  if (acceptedDays.size === 0) return 0;
  const today = startOfDay();
  const dayMs = 24 * 60 * 60 * 1000;
  let streak = 0;
  let cursor = acceptedDays.has(today) ? today : today - dayMs;
  if (!acceptedDays.has(cursor)) return 0;
  while (acceptedDays.has(cursor)) {
    streak++;
    cursor -= dayMs;
  }
  return streak;
}

export interface SpinsContextValue {
  used: number;
  total: number;
  remaining: number;
  bonus: number;
  canSpin: boolean;
  isPro: boolean;
  history: HistoryEntry[];
  allHistory: HistoryEntry[];
  recentIds: string[];
  streak: number;
  completed: number;
  nextResetMs: number;
  hasNudgedToday: boolean;
  tier: PlanTier;
  setTier: (t: PlanTier) => void;
  recordSpin: (s: Suggestion) => string;
  recordDecision: (entryId: string, accepted: boolean) => void;
  grantBonusSpin: () => void;
  upgrade: (next?: PlanTier) => void;
  downgrade: () => void;
  clearHistory: () => void;
}

const SpinsContext = createContext<SpinsContextValue | null>(null);

export function SpinsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SpinState>(() => load());
  const sub = useSubscription();
  const tier: PlanTier = sub.isPro ? sub.tier : "free";
  const isPro = tier !== "free";
  const hydratedRef = useRef(false);

  // Persist on every change. Skip the very first synchronous mount to avoid
  // pointlessly rewriting localStorage with what we just loaded.
  useEffect(() => {
    if (!hydratedRef.current) {
      hydratedRef.current = true;
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      console.info("[SPINS SAVE]", {
        historyCount: state.history.length,
        used: state.used,
        bonus: state.bonus,
      });
    } catch (err) {
      console.error("[SPINS SAVE] failed", err);
    }
  }, [state]);

  // If another tab/window writes (rare on mobile but cheap to support).
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || !e.newValue) return;
      try {
        const next = JSON.parse(e.newValue) as SpinState;
        setState(next);
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const baseRemaining = Math.max(0, FREE_ROLLS_PER_DAY - state.used);
  const remaining = isPro ? Infinity : baseRemaining + state.bonus;
  const canSpin = isPro || remaining > 0;

  const recordSpin = useCallback((suggestion: Suggestion) => {
    const entry: HistoryEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      suggestionId: suggestion.id,
      emoji: suggestion.emoji,
      title: suggestion.title,
      category: suggestion.category,
      ts: Date.now(),
      accepted: null,
    };
    setState((s) => {
      const prevRecent = s.recentIds ?? [];
      const recentIds = [suggestion.id, ...prevRecent.filter((id) => id !== suggestion.id)].slice(
        0,
        RECENT_MAX,
      );
      const baseHistory = [entry, ...s.history].slice(0, 200);
      if (s.bonus > 0) {
        return { ...s, bonus: s.bonus - 1, history: baseHistory, recentIds };
      }
      return { ...s, used: s.used + 1, history: baseHistory, recentIds };
    });
    return entry.id;
  }, []);

  const grantBonusSpin = useCallback(() => {
    setState((s) => ({ ...s, bonus: s.bonus + 1 }));
  }, []);

  const recordDecision = useCallback((entryId: string, accepted: boolean) => {
    setState((s) => ({
      ...s,
      history: s.history.map((h) => (h.id === entryId ? { ...h, accepted } : h)),
    }));
  }, []);

  const setTier = useCallback((_next: PlanTier) => {
    // tier is server-authoritative
  }, []);

  const upgrade = useCallback(
    (next: PlanTier = "month") => {
      setTier(next === "free" ? "month" : next);
    },
    [setTier],
  );

  const downgrade = useCallback(() => {
    setTier("free");
  }, [setTier]);

  const clearHistory = useCallback(() => {
    setState((s) => ({ ...s, hiddenBeforeTs: Date.now() }));
  }, []);

  const streak = useMemo(() => calcStreak(state.history), [state.history]);
  const completed = useMemo(
    () => state.history.filter((h) => h.accepted).length,
    [state.history],
  );
  const nextResetMs = state.dayStart + 24 * 60 * 60 * 1000 - Date.now();
  const hasNudgedToday = useMemo(() => {
    const today = startOfDay();
    return state.history.some((h) => h.accepted && startOfDay(h.ts) === today);
  }, [state.history]);
  const visibleHistory = useMemo(
    () =>
      state.hiddenBeforeTs
        ? state.history.filter((h) => h.ts > (state.hiddenBeforeTs ?? 0))
        : state.history,
    [state.history, state.hiddenBeforeTs],
  );

  const value: SpinsContextValue = {
    used: state.used,
    total: FREE_ROLLS_PER_DAY,
    remaining,
    bonus: state.bonus,
    canSpin,
    isPro,
    history: visibleHistory,
    allHistory: state.history,
    recentIds: state.recentIds ?? [],
    streak,
    completed,
    nextResetMs,
    hasNudgedToday,
    tier,
    setTier,
    recordSpin,
    recordDecision,
    grantBonusSpin,
    upgrade,
    downgrade,
    clearHistory,
  };

  return <SpinsContext.Provider value={value}>{children}</SpinsContext.Provider>;
}

export function useSpins(): SpinsContextValue {
  const ctx = useContext(SpinsContext);
  if (!ctx) {
    throw new Error("useSpins must be used within a SpinsProvider");
  }
  return ctx;
}
