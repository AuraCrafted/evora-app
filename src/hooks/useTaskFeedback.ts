import { useEffect, useState, useCallback } from "react";

const KEY = "evora.feedback.v1";

export type FeedbackKind = "did" | "later" | "dislike" | "more";

export interface FeedbackState {
  /** Per-suggestion-id score. Higher = recommend more. */
  byId: Record<string, number>;
  /** Per-tag rolling score (tags + category + type) */
  byTag: Record<string, number>;
  /** Total number of feedback signals given. */
  count: number;
}

const EMPTY: FeedbackState = { byId: {}, byTag: {}, count: 0 };

const KIND_WEIGHT: Record<FeedbackKind, number> = {
  did: 1,
  more: 2,
  later: -1,
  dislike: -3,
};

function load(): FeedbackState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    return { ...EMPTY, ...(JSON.parse(raw) as Partial<FeedbackState>) };
  } catch {
    return EMPTY;
  }
}

export function useTaskFeedback() {
  const [state, setState] = useState<FeedbackState>(() => load());

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* noop */
    }
  }, [state]);

  const record = useCallback(
    (suggestionId: string, tags: string[], kind: FeedbackKind) => {
      const w = KIND_WEIGHT[kind];
      setState((s) => {
        const byId = { ...s.byId, [suggestionId]: (s.byId[suggestionId] ?? 0) + w };
        const byTag = { ...s.byTag };
        for (const t of tags) byTag[t] = (byTag[t] ?? 0) + w;
        return { byId, byTag, count: s.count + 1 };
      });
    },
    [],
  );

  const reset = useCallback(() => setState(EMPTY), []);

  return { feedback: state, record, reset };
}
