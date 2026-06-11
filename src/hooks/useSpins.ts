import { useEffect, useState, useCallback, useMemo } from "react";
import type { Suggestion } from "@/data/suggestions";
import { useSubscription } from "@/hooks/useSubscription";

const STORAGE_KEY = "nudge.spins.v3";
const FREE_ROLLS_PER_DAY = 5;
// Legacy keys — cleared so they can't be used to escalate tier from devtools.
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
  const sub = useSubscription();
  // Tier is now strictly derived from the server-backed subscription.
  // Unauthenticated or unsubscribed users are always "free" — there's no
  // localStorage override path that could grant pro features.
  const tier: PlanTier = sub.isPro ? sub.tier : "free";
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

  // Tier mutations are no-ops on the client. Real tier changes happen via
  // Stripe checkout/cancel flows, which update the subscriptions row server-side.
  const setTier = useCallback((_next: PlanTier) => {
    // intentionally no-op: tier is server-authoritative
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
    tier,
    setTier,
    recordSpin,
    recordDecision,
    grantBonusSpin,
    upgrade,
    downgrade,
    clearHistory,
  };
}
