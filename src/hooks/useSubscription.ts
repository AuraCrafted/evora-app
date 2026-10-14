import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment } from "@/lib/stripe";
import { useAuth } from "@/hooks/useAuth";
import { pickDisplayRow, rowIsValid } from "@/lib/entitlement";

export type SubTier = "free" | "month" | "year";

export interface SubscriptionRow {
  stripe_subscription_id: string | null;
  product_id: string;
  price_id: string;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  environment: string;
  apple_original_transaction_id?: string | null;
  apple_auto_renew?: boolean | null;
  last_verified_at?: string | null;
  apple_pending_price_id?: string | null;
  apple_pending_effective_at?: string | null;
  apple_environment?: string | null;
  created_at?: string | null;
}

export function planNameForPriceId(priceId: string | null | undefined): string | null {
  if (priceId === "evora_monthly") return "Evora Elevate";
  if (priceId === "evora_yearly") return "Evora Evolve";
  return null;
}

/** Formats an Apple date; includes the time when it's within a day (Sandbox renews in minutes). */
export function formatAppleDate(iso: string): string {
  const d = new Date(iso);
  return d.getTime() - Date.now() < 24 * 60 * 60 * 1000
    ? d.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    : d.toLocaleDateString();
}

function tierFromPriceId(priceId: string | undefined): SubTier {
  if (priceId === "evora_monthly") return "month";
  if (priceId === "evora_yearly") return "year";
  return "free";
}

function isActive(row: SubscriptionRow | null): boolean {
  return !!row && rowIsValid(row);
}

export function useSubscription() {
  const { user } = useAuth();
  const [row, setRow] = useState<SubscriptionRow | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!user) {
      setRow(null);
      setLoading(false);
      return;
    }
    let env: string;
    try {
      env = getStripeEnvironment();
    } catch {
      setRow(null);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("subscriptions" as any)
      .select(
        "stripe_subscription_id, product_id, price_id, status, current_period_end, cancel_at_period_end, environment, apple_original_transaction_id, apple_auto_renew, last_verified_at, apple_pending_price_id, apple_pending_effective_at, apple_environment, created_at",
      )
      .eq("user_id", user.id)
      .eq("environment", env);
    // Access comes from every valid record (Evolve over Elevate), never just the newest.
    setRow(pickDisplayRow((data as any as SubscriptionRow[]) ?? []));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    if (!user) return;

    // Skip Realtime (WebSocket) in non-http(s) environments like Capacitor (capacitor://, file://),
    // where WebSocket connections are blocked as insecure. Fall back to polling instead.
    const protocol = typeof window !== "undefined" ? window.location.protocol : "";
    const isWebEnv = protocol === "http:" || protocol === "https:";

    if (!isWebEnv) {
      const interval = setInterval(() => {
        refetch();
      }, 30000);
      // Fired after Apple-verified purchases, renewals and app resume checks.
      const onChanged = () => refetch();
      window.addEventListener("evora:subscription-changed", onChanged);
      return () => {
        clearInterval(interval);
        window.removeEventListener("evora:subscription-changed", onChanged);
      };
    }

    const channel = supabase.channel(`subs-${user.id}-${Math.random().toString(36).slice(2, 8)}`);
    try {
      channel
        .on(
          "postgres_changes" as any,
          { event: "*", schema: "public", table: "subscriptions", filter: `user_id=eq.${user.id}` },
          () => {
            refetch();
          },
        )
        .subscribe();
    } catch (err) {
      console.warn("Realtime subscribe failed, skipping:", err);
    }
    return () => {
      try {
        supabase.removeChannel(channel);
      } catch {
        /* noop */
      }
    };
  }, [user, refetch]);

  const active = isActive(row);
  const tier: SubTier = active ? tierFromPriceId(row?.price_id) : "free";

  // A scheduled plan change, only when Apple reported it, auto-renew is still on,
  // and it hasn't already passed. Never guessed.
  const pendingEnd = row?.apple_pending_effective_at ?? null;
  const pendingName = planNameForPriceId(row?.apple_pending_price_id);
  const pendingChange =
    active && !!row?.apple_original_transaction_id && row?.apple_auto_renew === true &&
    pendingName && row?.apple_pending_price_id !== row?.price_id &&
    (!pendingEnd || new Date(pendingEnd).getTime() > Date.now())
      ? { planName: pendingName, effectiveAt: pendingEnd }
      : null;

  // Refresh right after a scheduled change or period end (minutes apart in Sandbox).
  useEffect(() => {
    const target = pendingEnd ?? row?.current_period_end ?? null;
    if (!user || !target) return;
    const ms = new Date(target).getTime() - Date.now();
    if (ms <= 0 || ms > 6 * 60 * 60 * 1000) return;
    const t = setTimeout(() => {
      window.dispatchEvent(new Event("evora:subscription-check"));
      refetch();
    }, ms + 15000);
    return () => clearTimeout(t);
  }, [user, pendingEnd, row?.current_period_end, refetch]);

  return {
    loading,
    subscription: row,
    isActive: active,
    isPro: active && tier !== "free",
    tier,
    cancelAtPeriodEnd: row?.cancel_at_period_end ?? false,
    periodEnd: row?.current_period_end ?? null,
    /** True only when the row was written from Apple-verified data. */
    isAppleVerified: !!row?.apple_original_transaction_id && !!row?.last_verified_at,
    /** Apple-reported auto-renew; null when unknown. */
    appleAutoRenew: row?.apple_auto_renew ?? null,
    status: row?.status ?? null,
    /** Apple-reported upcoming plan change, or null. */
    pendingChange,
    refetch,
  };
}
