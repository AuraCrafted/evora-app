// Upserts the caller's Apple subscription row from a StoreKit 2 entitlement
// reported by @squareetlabs/capacitor-subscriptions on the client.
//
// NOTE: This trusts the client-reported entitlement. For production-grade
// server verification, call Apple's App Store Server API
// (`/inApps/v1/transactions/{transactionId}`) using a signed JWT built from
// your App Store Connect API key, and replace the body of this function
// with the verified transaction payload.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const APPLE_PRODUCT_TO_PRICE_ID: Record<string, string> = {
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

    const body = await req.json().catch(() => ({}));
    const { productId, transactionId, expirationDateMs, isTrial } = body as {
      productId?: string;
      transactionId?: string | number | null;
      expirationDateMs?: number | null;
      isTrial?: boolean;
    };

    const { data: existing } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("user_id", user.id)
      .eq("environment", "live")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // No active entitlement -> mark current row canceled/expired.
    if (!productId) {
      if (existing) {
        await supabase
          .from("subscriptions")
          .update({
            status: "canceled",
            current_period_end: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      }
      return new Response(JSON.stringify({ ok: true, status: "free" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = Date.now();
    const expMs = typeof expirationDateMs === "number" ? expirationDateMs : null;
    const expired = expMs !== null && expMs < now;
    const status = expired ? "canceled" : isTrial ? "trialing" : "active";
    const priceIdKey = APPLE_PRODUCT_TO_PRICE_ID[productId] || productId;

    const payload = {
      user_id: user.id,
      product_id: productId,
      price_id: priceIdKey,
      status,
      current_period_start: new Date(now).toISOString(),
      current_period_end: expMs ? new Date(expMs).toISOString() : null,
      cancel_at_period_end: false,
      environment: "live",
      stripe_subscription_id: transactionId ? `apple:${transactionId}` : `apple:${user.id}`,
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
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[sync-apple-subscription]", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
