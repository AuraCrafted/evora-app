import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) {
      return new Response(
        JSON.stringify({ error: "Missing LOVABLE_API_KEY" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json().catch(() => ({}));
    const messages = Array.isArray(body?.messages) ? (body.messages as ChatMessage[]) : null;
    if (!messages || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "messages array required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
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
      return new Response(
        JSON.stringify({ error: `AI gateway error (${res.status})`, detail: text.slice(0, 500) }),
        { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await res.json();
    const content: string = data?.choices?.[0]?.message?.content ?? "";
    return new Response(
      JSON.stringify({ content }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
