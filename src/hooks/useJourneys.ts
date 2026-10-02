import { useCallback, useEffect, useState } from "react";

const KEY = "evora.journeys.v1";

/** journeyId -> array of completion timestamps per step index (null = not done) */
export type JourneyProgress = Record<string, (number | null)[]>;

function load(): JourneyProgress {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}

export function useJourneys() {
  const [progress, setProgress] = useState<JourneyProgress>(() => load());

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(progress));
    } catch {
      /* noop */
    }
  }, [progress]);

  useEffect(() => {
    const on = (e: StorageEvent) => { if (e.key === KEY) setProgress(load()); };
    window.addEventListener("storage", on);
    return () => window.removeEventListener("storage", on);
  }, []);

  const toggleStep = useCallback((journeyId: string, index: number, total: number) => {
    setProgress((p) => {
      const arr = (p[journeyId] ?? Array(total).fill(null)).slice();
      while (arr.length < total) arr.push(null);
      arr[index] = arr[index] ? null : Date.now();
      return { ...p, [journeyId]: arr };
    });
  }, []);

  const resetJourney = useCallback((journeyId: string) => {
    setProgress((p) => {
      const next = { ...p };
      delete next[journeyId];
      return next;
    });
  }, []);

  return { progress, toggleStep, resetJourney };
}
