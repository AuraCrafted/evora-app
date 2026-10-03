import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const MODEL = "openai/gpt-6-astra";
const YEARLY_PRICE_IDS = ["evora_yearly"];

const CRISIS_RE =
  /\b(kill(ing)? myself|suicid\w*|end (it all|my life)|want to die|don'?t want to (live|be alive)|self[- ]?harm|hurt(ing)? myself|cut(ting)? myself|overdose)\b/i;

const CRISIS_MESSAGE =
  "I'm really glad you told me, and I'm sorry you're carrying this right now. This is bigger than a Journey, and you deserve real support from a person today.\n\n" +
  "**If you might act on these thoughts, please contact emergency services now (911 in the US, 112 in the EU, 999 in the UK).**\n\n" +
  "- **US:** call or text **988** (Suicide & Crisis Lifeline)\n" +
  "- **UK & Ireland:** Samaritans **116 123**\n" +
  "- **Elsewhere:** find a local line at **findahelpline.com**\n\n" +
  "If you can, reach out to someone you trust and let them know how you're feeling. Evora isn't a replacement for professional or emergency care.";

const SAFETY = `SAFETY (highest priority):
- If the user expresses suicidal thoughts, self-harm, or being in danger, reply with type "crisis": be warm and direct, urge immediate human support and emergency services, mention 988 (US), 116 123 (UK/IE), findahelpline.com. Never give tasks in that case.
- For medical, eating, substance, medication or other risky goals: no prescriptive medical/diet/dosing instructions; suggest talking to a professional; keep tasks gentle and general.
- Never promise or guarantee an outcome. Never claim to be a therapist.`;

const DISCOVER_PROMPT = `You are Evora Coach helping a user design a personalized Journey (a short daily program).
Loop: UNDERSTAND then PLAN. Ask ONE short, open-ended question at a time, reacting naturally to what they said. Learn: what they want to change, current situation, desired outcome, obstacles/constraints, timeframe (in days), and how demanding it should be. Don't ask for things they've already told you. Usually 2-5 questions is enough; never more than 6.
When you know enough, propose the plan.

${SAFETY}

Reply with ONLY a JSON object, no code fences, in one of these shapes:
{"type":"question","message":"<your warm reply ending in one question>"}
{"type":"plan","message":"<1-2 sentence intro of the plan>","plan":{"title":"<short title>","goal":"<user's goal in their words>","outcome":"<desired outcome>","days":<integer 3-90, respect their timeframe when reasonable>,"constraints":["<key constraint or preference>"],"tasksPerDay":<integer 1-5>,"focus":"<day 1 focus>","tasks":["<specific, achievable day 1 task>"]}}
{"type":"crisis","message":"<supportive message>"}
Tasks must be concrete and doable today (e.g. "Put your phone in another room for the first 30 minutes after waking"), not generic motivation. Number of tasks = tasksPerDay.`;

const REFLECT_PROMPT = `You are Evora Coach running an active Journey. Loop: ACT, REFLECT, ADAPT.
You get the Journey (goal, outcome, constraints, past days with tasks, what was completed, reflections) and today's check-in.
Adapt the next day's tasks: if they struggled, make tasks smaller or different; if it went well, progress gently. Use what you already know; don't re-ask. Honor tasksPerDay (1-5) unless the user asked to change the load.

${SAFETY}

Reply with ONLY a JSON object, no code fences:
{"type":"next_day","message":"<2-4 sentence warm response to their reflection>","focus":"<next day's focus>","tasks":["<specific task>"]}
or {"type":"crisis","message":"<supportive message>"}`;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function callModel(key: string, system: string, input: { role: string; content: string }[]) {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "fetch" },
    body: JSON.stringify({
      model: MODEL,
      instructions: system,
      input,
      stream: true,
      store: false,
      reasoning: { effort: "low", summary: "auto" },
      include: ["reasoning.encrypted_content"],
    }),
  });
  if (!res.ok || !res.body) {
    const t = await res.text().catch(() => "");
    console.error("AI gateway error", res.status, t);
    return { status: res.status, text: null as string | null };
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let text = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      try {
        const ev = JSON.parse(data);
        if (ev.type === "response.output_text.delta" && typeof ev.delta === "string") text += ev.delta;
        if (ev.type === "error" || ev.type === "response.failed") console.error("stream error", data);
      } catch { /* ignore */ }
    }
  }
  return { status: 200, text };
}

