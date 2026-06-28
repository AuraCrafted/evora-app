import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import type { Suggestion } from "@/data/suggestions";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "nudge.customSuggestions.v1";
const MAX_CUSTOM = 50;
const SYNC_EVENT = "evora:custom-spins-changed";

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

type MutationResult<T = undefined> =
  | ({ ok: true; error?: undefined } & (T extends undefined ? Record<string, never> : T))
  | { ok: false; error: string };

interface CustomSuggestionsContextValue {
  items: Suggestion[];
  loading: boolean;
  syncStatus: "local" | "syncing" | "synced" | "error";
  syncError: string | null;
  isSignedIn: boolean;
  add: (input: CustomSuggestionInput) => Promise<MutationResult<{ id: string }>>;
  update: (id: string, input: CustomSuggestionInput) => Promise<MutationResult>;
  remove: (id: string) => Promise<MutationResult>;
  refresh: () => Promise<void>;
  max: number;
}

const CustomSuggestionsContext = createContext<CustomSuggestionsContextValue | null>(null);

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

function saveLocal(items: Suggestion[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent(SYNC_EVENT));
  } catch {
    /* noop */
  }
}

function suggestionToRow(s: Suggestion, userId: string) {
  return {
    id: s.id,
    user_id: userId,
    emoji: s.emoji,
    title: s.title,
    description: s.description,
    minutes: s.minutes,
    effort: s.effort,
    time_of_day: s.timeOfDay as unknown as string[],
    tags: s.tags as unknown as string[],
  };
}

export function CustomSuggestionsProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Suggestion[]>(() => loadLocal());
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<"local" | "syncing" | "synced" | "error">("syncing");
  const [syncError, setSyncError] = useState<string | null>(null);
  const userIdRef = useRef<string | null>(null);
  const syncRunRef = useRef(0);

  // Keep localStorage as offline cache
  useEffect(() => {
    saveLocal(items);
  }, [items]);

  const syncFromCloud = useCallback(async (userId: string) => {
    const run = ++syncRunRef.current;
    setLoading(true);
    setSyncStatus("syncing");
    setSyncError(null);

    const localSnapshot = loadLocal();
    const { data, error } = await supabase
      .from("custom_suggestions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (run !== syncRunRef.current) return;

    if (error) {
      setLoading(false);
      setSyncStatus("error");
      setSyncError(error.message);
      return;
    }

    const cloud = ((data ?? []) as Row[]).map(rowToSuggestion);
    const cloudIds = new Set(cloud.map((s) => s.id));
    const localOnly = localSnapshot.filter((s) => !cloudIds.has(s.id));

    if (localOnly.length > 0) {
      const { error: upErr } = await supabase
        .from("custom_suggestions")
        .upsert(localOnly.map((s) => suggestionToRow(s, userId)), { onConflict: "id" });

      if (run !== syncRunRef.current) return;

      if (upErr) {
        setLoading(false);
        setSyncStatus("error");
        setSyncError(upErr.message);
        setItems(cloud.length > 0 ? cloud : localSnapshot);
        return;
      }
    }

    const mergedMap = new Map<string, Suggestion>();
    for (const s of [...localOnly, ...cloud]) mergedMap.set(s.id, s);
    setItems(Array.from(mergedMap.values()));
    setLoading(false);
    setSyncStatus("synced");
  }, []);

  const refresh = useCallback(async () => {
    const uid = userIdRef.current;
    if (!uid) {
      setItems(loadLocal());
      setLoading(false);
      setSyncStatus("local");
      setSyncError(null);
      return;
    }
    await syncFromCloud(uid);
  }, [syncFromCloud]);

  // Sync with the user's account on auth changes.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user.id ?? null;
      userIdRef.current = uid;
      if (uid) {
        void syncFromCloud(uid);
      } else {
        setItems(loadLocal());
        setLoading(false);
        setSyncStatus("local");
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const uid = session?.user.id ?? null;
      userIdRef.current = uid;
      if (uid) {
        setTimeout(() => void syncFromCloud(uid), 0);
      } else {
        syncRunRef.current += 1;
        setItems(loadLocal());
        setLoading(false);
        setSyncStatus("local");
        setSyncError(null);
      }
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, [syncFromCloud]);

  useEffect(() => {
    const syncLocal = () => {
      if (!userIdRef.current) setItems(loadLocal());
    };
    window.addEventListener("storage", syncLocal);
    window.addEventListener(SYNC_EVENT, syncLocal);
    return () => {
      window.removeEventListener("storage", syncLocal);
      window.removeEventListener(SYNC_EVENT, syncLocal);
    };
  }, []);

  const add = useCallback(
    async (input: CustomSuggestionInput): Promise<MutationResult<{ id: string }>> => {
      if (items.length >= MAX_CUSTOM) {
        return { ok: false, error: `You can save up to ${MAX_CUSTOM} custom spins.` };
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
        const { error } = await supabase.from("custom_suggestions").insert(suggestionToRow(next, uid));
        if (error) {
          setItems((prev) => prev.filter((s) => s.id !== id));
          setSyncStatus("error");
          setSyncError(error.message);
          return { ok: false, error: "Couldn't sync this spin to your account. Please try again." };
        }
        setSyncStatus("synced");
      } else {
        setSyncStatus("local");
      }
      return { ok: true, id };
    },
    [items.length],
  );

  const update = useCallback(
    async (id: string, input: CustomSuggestionInput): Promise<MutationResult> => {
      const parsed = customSuggestionSchema.safeParse(input);
      if (!parsed.success) {
        return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
      }
      const previous = items;
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
        const { error } = await supabase
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
        if (error) {
          setItems(previous);
          setSyncStatus("error");
          setSyncError(error.message);
          return { ok: false, error: "Couldn't sync this change to your account. Please try again." };
        }
        setSyncStatus("synced");
      } else {
        setSyncStatus("local");
      }
      return { ok: true };
    },
    [items],
  );

  const remove = useCallback(async (id: string): Promise<MutationResult> => {
    const previous = items;
    setItems((prev) => prev.filter((s) => s.id !== id));
    const uid = userIdRef.current;
    if (uid) {
      const { error } = await supabase.from("custom_suggestions").delete().eq("id", id).eq("user_id", uid);
      if (error) {
        setItems(previous);
        setSyncStatus("error");
        setSyncError(error.message);
        return { ok: false, error: "Couldn't delete this spin from your account. Please try again." };
      }
      setSyncStatus("synced");
    } else {
      setSyncStatus("local");
    }
    return { ok: true };
  }, [items]);

  const value = useMemo<CustomSuggestionsContextValue>(
    () => ({
      items,
      loading,
      syncStatus,
      syncError,
      isSignedIn: !!userIdRef.current,
      add,
      update,
      remove,
      refresh,
      max: MAX_CUSTOM,
    }),
    [items, loading, syncStatus, syncError, add, update, remove, refresh],
  );

  return (
    <CustomSuggestionsContext.Provider value={value}>{children}</CustomSuggestionsContext.Provider>
  );
}

export function useCustomSuggestions() {
  const ctx = useContext(CustomSuggestionsContext);
  if (!ctx) {
    throw new Error("useCustomSuggestions must be used inside CustomSuggestionsProvider");
  }
  return ctx;
}
