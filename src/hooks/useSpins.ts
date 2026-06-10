import { useEffect, useState, useCallback, useMemo } from "react";
import type { Suggestion } from "@/data/suggestions";

const STORAGE_KEY = "nudge.spins.v3";
const FREE_ROLLS_PER_DAY = 4;
const PRO_KEY = "nudge.pro.v1";
const TIER_KEY = "nudge.pro.tier.v1";
const FREE_RESET_KEY = "nudge.pro.reset.v2";

export type PlanTier = "free" | "month" | "year";

// One-time reset to free plan for QA. Once cleared here, the flag below
// keeps the user free until they explicitly upgrade again.
if (typeof window !== "undefined" && localStorage.getItem(FREE_RESET_KEY) !== "done") {
  localStorage.removeItem(PRO_KEY);
  localStorage.removeItem(TIER_KEY);
  localStorage.setItem(FREE_RESET_KEY, "done");
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
}

function startOfDay(ts: number = Date.now()): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function load(): SpinState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) throw new Error("empty");
    const parsed = JSON.parse(raw) as SpinState;
    const today = startOfDay();
    if (parsed.dayStart !== today) {
      return { dayStart: today, used: 0, bonus: 0, history: parsed.history ?? [] };
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

export function useSpins() {
  const [state, setState] = useState<SpinState>(() => load());
  const [tier, setTierState] = useState<PlanTier>(() => {
    if (typeof window === "undefined") return "free";
    const stored = localStorage.getItem(TIER_KEY) as PlanTier | null;
    if (stored === "month" || stored === "year") return stored;
    // Back-compat with old pro flag
    return localStorage.getItem(PRO_KEY) === "true" ? "month" : "free";
  });
  const isPro = tier !== "free";

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

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
      // Consume bonus spins before the daily quota.
      if (s.bonus > 0) {
        return { ...s, bonus: s.bonus - 1, history: [entry, ...s.history].slice(0, 200) };
      }
      return { ...s, used: s.used + 1, history: [entry, ...s.history].slice(0, 200) };
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

  const upgrade = useCallback(() => {
    localStorage.setItem(PRO_KEY, "true");
    setIsPro(true);
  }, []);

  const downgrade = useCallback(() => {
    localStorage.removeItem(PRO_KEY);
    setIsPro(false);
  }, []);

  const clearHistory = useCallback(() => {
    setState((s) => ({ ...s, history: [] }));
  }, []);

  const streak = useMemo(() => calcStreak(state.history), [state.history]);
  const completed = useMemo(() => state.history.filter((h) => h.accepted).length, [state.history]);
  const nextResetMs = state.dayStart + 24 * 60 * 60 * 1000 - Date.now();
  const hasNudgedToday = useMemo(() => {
    const today = startOfDay();
    return state.history.some((h) => h.accepted && startOfDay(h.ts) === today);
  }, [state.history]);

  return {
    used: state.used,
    total: FREE_ROLLS_PER_DAY,
    remaining,
    bonus: state.bonus,
    canSpin,
    isPro,
    history: state.history,
    streak,
    completed,
    nextResetMs,
    hasNudgedToday,
    recordSpin,
    recordDecision,
    grantBonusSpin,
    upgrade,
    downgrade,
    clearHistory,
  };
}