function parseJson(text: string) {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return json({ error: "server_misconfiguration" }, 500);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);
    const url = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claims, error: cErr } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (cErr || !claims?.claims?.sub) return json({ error: "unauthorized" }, 401);

    const svc = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: sub } = await svc
      .from("subscriptions")
      .select("status, price_id, current_period_end")
      .eq("user_id", claims.claims.sub)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const end = sub?.current_period_end ? new Date(sub.current_period_end).getTime() : null;
    const yearly = !!sub && YEARLY_PRICE_IDS.includes(sub.price_id) &&
      ((["active", "trialing", "past_due"].includes(sub.status) && (end === null || end > Date.now())) ||
        (sub.status === "canceled" && end !== null && end > Date.now()));
    if (!yearly) return json({ error: "forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const mode = body?.mode;
    let system: string;
    let input: { role: string; content: string }[];
    let latestUserText = "";

    if (mode === "discover") {
      const msgs = Array.isArray(body.messages) ? body.messages : [];
      input = msgs
        .filter((m: any) => m && typeof m.content === "string" && (m.role === "user" || m.role === "assistant"))
        .slice(-24)
        .map((m: any) => ({ role: m.role, content: m.content.slice(0, 3000) }));
      if (!input.length) return json({ error: "messages required" }, 400);
      latestUserText = [...input].reverse().find((m) => m.role === "user")?.content ?? "";
      system = DISCOVER_PROMPT;
    } else if (mode === "reflect") {
      const reflection = String(body.reflection ?? "").slice(0, 3000);
      latestUserText = reflection;
      system = REFLECT_PROMPT;
      input = [{
        role: "user",
        content: `JOURNEY:\n${JSON.stringify(body.journey ?? {}).slice(0, 12000)}\n\nTODAY'S CHECK-IN:\n${reflection || "(no words, just checking in)"}`,
      }];
    } else {
      return json({ error: "invalid mode" }, 400);
    }

    if (CRISIS_RE.test(latestUserText)) return json({ type: "crisis", message: CRISIS_MESSAGE });

    const { status, text } = await callModel(key, system, input);
    if (status === 429) return json({ error: "rate_limited" }, 429);
    if (status === 402) return json({ error: "credits_exhausted" }, 402);
    if (status === 403) return json({ error: "ai_forbidden" }, 403);
    if (!text) return json({ error: "ai_gateway_error" }, 502);

    const out = parseJson(text);
    if (!out?.type) return json({ type: "question", message: text.trim() });
    if (out.type === "crisis") return json({ type: "crisis", message: CRISIS_MESSAGE });
    const clampTasks = (t: unknown) => (Array.isArray(t) ? t.filter((x) => typeof x === "string").slice(0, 5) : []);
    if (out.type === "plan" && out.plan) {
      const p = out.plan;
      p.days = Math.min(90, Math.max(1, Math.round(Number(p.days) || 7)));
      p.tasksPerDay = Math.min(5, Math.max(1, Math.round(Number(p.tasksPerDay) || 3)));
      p.tasks = clampTasks(p.tasks).slice(0, p.tasksPerDay);
      p.constraints = Array.isArray(p.constraints) ? p.constraints.slice(0, 8) : [];
    }
    if (out.type === "next_day") out.tasks = clampTasks(out.tasks);
    return json(out);
  } catch (err) {
    console.error("journey-coach error", err);
    return json({ error: "internal_error" }, 500);
  }
});
