import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Syncs on-device app data (spins/streak history, preferences, task feedback,
 * journeys) to the signed-in account so it follows the user to any device.
 * Custom spins and Coach chats sync through their own tables.
 */
const SPINS = "nudge.spins.v3";
const PREFS = "evora.preferences.v1";
const FEEDBACK = "evora.feedback.v1";
const JOURNEYS = "evora.journeys.v1";
const KEYS = [SPINS, PREFS, FEEDBACK, JOURNEYS];

type Json = any; // eslint-disable-line @typescript-eslint/no-explicit-any

function readLocal(key: string): Json | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function merge(key: string, local: Json | null, cloud: Json | null): Json | null {
  if (!local) return cloud;
  if (!cloud) return local;
  switch (key) {
    case SPINS: {
      const byId = new Map<string, Json>();
      for (const h of [...(cloud.history ?? []), ...(local.history ?? [])]) {
        const prev = byId.get(h.id);
        if (!prev || (prev.accepted === null && h.accepted !== null)) byId.set(h.id, h);
      }
      const history = [...byId.values()].sort((a, b) => b.ts - a.ts).slice(0, 200);
      const sameDay = local.dayStart === cloud.dayStart;
      const newer = (local.dayStart ?? 0) >= (cloud.dayStart ?? 0) ? local : cloud;
      return {
        ...newer,
        used: sameDay ? Math.max(local.used ?? 0, cloud.used ?? 0) : newer.used,
        bonus: sameDay ? Math.min(local.bonus ?? 0, cloud.bonus ?? 0) : newer.bonus,
        history,
        hiddenBeforeTs: Math.max(local.hiddenBeforeTs ?? 0, cloud.hiddenBeforeTs ?? 0) || undefined,
        recentIds: history.map((h) => h.suggestionId).filter((v, i, a) => a.indexOf(v) === i).slice(0, 15),
      };
    }
    case PREFS:
      if (cloud.completedAt && (!local.completedAt || cloud.completedAt >= local.completedAt)) return cloud;
      return local;
    case FEEDBACK:
      return (cloud.count ?? 0) >= (local.count ?? 0) ? cloud : local;
    case JOURNEYS: {
      const out: Json = { ...cloud };
      for (const [id, steps] of Object.entries<Json[]>(local)) {
        const c: Json[] = out[id] ?? [];
        const len = Math.max(c.length, steps.length);
        out[id] = Array.from({ length: len }, (_, i) => steps[i] ?? c[i] ?? null);
      }
      return out;
    }
  }
  return local;
}

function writeLocal(key: string, value: Json) {
  const raw = JSON.stringify(value);
  if (localStorage.getItem(key) === raw) return;
  origSetItem.call(localStorage, key, raw);
  // Let mounted hooks pick up the new value.
  window.dispatchEvent(new StorageEvent("storage", { key, newValue: raw }));
  if (key === PREFS) window.dispatchEvent(new CustomEvent("evora:prefs-changed"));
}

const origSetItem = Storage.prototype.setItem;

export const CloudSync = () => {
  const { user, loading } = useAuth();
  const userRef = useRef<string | null>(null);
  const readyRef = useRef(false);
  const timers = useRef<Record<string, number>>({});

  // Intercept writes to synced keys and push them (debounced).
  useEffect(() => {
    const push = (key: string) => {
      const uid = userRef.current;
      if (!uid || !readyRef.current) return;
      window.clearTimeout(timers.current[key]);
      timers.current[key] = window.setTimeout(async () => {
        const value = readLocal(key);
        if (value === null) return;
        const { error } = await supabase
          .from("user_state")
          .upsert({ user_id: uid, key, value, updated_at: new Date().toISOString() });
        if (error) console.error("[CLOUD SYNC] push failed", key, error);
      }, 1200);
    };
    Storage.prototype.setItem = function (key: string, value: string) {
      origSetItem.call(this, key, value);
      if (this === localStorage && KEYS.includes(key)) push(key);
    };
    return () => {
      Storage.prototype.setItem = origSetItem;
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    const uid = user?.id ?? null;
    const prev = userRef.current;
    userRef.current = uid;
    readyRef.current = false;

    if (!uid) {
      // Signed out after being signed in: don't leave the account's data on the device.
      if (prev) {
        writeLocal(SPINS, { dayStart: new Date().setHours(0, 0, 0, 0), used: 0, bonus: 0, history: [] });
        writeLocal(FEEDBACK, { byId: {}, byTag: {}, count: 0 });
        writeLocal(JOURNEYS, {});
      }
      return;
    }

    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.from("user_state").select("key, value").eq("user_id", uid);
      if (cancelled) return;
      if (error) {
        console.error("[CLOUD SYNC] pull failed", error);
        return;
      }
      const cloud = new Map((data ?? []).map((r) => [r.key, r.value]));
      readyRef.current = true;
      for (const key of KEYS) {
        const merged = merge(key, readLocal(key), cloud.get(key) ?? null);
        if (merged === null) continue;
        writeLocal(key, merged);
        if (JSON.stringify(merged) !== JSON.stringify(cloud.get(key))) {
          await supabase
            .from("user_state")
            .upsert({ user_id: uid, key, value: merged, updated_at: new Date().toISOString() });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, loading]);

  return null;
};
