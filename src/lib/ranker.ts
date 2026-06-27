import { type Suggestion, getMeta } from "@/data/suggestions";
import type { Preferences } from "@/hooks/usePreferences";
import type { FeedbackState } from "@/hooks/useTaskFeedback";

interface RankInput {
  energy?: number;
  prefs: Preferences;
  feedback: FeedbackState;
  recentIds: string[]; // most recent first
  excludeId?: string;
}

const RECENCY_PENALTY = [60, 40, 24, 14, 8, 5, 3, 2, 1];

function avoidMatches(s: Suggestion, prefs: Preferences): boolean {
  const m = getMeta(s);
  const a = prefs.avoid;
  if (!a.length) return false;
  if (a.includes("social") && m.social === "social") return true;
  if (a.includes("outdoor") && m.setting === "outdoor") return true;
  if (a.includes("intense") && s.effort === "high") return true;
  if (a.includes("chores") && s.category === "tidy") return true;
  if (a.includes("screens") && (s.category === "mind" && s.tags.includes("focus"))) return false; // unrelated
  if (a.includes("loud") && m.mood === "energizing" && s.effort === "high") return true;
  return false;
}

function scoreSuggestion(s: Suggestion, input: RankInput): number {
  const m = getMeta(s);
  const { prefs, feedback, recentIds } = input;
  let score = 10;

  // Preference alignment
  for (const g of m.goals) if (prefs.goals.includes(g)) score += 6;
  if (prefs.preferredTypes.includes(m.type)) score += 5;
  // Interest taxonomy maps loosely to goals/categories
  if (prefs.interests.includes("fitness") && s.category === "fitness") score += 4;
  if (prefs.interests.includes("mindfulness") && (s.category === "mind" || s.category === "care")) score += 4;
  if (prefs.interests.includes("creativity") && s.category === "create") score += 4;
  if (prefs.interests.includes("connection") && s.category === "social") score += 4;
  if (prefs.interests.includes("outdoors") && s.category === "outside") score += 4;
  if (prefs.interests.includes("productivity") && (s.category === "tidy" || s.category === "mind")) score += 3;
  if (prefs.interests.includes("home") && s.category === "tidy") score += 3;
  if (prefs.interests.includes("learning") && s.tags.includes("focus")) score += 2;

  // Feedback memory
  score += (feedback.byId[s.id] ?? 0) * 3;
  for (const t of s.tags) score += (feedback.byTag[t] ?? 0) * 0.5;
  score += (feedback.byTag[s.category] ?? 0) * 1;
  score += (feedback.byTag[m.type] ?? 0) * 1;

  // Anti-repeat
  const idx = recentIds.indexOf(s.id);
  if (idx >= 0) score -= RECENCY_PENALTY[idx] ?? 1;

  // AI tasks get a small boost so personalized picks surface
  if (s.ai) score += 4;

  // Tiny jitter so ties feel organic
  score += Math.random() * 1.5;
  return score;
}

/**
 * Rank pool and pick one task using softmax-ish weighted random over top N.
 */
export function pickRanked(pool: Suggestion[], input: RankInput): Suggestion | null {
  if (pool.length === 0) return null;
  const filtered = pool.filter((s) => {
    if (input.excludeId && s.id === input.excludeId) return false;
    if (avoidMatches(s, input.prefs)) return false;
    return true;
  });
  const candidates = filtered.length > 0 ? filtered : pool;

  const scored = candidates
    .map((s) => ({ s, score: scoreSuggestion(s, input) }))
    .sort((a, b) => b.score - a.score);

  // Weighted random over top 5 to keep variety.
  const top = scored.slice(0, Math.min(5, scored.length));
  const min = Math.min(...top.map((t) => t.score));
  const weights = top.map((t) => Math.max(0.1, t.score - min + 1));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < top.length; i++) {
    r -= weights[i];
    if (r <= 0) return top[i].s;
  }
  return top[0].s;
}
