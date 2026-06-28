import { useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";
import type { Suggestion } from "@/data/suggestions";
import { supabase } from "@/integrations/supabase/client";

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
    .number({ invalid_type_error: "Duration must be a number." })
    .int({ message: "Duration must be a whole number." })
    .min(1, { message: "Duration must be at least 1 minute." })
    .max(240, { message: "Duration must be 240 minutes or less." }),
});

export type CustomSuggestionInput = z.infer<typeof customSuggestionSchema>;

type Row = {
  id: string;
  emoji: string;
  title: string;
  description: string | null;
  minutes: number;
  effort: string | null;
  time_of_day: string[] | null;
  tags: string[] | null;
};

function rowToSuggestion(r: Row): Suggestion {
  const minutes = r.minutes;
  const effort: Suggestion["effort"] =
    r.effort === "low" || r.effort === "medium" || r.effort === "high"
      ? r.effort
      : minutes <= 5
        ? "low"
        : minutes <= 15
          ? "medium"
          : "high";
  return {
    id: r.id,
    emoji: r.emoji,
    title: r.title,
    description: r.description || "Your own evora.",
    duration: `${minutes} min`,
    minutes,
    effort,
    timeOfDay: (r.time_of_day && r.time_of_day.length > 0
      ? r.time_of_day
      : ["morning", "midday", "evening", "night"]) as Suggestion["timeOfDay"],
    tags: (r.tags && r.tags.length > 0 ? r.tags : ["quick"]) as Suggestion["tags"],
    category: "custom",
  };
}

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

function loadLocal(): Suggestion[] {
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
  const [items, setItems] = useState<Suggestion[]>(() => loadLocal());
  const userIdRef = useRef<string | null>(null);

  // Keep localStorage as offline cache
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  // Sync with Supabase on auth changes
  useEffect(() => {
    let cancelled = false;

    const syncFromCloud = async (userId: string) => {
      const { data, error } = await supabase
        .from("custom_suggestions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error || cancelled) return;
      const cloud = (data as Row[]).map(rowToSuggestion);

      // Push any local-only items (from before sign-in) up to cloud
      const cloudIds = new Set(cloud.map((s) => s.id));
      const localOnly = loadLocal().filter((s) => !cloudIds.has(s.id));
      if (localOnly.length > 0) {
        const rows = localOnly.map((s) => ({
          id: s.id,
          user_id: userId,
          emoji: s.emoji,
          title: s.title,
          description: s.description,
          minutes: s.minutes,
          effort: s.effort,
          time_of_day: s.timeOfDay as unknown as string[],
          tags: s.tags as unknown as string[],
        }));
        const { error: upErr } = await supabase.from("custom_suggestions").upsert(rows);
        if (!upErr) {
          setItems([...localOnly, ...cloud]);
          return;
        }
      }
      setItems(cloud);
    };

    supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user.id ?? null;
      userIdRef.current = uid;
      if (uid) void syncFromCloud(uid);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const uid = session?.user.id ?? null;
      userIdRef.current = uid;
      if (uid) {
        setTimeout(() => void syncFromCloud(uid), 0);
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

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
      const minutes = parsed.data.duration;
      const next: Suggestion = {
        id,
        emoji: parsed.data.emoji,
        title: parsed.data.title,
        description: parsed.data.description?.trim() || "Your own evora.",
        duration: `${minutes} min`,
        minutes,
        effort: minutes <= 5 ? "low" : minutes <= 15 ? "medium" : "high",
        timeOfDay: ["morning", "midday", "evening", "night"],
        tags: ["quick"],
        category: "custom",
      };
      setItems((prev) => [next, ...prev]);

      const uid = userIdRef.current;
      if (uid) {
        void supabase.from("custom_suggestions").insert({
          id,
          user_id: uid,
          emoji: next.emoji,
          title: next.title,
          description: next.description,
          minutes: next.minutes,
          effort: next.effort,
          time_of_day: next.timeOfDay as unknown as string[],
          tags: next.tags as unknown as string[],
        });
      }
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
      const minutes = parsed.data.duration;
      const description = parsed.data.description?.trim() || "Your own evora.";
      const effort: Suggestion["effort"] =
        minutes <= 5 ? "low" : minutes <= 15 ? "medium" : "high";
      setItems((prev) =>
        prev.map((s) =>
          s.id === id
            ? {
                ...s,
                emoji: parsed.data.emoji,
                title: parsed.data.title,
                description,
                duration: `${minutes} min`,
                minutes,
                effort,
              }
            : s,
        ),
      );

      const uid = userIdRef.current;
      if (uid) {
        void supabase
          .from("custom_suggestions")
          .update({
            emoji: parsed.data.emoji,
            title: parsed.data.title,
            description,
            minutes,
            effort,
          })
          .eq("id", id)
          .eq("user_id", uid);
      }
      return { ok: true };
    },
    [],
  );

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((s) => s.id !== id));
    const uid = userIdRef.current;
    if (uid) {
      void supabase.from("custom_suggestions").delete().eq("id", id).eq("user_id", uid);
    }
  }, []);

  return { items, add, update, remove, max: MAX_CUSTOM };
}
