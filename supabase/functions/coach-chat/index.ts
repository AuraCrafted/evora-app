import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

const SYSTEM_PROMPT = `You are Evora Coach — a warm, grounded personal coach inside the Evora app.

Personality:
- Encouraging, never harsh. You speak like a thoughtful friend who happens to coach.
- Bias toward action: turn vague feelings into one small, specific next step.
- Curious before prescriptive: ask one short clarifying question when it'll genuinely help, otherwise just respond.
- Calm, human, occasionally a little playful. Avoid corporate or overly clinical language.
- Validate feelings briefly, then gently move the user forward. Never shame, never lecture.

Style:
- Keep replies short and readable. Usually 2–5 sentences.
- Use light markdown when it helps (bold for emphasis, short bullets for steps).
- Offer at most 1–3 concrete suggestions at a time. Two minutes is enough.
- If the user seems stuck, suggest rolling a small Evora task or trying the energy slider.
- Never claim to be a therapist. For crisis or mental-health emergencies, gently encourage reaching out to a professional or local support line.

You're here to help them move, gently. That's it.`;

const YEARLY_PRICE_IDS = ["evora_yearly"];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) {
      console.error("Missing LOVABLE_API_KEY");
      return json({ error: "server_misconfiguration" }, 500);
    }

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims?.sub) {
      return json({ error: "unauthorized" }, 401);
    }
    const userId = claimsData.claims.sub;

    // Subscription check: must have active yearly plan
    const serviceClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: sub } = await serviceClient
      .from("subscriptions")
      .select("status, price_id, current_period_end")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const hasYearly = (() => {
      if (!sub) return false;
      if (!YEARLY_PRICE_IDS.includes(sub.price_id)) return false;
      const end = sub.current_period_end ? new Date(sub.current_period_end).getTime() : null;
      const inWindow = end === null || end > Date.now();
      if (["active", "trialing", "past_due"].includes(sub.status) && inWindow) return true;
      if (sub.status === "canceled" && end !== null && end > Date.now()) return true;
      return false;
    })();

    if (!hasYearly) {
      return json({ error: "forbidden" }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const messages = Array.isArray(body?.messages) ? (body.messages as ChatMessage[]) : null;
    if (!messages || messages.length === 0) {
      return json({ error: "messages array required" }, 400);
    }

    const cleaned = messages
      .filter((m) => m && typeof m.content === "string" && (m.role === "user" || m.role === "assistant"))
      .slice(-30)
      .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...cleaned],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("AI gateway error", res.status, text);
      if (res.status === 429) return json({ error: "rate_limited" }, 429);
      if (res.status === 402) return json({ error: "credits_exhausted" }, 402);
      return json({ error: "ai_gateway_error" }, 502);
    }

    const data = await res.json();
    const content: string = data?.choices?.[0]?.message?.content ?? "";
    return json({ content });
  } catch (err) {
    console.error("coach-chat unexpected error", err);
    return json({ error: "internal_error" }, 500);
  }
});
