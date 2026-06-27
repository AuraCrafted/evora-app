# Smarter, Personalized Recommendations

Goal: E.vora learns the user over time instead of feeling random. Energy slider truly gates effort, onboarding captures preferences, feedback nudges future rolls, and AI fills gaps with tailored tasks.

## 1. Richer task metadata
Extend `src/data/suggestions.ts` so every task has:
- `energyMin`, `energyMax` (1–10)
- `difficulty`: `easy | moderate | hard`
- `effort`: `low | medium | high`
- `mood`: `calm | focused | playful | reflective | energizing`
- `goals`: array (`wellbeing`, `productivity`, `connection`, `creativity`, `learning`, `fitness`, `mindfulness`)
- `setting`: `indoor | outdoor | either`
- `social`: `solo | social | either`
- `type`: `physical | mental | creative | admin | social`
- `minutes`: numeric estimate

Backfill existing tasks in one pass. Add ~15 new low-effort and ~15 new high-effort tasks to cover the energy extremes.

## 2. Energy-strict matching
Rewrite `contextFilter` in `src/lib/context.ts`:
- Energy 1–3 → only `effort: low` AND `energyMin <= 3`
- Energy 4–6 → `effort: low | medium` within range
- Energy 7–10 → any effort, prefer `medium | high`
- Drop the current "quick start" overlap so the bands don't bleed.

## 3. Onboarding personalization
New `src/pages/Onboarding.tsx` shown once on first launch (gated by `localStorage` flag), 4 short steps:
1. Interests (multi-chip: fitness, mindfulness, creativity, learning, productivity, connection, outdoors, home)
2. Goals (multi-chip, same taxonomy as task `goals`)
3. Preferred task types (`physical/mental/creative/admin/social`)
4. Dislikes/avoid (chips: loud, social, screens, outdoor, chores, intense)

Skippable. Route added to `App.tsx`; redirect from `/` to `/onboarding` until completed.

## 4. Preference memory
New `src/hooks/usePreferences.ts` storing in localStorage:
```ts
{ interests, goals, preferredTypes, avoid, completedAt }
```
Plus a settings screen entry to re-run onboarding.

## 5. Feedback learning
Replace the binary accept/reject on `SuggestionCard` with four actions:
- Did it
- Not today
- Not helpful
- More like this

New `src/hooks/useTaskFeedback.ts` keeps a per-task score (`+2` more-like-this, `+1` did it, `-1` not today, `-3` not helpful) and per-tag rolling scores. Stored locally.

## 6. Ranking + anti-repeat
New `src/lib/ranker.ts` `rankSuggestions(pool, { energy, prefs, feedback, recentIds })`:
- Hard filter by energy band and `avoid`.
- Score = preference match + tag feedback + goal alignment − recency penalty (last 10 shown task IDs tracked in `useSpins`).
- Weighted random pick from top N to keep variety.
Wire into `triggerRoll` in `src/pages/Index.tsx`.

## 7. AI-generated personalized tasks
New edge function `supabase/functions/generate-task/index.ts` using Lovable AI Gateway (`google/gemini-3-flash-preview`) with `Output.object`:
- Input: prefs, energy, recent tasks, current mood/time.
- Output: one task in the new metadata shape.
Triggered when:
- User has completed onboarding, AND
- They've given ≥10 feedback signals, AND
- ~20% of rolls (or when pool gets stale).
Generated tasks merged into the rolling pool with an `ai: true` flag, cached in localStorage for offline.

## Technical details
- All client-side; no schema changes required (memory + feedback live in localStorage to match existing pattern in `useSpins`, `useEnergy`).
- Edge function reads anon (no auth) — energy + prefs sent in body.
- Bundle ID, IAP flows, Stripe, and native shell are untouched.
- Em-dash rule kept (commas only).

## Files

New:
- `src/pages/Onboarding.tsx`
- `src/hooks/usePreferences.ts`
- `src/hooks/useTaskFeedback.ts`
- `src/lib/ranker.ts`
- `supabase/functions/generate-task/index.ts`

Modified:
- `src/data/suggestions.ts` (metadata + new tasks)
- `src/lib/context.ts` (strict energy bands)
- `src/components/SuggestionCard.tsx` (4 feedback actions)
- `src/components/EnergySelector.tsx` (band labels)
- `src/pages/Index.tsx` (ranker + recent-ID tracking + AI fetch)
- `src/hooks/useSpins.ts` (recent task IDs)
- `src/pages/Settings.tsx` (reset preferences)
- `src/App.tsx` (onboarding route)
