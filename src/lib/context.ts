import type { Suggestion, TimeOfDay, Effort } from "@/data/suggestions";

/**
 * Energy is now an integer 1-10.
 * 1 = lightest task possible (drained)
 * 10 = most demanding task (full beast mode)
 */
export type Energy = number;

export const ENERGY_MIN = 1;
export const ENERGY_MAX = 10;
export const ENERGY_DEFAULT = 5;

export function clampEnergy(n: number): Energy {
  if (!Number.isFinite(n)) return ENERGY_DEFAULT;
  const i = Math.round(n);
  if (i < ENERGY_MIN) return ENERGY_MIN;
  if (i > ENERGY_MAX) return ENERGY_MAX;
  return i;
}

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

/** Short label for a 1-10 energy level. */
export function energyLevelLabel(level: Energy): string {
  if (level <= 2) return "Barely there";
  if (level <= 4) return "Low energy";
  if (level <= 6) return "Steady";
  if (level <= 8) return "Energized";
  return "Full send";
}

export function energyLevelEmoji(level: Energy): string {
  if (level <= 2) return "🪫";
  if (level <= 4) return "🥱";
  if (level <= 6) return "🙂";
  if (level <= 8) return "💪";
  return "⚡";
}

/** Which effort buckets are appropriate for this energy level. */
function allowedEfforts(level: Energy): Effort[] {
  if (level <= 3) return ["low"];
  if (level <= 7) return ["low", "medium"];
  return ["low", "medium", "high"];
}

/** Soft maximum on minutes for a given energy level. */
function maxMinutes(level: Energy): number {
  if (level <= 2) return 3;
  if (level <= 4) return 8;
  if (level <= 6) return 20;
  if (level <= 8) return 45;
  return 999;
}

export interface FilterOptions {
  /** When true, restrict to time-of-day-appropriate tasks */
  useTimeOfDay?: boolean;
  /** Energy level 1-10, filters by effort + duration */
  energy?: Energy;
  /** Quick start, only ≤5 minute, low-effort tasks */
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
    result = result.filter((s) => (s.minutes ?? 99) <= 5 && s.effort === "low");
  }

  if (useTimeOfDay) {
    const tod = currentTimeOfDay(now);
    const filtered = result.filter((s) => Array.isArray(s.timeOfDay) && s.timeOfDay.includes(tod));
    if (filtered.length > 0) result = filtered;
  }

  if (typeof energy === "number") {
    const level = clampEnergy(energy);
    const allowed = allowedEfforts(level);
    const minutesCap = maxMinutes(level);
    const filtered = result.filter(
      (s) => s.effort && allowed.includes(s.effort) && (s.minutes ?? 99) <= minutesCap,
    );
    if (filtered.length > 0) {
      result = filtered;
    } else {
      // Fall back to effort-only if minutes filter was too tight
      const loose = result.filter((s) => s.effort && allowed.includes(s.effort));
      if (loose.length > 0) result = loose;
    }
  }

  // Final safety net, never return empty if pool had items
  if (result.length === 0) return pool;
  return result;
}
