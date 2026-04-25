import type { Suggestion, TimeOfDay, Effort } from "@/data/suggestions";

export type Energy = "low" | "normal" | "push";

export function currentTimeOfDay(now = new Date()): TimeOfDay {
  const h = now.getHours();
  if (h < 11) return "morning";
  if (h < 16) return "midday";
  if (h < 21) return "evening";
  return "night";
}

export const timeOfDayLabel: Record<TimeOfDay, string> = {
  morning: "Morning",
  midday: "Midday",
  evening: "Evening",
  night: "Late night",
};

export const energyLabel: Record<Energy, string> = {
  low: "Low energy",
  normal: "Normal",
  push: "Need a push",
};

export const energyEmoji: Record<Energy, string> = {
  low: "🪫",
  normal: "🙂",
  push: "⚡",
};

const energyEffortAllowed: Record<Energy, Effort[]> = {
  low: ["low"],
  normal: ["low", "medium"],
  push: ["low", "medium", "high"],
};

export interface FilterOptions {
  /** When true, restrict to time-of-day-appropriate tasks */
  useTimeOfDay?: boolean;
  /** Energy level — filters by effort */
  energy?: Energy;
  /** Quick start — only ≤5 minute, low-effort tasks */
  quickStart?: boolean;
  /** Optional time override (for testing) */
  now?: Date;
}

/**
 * Context-aware filter. Returns a relevant subset of the pool.
 * Falls back gracefully if filters are too strict.
 */
export function contextFilter(pool: Suggestion[], opts: FilterOptions = {}): Suggestion[] {
  const { useTimeOfDay, energy, quickStart, now } = opts;

  let result = pool;

  if (quickStart) {
    result = result.filter((s) => s.minutes <= 5 && s.effort === "low");
  }

  if (useTimeOfDay) {
    const tod = currentTimeOfDay(now);
    const filtered = result.filter((s) => s.timeOfDay.includes(tod));
    if (filtered.length > 0) result = filtered;
  }

  if (energy) {
    const allowed = energyEffortAllowed[energy];
    const filtered = result.filter((s) => allowed.includes(s.effort));
    if (filtered.length > 0) result = filtered;
  }

  // Final safety net — never return empty if pool had items
  if (result.length === 0) return pool;
  return result;
}
