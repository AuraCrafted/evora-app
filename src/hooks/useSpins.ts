import { useEffect, useState, useCallback, useMemo } from "react";
import type { Suggestion } from "@/data/suggestions";

const STORAGE_KEY = "nudge.spins.v3";
const FREE_ROLLS_PER_DAY = 10;
const PRO_KEY = "nudge.pro.v1";

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
      return { dayStart: today, used: 0, history: parsed.history ?? [] };
    }
    return parsed;
  } catch {
    return { dayStart: startOfDay(), used: 0, history: [] };
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
  const [isPro, setIsPro] = useState<boolean>(
    () => typeof window !== "undefined" && localStorage.getItem(PRO_KEY) === "true",
  );

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const remaining = isPro ? Infinity : Math.max(0, FREE_ROLLS_PER_DAY - state.used);
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
    setState((s) => ({
      ...s,
      used: s.used + 1,
      history: [entry, ...s.history].slice(0, 200),
    }));
    return entry.id;
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
    canSpin,
    isPro,
    history: state.history,
    streak,
    completed,
    nextResetMs,
    hasNudgedToday,
    recordSpin,
    recordDecision,
    upgrade,
    clearHistory,
  };
}
