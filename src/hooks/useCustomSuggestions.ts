import { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import type { Suggestion } from "@/data/suggestions";

const STORAGE_KEY = "nudge.customSuggestions.v1";
const MAX_CUSTOM = 50;

export const customSuggestionSchema = z.object({
  emoji: z
    .string()
    .trim()
    .nonempty({ message: "Pick an emoji" })
    .max(8, { message: "Just one emoji please" }),
  title: z
    .string()
    .trim()
    .nonempty({ message: "Give it a title" })
    .max(80, { message: "Keep the title under 80 characters" }),
  description: z
    .string()
    .trim()
    .max(200, { message: "Keep the description under 200 characters" })
    .optional()
    .or(z.literal("")),
  duration: z
    .string()
    .trim()
    .nonempty({ message: "How long will this take?" })
    .max(20, { message: "Keep duration short, e.g. '5 min'" }),
});

export type CustomSuggestionInput = z.infer<typeof customSuggestionSchema>;

function migrate(s: Partial<Suggestion> & Record<string, unknown>): Suggestion | null {
  if (
    !s ||
    typeof s.id !== "string" ||
    typeof s.title !== "string" ||
    typeof s.emoji !== "string" ||
    typeof s.duration !== "string"
  ) {
    return null;
  }
  const minutes =
    typeof s.minutes === "number" && Number.isFinite(s.minutes)
      ? s.minutes
      : parseInt(String(s.duration), 10) || 5;
  const effort: Suggestion["effort"] =
    s.effort === "low" || s.effort === "medium" || s.effort === "high"
      ? s.effort
      : minutes <= 5
        ? "low"
        : minutes <= 15
          ? "medium"
          : "high";
  const timeOfDay: Suggestion["timeOfDay"] =
    Array.isArray(s.timeOfDay) && s.timeOfDay.length > 0
      ? (s.timeOfDay as Suggestion["timeOfDay"])
      : ["morning", "midday", "evening", "night"];
  const tags: Suggestion["tags"] =
    Array.isArray(s.tags) && s.tags.length > 0 ? (s.tags as Suggestion["tags"]) : ["quick"];
  return {
    id: s.id,
    emoji: s.emoji,
    title: s.title,
    description: typeof s.description === "string" ? s.description : "Your own evora.",
    duration: s.duration,
    minutes,
    effort,
    timeOfDay,
    tags,
    category: "custom",
  };
}

function load(): Suggestion[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((s) => migrate(s as Partial<Suggestion> & Record<string, unknown>))
      .filter((s): s is Suggestion => s !== null);
  } catch {
    return [];
  }
}

export function useCustomSuggestions() {
  const [items, setItems] = useState<Suggestion[]>(() => load());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const add = useCallback(
    (
      input: CustomSuggestionInput,
    ): { ok: true; id: string; error?: undefined } | { ok: false; error: string; id?: undefined } => {
      if (items.length >= MAX_CUSTOM) {
        return { ok: false, error: `You can save up to ${MAX_CUSTOM} custom evoras.` };
      }
      const parsed = customSuggestionSchema.safeParse(input);
      if (!parsed.success) {
        return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
      }
      const id = `cu-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const minutes = parseInt(parsed.data.duration, 10) || 5;
      const next: Suggestion = {
        id,
        emoji: parsed.data.emoji,
        title: parsed.data.title,
        description: parsed.data.description?.trim() || "Your own evora.",
        duration: parsed.data.duration,
        minutes,
        effort: minutes <= 5 ? "low" : minutes <= 15 ? "medium" : "high",
        timeOfDay: ["morning", "midday", "evening", "night"],
        tags: ["quick"],
        category: "custom",
      };
      setItems((prev) => [next, ...prev]);
      return { ok: true, id };
    },
    [items.length],
  );

  const update = useCallback(
    (id: string, input: CustomSuggestionInput): { ok: boolean; error?: string } => {
      const parsed = customSuggestionSchema.safeParse(input);
      if (!parsed.success) {
        return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
      }
      setItems((prev) =>
        prev.map((s) =>
          s.id === id
            ? {
                ...s,
                emoji: parsed.data.emoji,
                title: parsed.data.title,
                description: parsed.data.description?.trim() || "Your own nudge.",
                duration: parsed.data.duration,
              }
            : s,
        ),
      );
      return { ok: true };
    },
    [],
  );

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((s) => s.id !== id));
  }, []);

  return { items, add, update, remove, max: MAX_CUSTOM };
}
