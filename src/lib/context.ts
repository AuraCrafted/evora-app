import { type Suggestion, type TimeOfDay, getMeta } from "@/data/suggestions";

/**
 * Energy is an integer 1-10.
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
  if (level <= 3) return "Low battery";
  if (level <= 6) return "Steady";
  if (level <= 8) return "Energized";
  return "Full send";
}

export function energyLevelEmoji(level: Energy): string {
  if (level <= 3) return "🪫";
  if (level <= 6) return "🙂";
  if (level <= 8) return "💪";
  return "⚡";
}

export interface FilterOptions {
  /** When true, restrict to time-of-day-appropriate tasks */
  useTimeOfDay?: boolean;
  /** Energy level 1-10, filters by task energy band */
  energy?: Energy;
  /** Quick start, only the shortest, lowest-effort tasks */
  quickStart?: boolean;
  /** Optional time override (for testing) */
  now?: Date;
}

/**
 * Context-aware filter using each task's energy band metadata.
 * Energy 1–3 → only true low-effort tasks
 * Energy 4–6 → low + moderate
 * Energy 7–10 → moderate + hard
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
    const filtered = result.filter((s) => {
      const m = getMeta(s);
      // Strict: task energy band must contain the current level.
      if (level < m.energyMin || level > m.energyMax) return false;
      // Extra guard for the extremes so very ambitious tasks never appear at low energy.
      if (level <= 3 && s.effort !== "low") return false;
      if (level >= 8 && s.effort === "low" && (s.minutes ?? 0) > 3) return false;
      return true;
    });
    if (filtered.length > 0) result = filtered;
  }

  if (result.length === 0) return pool;
  return result;
}
