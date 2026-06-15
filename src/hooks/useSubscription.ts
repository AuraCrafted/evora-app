import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment } from "@/lib/stripe";
import { useAuth } from "@/hooks/useAuth";

export type SubTier = "free" | "month" | "year";

export interface SubscriptionRow {
  stripe_subscription_id: string | null;
  product_id: string;
  price_id: string;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  environment: string;
}

function tierFromPriceId(priceId: string | undefined): SubTier {
  if (priceId === "evora_monthly") return "month";
  if (priceId === "evora_yearly") return "year";
  return "free";
}

function isActive(row: SubscriptionRow | null): boolean {
  if (!row) return false;
  const end = row.current_period_end ? new Date(row.current_period_end).getTime() : null;
  const inWindow = end === null || end > Date.now();
  if (["active", "trialing", "past_due"].includes(row.status) && inWindow) return true;
  if (row.status === "canceled" && end !== null && end > Date.now()) return true;
  return false;
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
        "stripe_subscription_id, product_id, price_id, status, current_period_end, cancel_at_period_end, environment",
      )
      .eq("user_id", user.id)
      .eq("environment", env)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setRow((data as any) ?? null);
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
      return () => clearInterval(interval);
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

  return {
    loading,
    subscription: row,
    isActive: active,
    isPro: active && tier !== "free",
    tier,
    cancelAtPeriodEnd: row?.cancel_at_period_end ?? false,
    periodEnd: row?.current_period_end ?? null,
    refetch,
  };
}
