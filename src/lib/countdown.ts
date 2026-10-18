import { useEffect, useState } from "react";

/**
 * Ticks on its own local timer so only the component that calls it re-renders.
 * Kept out of the spins provider on purpose: a per-second provider tick would
 * re-render every screen that reads roll state.
 */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const id = window.setInterval(tick, intervalMs);
    const onVis = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", tick);
    };
  }, [intervalMs]);

  return now;
}

/**
 * Human-readable time left, down to the second so the countdown visibly ticks.
 * e.g. 7_384_000 -> "2h 3m 4s", 65_000 -> "1m 5s", 9_000 -> "9s".
 */
export function formatTimeLeft(ms: number): string {
  if (ms <= 0) return "soon";
  const total = Math.floor(ms / 1000);
  const hours = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hours > 0) return `${hours}h ${mins}m ${secs}s`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}
