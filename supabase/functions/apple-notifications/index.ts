// App Store Server Notifications V2 endpoint.
// Verifies Apple's signed payload, processes each notification once, and
// refreshes the subscription from the App Store Server API.

import { createClient } from "npm:@supabase/supabase-js@2";
import {
  fetchAppleState,
  saveAppleState,
  verifierFor,
  verifyNotification,
} from "../_shared/apple.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let body: { signedPayload?: string };
  try {
    body = await req.json();
  } catch {
    return new Response("Bad request", { status: 400 });
  }
  if (typeof body?.signedPayload !== "string" || body.signedPayload.length > 100000) {
    return new Response("Bad request", { status: 400 });
  }

  let note, env;
  try {
    ({ note, env } = await verifyNotification(body.signedPayload));
  } catch (err) {
    console.error("[apple-notifications] signature verification failed", err);
    return new Response("Invalid signature", { status: 401 });
  }

  const uuid = note.notificationUUID;
  if (!uuid) return new Response("Bad request", { status: 400 });

  // Idempotency: claim the notification; a duplicate is acknowledged.
  const { error: claimErr } = await supabase.from("apple_notification_events").insert({
    notification_uuid: uuid,
    notification_type: String(note.notificationType ?? "UNKNOWN"),
    subtype: note.subtype ? String(note.subtype) : null,
    environment: String(note.data?.environment ?? ""),
    signed_date: note.signedDate ? new Date(note.signedDate).toISOString() : null,
  });
  if (claimErr) {
    if (claimErr.code === "23505") return new Response("ok", { status: 200 });
    console.error("[apple-notifications] claim failed", claimErr);
    return new Response("Retry", { status: 500 });
  }

  try {
    const signedTx = note.data?.signedTransactionInfo;
    if (!signedTx) return new Response("ok", { status: 200 }); // e.g. TEST

    const tx = await verifierFor(env).verifyAndDecodeTransaction(signedTx);
    const originalId = String(tx.originalTransactionId);
    await supabase.from("apple_notification_events")
      .update({ original_transaction_id: originalId })
      .eq("notification_uuid", uuid);

    const { data: row } = await supabase
      .from("subscriptions")
      .select("user_id")
      .eq("apple_original_transaction_id", originalId)
      .maybeSingle();

    let userId: string | null = row?.user_id ?? null;
    if (!userId && tx.appAccountToken && UUID_RE.test(tx.appAccountToken)) {
      const { data: profile } = await supabase
        .from("profiles").select("id").eq("id", tx.appAccountToken).maybeSingle();
      userId = profile?.id ?? null;
    }
    if (!userId) {
      console.warn("[apple-notifications] no Evora account linked yet", { originalId, type: note.notificationType });
      return new Response("ok", { status: 200 });
    }

    const state = await fetchAppleState(originalId, env);
    if (state) await saveAppleState(supabase, userId, state);
    return new Response("ok", { status: 200 });
  } catch (err) {
    console.error("[apple-notifications] processing failed", err);
    // Release the claim so Apple's retry is processed.
    await supabase.from("apple_notification_events").delete().eq("notification_uuid", uuid);
    return new Response("Retry", { status: 500 });
  }
});
