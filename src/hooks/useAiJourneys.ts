import { useCallback, useEffect, useState } from "react";

export const AI_JOURNEYS_KEY = "evora.aiJourneys.v1";

export interface JourneyMsg { role: "user" | "assistant"; content: string }
export interface JourneyTask { text: string; done: boolean }
export interface JourneyDay {
  day: number;
  focus: string;
  tasks: JourneyTask[];
  reflection?: string;
  coachReply?: string;
}
export interface PlanDraft {
  title: string;
  goal: string;
  outcome: string;
  days: number;
  constraints: string[];
  tasksPerDay: number;
  focus: string;
  tasks: string[];
}
export interface AiJourney {
  id: string;
  status: "discovering" | "proposed" | "active" | "completed" | "finished";
  goal: string;
  title: string;
  outcome: string;
  totalDays: number;
  currentDay: number;
  constraints: string[];
  tasksPerDay: number;
  messages: JourneyMsg[];
  draft?: PlanDraft;
  days: JourneyDay[];
  finalReflection?: string;
  crisis?: boolean;
  createdAt: number;
  updatedAt: number;
}

function load(): AiJourney[] {
  try {
    const v = JSON.parse(localStorage.getItem(AI_JOURNEYS_KEY) || "{}");
    return Array.isArray(v.journeys) ? v.journeys : [];
  } catch {
    return [];
  }
}

export function useAiJourneys() {
  const [journeys, setJourneys] = useState<AiJourney[]>(() => load());

  useEffect(() => {
    const on = (e: StorageEvent) => { if (e.key === AI_JOURNEYS_KEY) setJourneys(load()); };
    window.addEventListener("storage", on);
    return () => window.removeEventListener("storage", on);
  }, []);

  const save = useCallback((fn: (list: AiJourney[]) => AiJourney[]) => {
    setJourneys((prev) => {
      const next = fn(prev);
      try { localStorage.setItem(AI_JOURNEYS_KEY, JSON.stringify({ journeys: next })); } catch { /* noop */ }
      return next;
    });
  }, []);

  const upsert = useCallback((j: AiJourney) => {
    const stamped = { ...j, updatedAt: Date.now() };
    save((list) => (list.some((x) => x.id === j.id) ? list.map((x) => (x.id === j.id ? stamped : x)) : [stamped, ...list]));
    return stamped;
  }, [save]);

  const remove = useCallback((id: string) => save((list) => list.filter((x) => x.id !== id)), [save]);

  return { journeys, upsert, remove };
}
