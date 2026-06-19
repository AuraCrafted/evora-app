// Pulls the caller's latest entitlement state from RevenueCat's REST API
// and upserts it into public.subscriptions. Called by the iOS client after
// purchase / restore so the rest of the app (useSubscription) keeps working.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const APPLE_PRODUCT_TO_PRICE_ID: Record<string, string> = {
  "com.thiskid7.evora.weekly": "evora_weekly",
  "com.thiskid7.evora.monthly": "evora_monthly",
  "com.thiskid7.evora.yearly": "evora_yearly",
};

interface RCSubscription {
  expires_date: string | null;
  purchase_date: string;
  original_purchase_date: string;
  unsubscribe_detected_at: string | null;
  billing_issues_detected_at: string | null;
  is_sandbox: boolean;
  store: string;
  period_type: string; // "normal" | "trial" | "intro"
  auto_resume_date?: string | null;
}

interface RCResponse {
  subscriber?: {
    original_app_user_id: string;
    subscriptions: Record<string, RCSubscription>;
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const rcSecret = Deno.env.get("REVENUECAT_SECRET_API_KEY");
    if (!rcSecret) {
      return new Response(
        JSON.stringify({ error: "REVENUECAT_SECRET_API_KEY is not configured." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const user = userData.user;

    // Fetch this user's subscriber record from RevenueCat.
    const rcRes = await fetch(
      `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(user.id)}`,
      { headers: { Authorization: `Bearer ${rcSecret}`, Accept: "application/json" } },
    );
    if (!rcRes.ok) {
      const body = await rcRes.text();
      return new Response(
        JSON.stringify({ error: `RevenueCat error ${rcRes.status}: ${body}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const rc = (await rcRes.json()) as RCResponse;
    const subs = rc.subscriber?.subscriptions ?? {};

    // Pick the most recently purchased Evora subscription.
    const entries = Object.entries(subs)
      .filter(([id]) => id in APPLE_PRODUCT_TO_PRICE_ID)
      .sort(
        ([, a], [, b]) =>
          new Date(b.purchase_date).getTime() - new Date(a.purchase_date).getTime(),
      );

    if (entries.length === 0) {
      return new Response(JSON.stringify({ ok: true, status: "none" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [productId, sub] = entries[0];
    const now = Date.now();
    const expiresMs = sub.expires_date ? new Date(sub.expires_date).getTime() : null;
    const expired = expiresMs !== null && expiresMs < now;
    const status = expired
      ? "canceled"
      : sub.billing_issues_detected_at
        ? "past_due"
        : sub.period_type === "trial"
          ? "trialing"
          : "active";
    const cancelAtPeriodEnd = !!sub.unsubscribe_detected_at && !expired;
    const environment = sub.is_sandbox ? "test" : "live";
    const priceIdKey = APPLE_PRODUCT_TO_PRICE_ID[productId] || productId;

    const { data: existing } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("user_id", user.id)
      .eq("environment", environment)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const payload = {
      user_id: user.id,
      product_id: productId,
      price_id: priceIdKey,
      status,
      current_period_start: new Date(sub.purchase_date).toISOString(),
      current_period_end: sub.expires_date ? new Date(sub.expires_date).toISOString() : null,
      cancel_at_period_end: cancelAtPeriodEnd,
      environment,
      stripe_subscription_id: `apple:${rc.subscriber?.original_app_user_id ?? user.id}:${productId}`,
      stripe_customer_id: `apple:${user.id}`,
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      const { error } = await supabase
        .from("subscriptions")
        .update(payload)
        .eq("id", existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("subscriptions").insert(payload);
      if (error) throw error;
    }

    return new Response(
      JSON.stringify({
        ok: true,
        status,
        product_id: productId,
        price_id: priceIdKey,
        current_period_end: payload.current_period_end,
        cancel_at_period_end: cancelAtPeriodEnd,
        environment,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[sync-revenuecat-subscription]", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
