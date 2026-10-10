// Verifies the caller's StoreKit 2 signed transactions with Apple and saves
// Apple's authoritative subscription status. Also reconciles existing Apple
// subscriptions on app open/resume. Never trusts client claims: if Apple
// verification fails, nothing is written.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";
import {
  AppleConfigError,
  Environment,
  fetchAppleState,
  OwnershipError,
  saveAppleState,
  verifyTransaction,
  type AppleState,
} from "../_shared/apple.ts";

const Body = z.object({
  signedTransactions: z.array(z.string().min(20).max(20000)).max(20).optional(),
  reconcile: z.boolean().optional(),
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const RECONCILE_MIN_INTERVAL_MS = 5 * 60 * 1000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return json({ error: "Unauthorized" }, 401);
  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData.user) return json({ error: "Unauthorized" }, 401);
  const userId = userData.user.id;

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: "Invalid request" }, 400);
  const { signedTransactions = [], reconcile = false } = parsed.data;

  try {
    const states: AppleState[] = [];

    for (const jws of signedTransactions) {
      const { tx, env } = await verifyTransaction(jws);
      if (tx.appAccountToken && tx.appAccountToken.toLowerCase() !== userId.toLowerCase()) {
        return json({ error: "This purchase belongs to a different Evora account.", code: "ownership" }, 409);
      }
      const state = await fetchAppleState(String(tx.originalTransactionId), env);
      if (state) {
        await saveAppleState(supabase, userId, state);
        states.push(state);
      }
    }

    if (reconcile && signedTransactions.length === 0) {
      const { data: rows } = await supabase
        .from("subscriptions")
        .select("apple_original_transaction_id, apple_environment, last_verified_at")
        .eq("user_id", userId)
        .not("apple_original_transaction_id", "is", null);
      for (const row of rows ?? []) {
        const last = row.last_verified_at ? new Date(row.last_verified_at).getTime() : 0;
        if (Date.now() - last < RECONCILE_MIN_INTERVAL_MS) continue;
        const env = row.apple_environment === "Sandbox" ? Environment.SANDBOX : Environment.PRODUCTION;
        const state = await fetchAppleState(row.apple_original_transaction_id, env);
        if (state) {
          await saveAppleState(supabase, userId, state);
          states.push(state);
        }
      }
    }

    const active = states.find((s) => ["active", "trialing"].includes(s.status) &&
      (!s.periodEnd || new Date(s.periodEnd).getTime() > Date.now()));
    return json({
      ok: true,
      result: active ? "active" : states.length ? "inactive" : "none",
      price_id: active?.priceId ?? null,
      current_period_end: active?.periodEnd ?? null,
      verified: states.length,
    });
  } catch (err) {
    if (err instanceof OwnershipError) return json({ error: err.message, code: "ownership" }, 409);
    if (err instanceof AppleConfigError) {
      console.error("[sync-apple-subscription] config", err.message);
      return json({ error: "Apple verification is not configured yet.", code: "config" }, 503);
    }
    const e = err as { httpStatusCode?: number; apiError?: number; status?: number };
    const detail = e?.apiError ?? e?.httpStatusCode ?? e?.status ?? null;
    console.error("[sync-apple-subscription] verification failed", detail, err);
    return json({ error: "Couldn't verify the purchase with Apple. Please try again.", code: "verify", detail }, 502);
  }
});
