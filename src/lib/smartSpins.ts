import type { HistoryEntry } from "@/hooks/useSpins";
import type { Suggestion, TimeOfDay } from "@/data/suggestions";

/**
 * Smart Spins (Yearly): learns from the user's past spins and decisions.
 * Produces a per-category affinity and a per-time-of-day category affinity
 * that the ranker adds on top of its normal scoring.
 */
export interface SmartProfile {
  byCategory: Record<string, number>;
  byCategoryAtTime: Record<string, number>;
  skippedIds: Record<string, number>;
  samples: number;
}

export function timeOfDayFor(ts: number): TimeOfDay {
  const h = new Date(ts).getHours();
  if (h >= 5 && h < 11) return "morning";
  if (h >= 11 && h < 17) return "midday";
  if (h >= 17 && h < 22) return "evening";
  return "night";
}

export function buildSmartProfile(history: HistoryEntry[], now = Date.now()): SmartProfile {
  const byCategory: Record<string, number> = {};
  const byCategoryAtTime: Record<string, number> = {};
  const skippedIds: Record<string, number> = {};
  let samples = 0;
  const dayMs = 86400000;
  for (const h of history) {
    if (h.accepted === null) continue;
    samples++;
    // Recent behaviour matters more: weight decays over ~30 days.
    const age = Math.max(0, (now - h.ts) / dayMs);
    const w = Math.max(0.25, 1 - age / 30);
    const delta = (h.accepted ? 1 : -0.6) * w;
    byCategory[h.category] = (byCategory[h.category] ?? 0) + delta;
    const key = `${timeOfDayFor(h.ts)}:${h.category}`;
    byCategoryAtTime[key] = (byCategoryAtTime[key] ?? 0) + delta;
    if (!h.accepted) skippedIds[h.suggestionId] = (skippedIds[h.suggestionId] ?? 0) + w;
  }
  return { byCategory, byCategoryAtTime, skippedIds, samples };
}

export function smartBoost(s: Suggestion, p: SmartProfile, now = Date.now()): number {
  if (p.samples === 0) return 0;
  const clamp = (n: number) => Math.max(-6, Math.min(6, n));
  let b = clamp((p.byCategory[s.category] ?? 0) * 1.5);
  b += clamp((p.byCategoryAtTime[`${timeOfDayFor(now)}:${s.category}`] ?? 0) * 2);
  b -= Math.min(6, (p.skippedIds[s.id] ?? 0) * 2);
  return b;
}
