import { useCallback, useEffect, useState } from "react";

const KEY = "nudge.energy.taste.v1";

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function loadUsed(): boolean {
  try {
    return localStorage.getItem(KEY) === todayKey();
  } catch {
    return false;
  }
}

/**
 * Free-tier "taste" of the energy-aware roll: once per day, a free user
 * can use the energy slider to influence one roll. After that it re-locks
 * until tomorrow (or until they upgrade).
 */
export function useEnergyTaste() {
  const [usedToday, setUsedToday] = useState<boolean>(() => loadUsed());

  useEffect(() => {
    // Refresh on focus / day rollover
    const refresh = () => setUsedToday(loadUsed());
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, []);

  const consumeTaste = useCallback(() => {
    try {
      localStorage.setItem(KEY, todayKey());
    } catch {
      /* noop */
    }
    setUsedToday(true);
  }, []);

  return { tasteAvailable: !usedToday, usedToday, consumeTaste };
}
