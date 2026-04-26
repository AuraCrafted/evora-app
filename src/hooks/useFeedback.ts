import { useEffect, useState } from "react";
import { z } from "zod";

export type FeedbackCategory = "idea" | "bug" | "love" | "other";

export interface FeedbackEntry {
  id: string;
  category: FeedbackCategory;
  message: string;
  createdAt: number;
}

const KEY = "nudge.feedback.v1";
const MAX_ITEMS = 50;

export const feedbackSchema = z.object({
  category: z.enum(["idea", "bug", "love", "other"]),
  message: z
    .string()
    .trim()
    .min(3, { message: "Add a few more words." })
    .max(500, { message: "Keep it under 500 characters." }),
});

export type FeedbackInput = z.infer<typeof feedbackSchema>;

function load(): FeedbackEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x) => x && typeof x.id === "string" && typeof x.message === "string",
    );
  } catch {
    return [];
  }
}

function save(items: FeedbackEntry[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* noop */
  }
}

export function useFeedback() {
  const [items, setItems] = useState<FeedbackEntry[]>([]);

  useEffect(() => {
    setItems(load());
  }, []);

  const add = (input: FeedbackInput): { ok: true } | { ok: false; error: string } => {
    if (items.length >= MAX_ITEMS) {
      return { ok: false, error: "Feedback log is full. Clear some entries first." };
    }
    const entry: FeedbackEntry = {
      id: crypto.randomUUID(),
      category: input.category,
      message: input.message,
      createdAt: Date.now(),
    };
    const next = [entry, ...items];
    setItems(next);
    save(next);
    return { ok: true };
  };

  const remove = (id: string) => {
    const next = items.filter((i) => i.id !== id);
    setItems(next);
    save(next);
  };

  const clear = () => {
    setItems([]);
    save([]);
  };

  return { items, add, remove, clear, max: MAX_ITEMS };
}
