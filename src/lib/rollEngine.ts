import { type Suggestion } from "@/data/suggestions";
import { contextFilter, type FilterOptions } from "@/lib/context";
import { pickRanked } from "@/lib/ranker";
import type { Preferences } from "@/hooks/usePreferences";
import type { FeedbackState } from "@/hooks/useTaskFeedback";

/**
 * Centralized roll engine. All roll modes route through `selectSpin`
 * so pool construction, repeat-prevention, and randomization stay
 * consistent across the app.
 */
export type RollMode = "builtin" | "custom" | "mixed";

export interface SelectSpinInput {
  mode: RollMode;
  builtInSuggestions: Suggestion[];
  customSuggestions: Suggestion[];
  /** Context filters (energy / time-of-day / quick start). Ignored for "custom" mode. */
  filters?: FilterOptions;
  /** Previously rolled spin id, used for immediate-repeat prevention. */
  lastRolledId?: string | null;
  /**
   * Optional ranker inputs. When present, built-in/mixed modes use the
   * weighted ranker. Custom mode always uses uniform random.
   */
  ranker?: {
    prefs: Preferences;
    feedback: FeedbackState;
    recentIds: string[];
    energy?: number;
  };
}

export interface SelectSpinResult {
  spin: Suggestion | null;
  eligible: Suggestion[];
  repeatPrevented: boolean;
}

/** Build the eligible pool for a given mode. Exposed for tests. */
export function buildEligiblePool(input: SelectSpinInput): Suggestion[] {
  const { mode, builtInSuggestions, customSuggestions, filters } = input;

  if (mode === "custom") {
    // My Spins: always the full custom list. No context filters leak in.
    return customSuggestions.slice();
  }

  if (mode === "builtin") {
    return filters ? contextFilter(builtInSuggestions, filters) : builtInSuggestions.slice();
  }

  // mixed: combine, then filter as a whole.
  const combined = [...builtInSuggestions, ...customSuggestions];
  return filters ? contextFilter(combined, filters) : combined;
}

/** Uniform random pick using full pool length. */
function uniformPick<T>(pool: T[]): T | null {
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function selectSpin(input: SelectSpinInput): SelectSpinResult {
  const eligibleAll = buildEligiblePool(input);
  const last = input.lastRolledId ?? null;

  // Immediate-repeat prevention: only when pool > 1.
  let eligible = eligibleAll;
  let repeatPrevented = false;
  if (eligibleAll.length > 1 && last) {
    const filtered = eligibleAll.filter((s) => s.id !== last);
    if (filtered.length > 0 && filtered.length !== eligibleAll.length) {
      eligible = filtered;
      repeatPrevented = true;
    }
  }

  let spin: Suggestion | null = null;
  if (eligible.length > 0) {
    if (input.mode !== "custom" && input.ranker) {
      spin =
        pickRanked(eligible, {
          energy: input.ranker.energy,
          prefs: input.ranker.prefs,
          feedback: input.ranker.feedback,
          recentIds: input.ranker.recentIds,
          excludeId: undefined,
        }) ?? uniformPick(eligible);
    } else {
      spin = uniformPick(eligible);
    }
  }

  if (typeof console !== "undefined") {
    // eslint-disable-next-line no-console
    console.debug("[ROLL ENGINE]", {
      mode: input.mode,
      builtInCount: input.builtInSuggestions.length,
      customCount: input.customSuggestions.length,
      eligibleCount: eligible.length,
      eligibleIds: eligible.map((s) => s.id),
      previousSpinId: last,
      selectedSpinId: spin?.id ?? null,
      repeatPrevented,
    });
  }

  return { spin, eligible, repeatPrevented };
}
