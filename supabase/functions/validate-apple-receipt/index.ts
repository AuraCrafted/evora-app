// Validates an Apple App Store receipt and upserts the user's subscription row.
//
// Flow:
//   1. Authenticate the caller via the Supabase JWT.
//   2. POST the base64 receipt to Apple's production verifyReceipt endpoint.
//   3. If Apple returns status 21007 (sandbox receipt), retry against sandbox.
//   4. Parse latest_receipt_info, find the most recent transaction for the
//      requested product_id, and upsert into public.subscriptions.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const APPLE_PROD = "https://buy.itunes.apple.com/verifyReceipt";
const APPLE_SANDBOX = "https://sandbox.itunes.apple.com/verifyReceipt";

const APPLE_PRODUCT_TO_PRICE_ID: Record<string, string> = {
  "com.thiskid7.evora.monthly": "evora_monthly",
  "com.thiskid7.evora.yearly": "evora_yearly",
};

interface AppleLatestInfo {
  product_id: string;
  transaction_id: string;
  original_transaction_id: string;
  purchase_date_ms: string;
  expires_date_ms?: string;
  cancellation_date_ms?: string;
  is_trial_period?: string;
}

interface AppleVerifyResponse {
  status: number;
  environment?: string;
  latest_receipt?: string;
  latest_receipt_info?: AppleLatestInfo[];
  pending_renewal_info?: Array<{
    product_id: string;
    auto_renew_status: string;
    expiration_intent?: string;
  }>;
}

async function verifyWithApple(receipt: string, sharedSecret: string): Promise<AppleVerifyResponse> {
  const body = JSON.stringify({
    "receipt-data": receipt,
    password: sharedSecret,
    "exclude-old-transactions": true,
  });

  let res = await fetch(APPLE_PROD, { method: "POST", body });
  let json = (await res.json()) as AppleVerifyResponse;
  if (json.status === 21007) {
    res = await fetch(APPLE_SANDBOX, { method: "POST", body });
    json = (await res.json()) as AppleVerifyResponse;
  }
  return json;
}

function pickLatest(infos: AppleLatestInfo[], productId?: string): AppleLatestInfo | null {
  const filtered = productId ? infos.filter((i) => i.product_id === productId) : infos;
  if (filtered.length === 0) return null;
  return filtered
    .slice()
    .sort((a, b) => Number(b.purchase_date_ms) - Number(a.purchase_date_ms))[0];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sharedSecret = Deno.env.get("APPLE_SHARED_SECRET");
    if (!sharedSecret) {
      return new Response(
        JSON.stringify({ error: "APPLE_SHARED_SECRET is not configured." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Authenticate caller
    const supabase = createClient(supabaseUrl, serviceKey);
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
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
    const { receipt, productId, restore } = body as {
      receipt?: string;
      productId?: string;
      restore?: boolean;
    };

    // Restore flow without a fresh receipt: just return current DB state for the user.
    if (restore && !receipt) {
      const { data: existing } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .eq("environment", "live")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return new Response(JSON.stringify({ ok: true, restored: true, subscription: existing }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!receipt) {
      return new Response(JSON.stringify({ error: "Missing receipt" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apple = await verifyWithApple(receipt, sharedSecret);
    if (apple.status !== 0) {
      return new Response(
        JSON.stringify({ error: `Apple receipt invalid (status ${apple.status})` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const infos = apple.latest_receipt_info || [];
    const latest = pickLatest(infos, productId);
    if (!latest) {
      return new Response(JSON.stringify({ error: "No matching transaction in receipt" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const expiresMs = latest.expires_date_ms ? Number(latest.expires_date_ms) : null;
    const purchaseMs = Number(latest.purchase_date_ms);
    const now = Date.now();
    const cancelled = !!latest.cancellation_date_ms;
    const expired = expiresMs !== null && expiresMs < now;
    const status = cancelled
      ? "canceled"
      : expired
        ? "canceled"
        : latest.is_trial_period === "true"
          ? "trialing"
          : "active";

    const priceIdKey = APPLE_PRODUCT_TO_PRICE_ID[latest.product_id] || latest.product_id;
    const renewInfo = apple.pending_renewal_info?.find((p) => p.product_id === latest.product_id);
    const cancelAtPeriodEnd = renewInfo ? renewInfo.auto_renew_status === "0" : false;

    // Look up an existing live row for this user; update it, else insert.
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
      product_id: latest.product_id,
      price_id: priceIdKey,
      status,
      current_period_start: new Date(purchaseMs).toISOString(),
      current_period_end: expiresMs ? new Date(expiresMs).toISOString() : null,
      cancel_at_period_end: cancelAtPeriodEnd,
      environment: "live",
      // Reuse the stripe_subscription_id column to store the Apple original tx id
      // so the existing useSubscription hook continues to work unchanged.
      stripe_subscription_id: `apple:${latest.original_transaction_id}`,
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
        product_id: latest.product_id,
        price_id: priceIdKey,
        current_period_end: payload.current_period_end,
        cancel_at_period_end: cancelAtPeriodEnd,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[validate-apple-receipt]", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
