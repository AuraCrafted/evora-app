// Reads the caller's RevenueCat subscriber state via REST API and upserts
// the public.subscriptions row so existing useSubscription gating keeps working.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const RC_PRODUCT_TO_PRICE_ID: Record<string, string> = {
  "com.thiskid7.evora.monthly": "evora_monthly",
  "com.thiskid7.evora.yearly": "evora_yearly",
};

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

    const rcRes = await fetch(
      `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(user.id)}`,
      { headers: { Authorization: `Bearer ${rcSecret}` } },
    );
    if (!rcRes.ok) {
      const txt = await rcRes.text();
      throw new Error(`RevenueCat ${rcRes.status}: ${txt}`);
    }
    const rcJson = await rcRes.json();
    const subs = rcJson?.subscriber?.subscriptions ?? {};

    // Pick the subscription with the latest expires_date.
    let latestProductId: string | null = null;
    let latest: any = null;
    for (const [pid, info] of Object.entries<any>(subs)) {
      if (!latest || new Date(info.expires_date) > new Date(latest.expires_date)) {
        latest = info;
        latestProductId = pid;
      }
    }

    if (!latest || !latestProductId) {
      return new Response(
        JSON.stringify({ ok: true, status: "free", subscription: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const expiresMs = latest.expires_date ? new Date(latest.expires_date).getTime() : null;
    const purchaseMs = latest.purchase_date ? new Date(latest.purchase_date).getTime() : Date.now();
    const cancelled = !!latest.unsubscribe_detected_at || latest.refunded_at;
    const expired = expiresMs !== null && expiresMs < Date.now();
    const status = expired
      ? "canceled"
      : cancelled
        ? "active"
        : latest.period_type === "trial"
          ? "trialing"
          : "active";

    const priceIdKey = RC_PRODUCT_TO_PRICE_ID[latestProductId] || latestProductId;

    const { data: existing } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("user_id", user.id)
      .eq("environment", "live")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const payload = {
      user_id: user.id,
      product_id: latestProductId,
      price_id: priceIdKey,
      status,
      current_period_start: new Date(purchaseMs).toISOString(),
      current_period_end: expiresMs ? new Date(expiresMs).toISOString() : null,
      cancel_at_period_end: !!latest.unsubscribe_detected_at,
      environment: "live",
      stripe_subscription_id: `rc:${latest.original_purchase_date || user.id}`,
      stripe_customer_id: `rc:${user.id}`,
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      const { error } = await supabase.from("subscriptions").update(payload).eq("id", existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("subscriptions").insert(payload);
      if (error) throw error;
    }

    return new Response(
      JSON.stringify({
        ok: true,
        status,
        product_id: latestProductId,
        price_id: priceIdKey,
        current_period_end: payload.current_period_end,
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
