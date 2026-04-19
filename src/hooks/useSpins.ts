import { useEffect, useState, useCallback } from "react";

const STORAGE_KEY = "nudge.spins.v1";
const FREE_SPINS_PER_WEEK = 3;
const PRO_KEY = "nudge.pro.v1";

interface SpinState {
  weekStart: number; // ms timestamp of start of current week (Monday)
  used: number;
  history: { id: string; ts: number; accepted: boolean | null }[];
}

function startOfWeek(date = new Date()): number {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun
  const diff = (day === 0 ? -6 : 1) - day; // shift to Monday
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function load(): SpinState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) throw new Error("empty");
    const parsed = JSON.parse(raw) as SpinState;
    const currentWeek = startOfWeek();
    if (parsed.weekStart !== currentWeek) {
      return { weekStart: currentWeek, used: 0, history: [] };
    }
    return parsed;
  } catch {
    return { weekStart: startOfWeek(), used: 0, history: [] };
  }
}

export function useSpins() {
  const [state, setState] = useState<SpinState>(() => load());
  const [isPro, setIsPro] = useState<boolean>(() => localStorage.getItem(PRO_KEY) === "true");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const remaining = isPro ? Infinity : Math.max(0, FREE_SPINS_PER_WEEK - state.used);
  const canSpin = isPro || remaining > 0;

  const recordSpin = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      used: s.used + 1,
      history: [{ id, ts: Date.now(), accepted: null }, ...s.history].slice(0, 30),
    }));
  }, []);

  const recordDecision = useCallback((id: string, accepted: boolean) => {
    setState((s) => ({
      ...s,
      history: s.history.map((h, i) => (i === 0 && h.id === id ? { ...h, accepted } : h)),
    }));
  }, []);

  const upgrade = useCallback(() => {
    localStorage.setItem(PRO_KEY, "true");
    setIsPro(true);
  }, []);

  const reset = useCallback(() => {
    setState({ weekStart: startOfWeek(), used: 0, history: [] });
  }, []);

  // ms until next reset (next Monday 00:00)
  const nextResetMs = state.weekStart + 7 * 24 * 60 * 60 * 1000 - Date.now();

  return {
    used: state.used,
    total: FREE_SPINS_PER_WEEK,
    remaining,
    canSpin,
    isPro,
    history: state.history,
    nextResetMs,
    recordSpin,
    recordDecision,
    upgrade,
    reset,
  };
}
