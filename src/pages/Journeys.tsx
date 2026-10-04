import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Check, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { BottomNav } from "@/components/BottomNav";
import { YearlyLock } from "@/components/YearlyLock";
import { useSpins } from "@/hooks/useSpins";
import { useAiJourneys, type AiJourney, type PlanDraft } from "@/hooks/useAiJourneys";
import { journeys as starters } from "@/data/journeys";
import { supabase } from "@/integrations/supabase/client";
import { sfx } from "@/lib/feedback";
import { haptic } from "@/lib/native";
import { cn } from "@/lib/utils";

const EXAMPLES = [
  "I want to spend less time on my phone.",
  "I want to become more social.",
  "I want to get back into exercising.",
  "I feel stuck and want to get my life moving again.",
];

const newId = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

async function callCoach(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("journey-coach", { body });
  if (error) {
    let msg = "Please try again in a moment.";
    try {
      const j = await (error as { context?: Response }).context?.json();
      if (j?.error === "rate_limited") msg = "Too many requests. Wait a moment and try again.";
      if (j?.error === "credits_exhausted") msg = "AI is unavailable right now.";
      if (j?.error === "forbidden") msg = "Journeys need an active Yearly plan.";
    } catch { /* noop */ }
    throw new Error(msg);
  }
  return data as {
    type: "question" | "plan" | "crisis" | "next_day";
    message: string;
    plan?: PlanDraft;
    focus?: string;
    tasks?: string[];
  };
}

const Journeys = () => {
  const { tier, streak } = useSpins();
  const { journeys, upsert, remove } = useAiJourneys();
  const [openId, setOpenId] = useState<string | null>(null);
  const [goal, setGoal] = useState("");
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  if (tier !== "year") {
    return (
      <YearlyLock
        streak={streak}
        title="Journeys are a Yearly perk"
        body="Personal, coach-guided programs built from a conversation about what you want to change."
      />
    );
  }

  const open = journeys.find((j) => j.id === openId) ?? null;

  const discover = async (j: AiJourney) => {
    setBusy(true);
    try {
      const r = await callCoach({ mode: "discover", messages: j.messages });
      const msgs = [...j.messages, { role: "assistant" as const, content: r.message }];
      if (r.type === "crisis") upsert({ ...j, messages: msgs, crisis: true });
      else if (r.type === "plan" && r.plan) upsert({ ...j, messages: msgs, status: "proposed", draft: r.plan });
      else upsert({ ...j, messages: msgs });
      sfx.coachMessage?.();
    } catch (e) {
      toast.error("Coach is taking a breath.", { description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const start = (text: string) => {
    const t = text.trim();
    if (!t) return;
    sfx.tap();
    haptic("light");
    const j: AiJourney = {
      id: newId(), status: "discovering", goal: t, title: "New Journey", outcome: "",
      totalDays: 0, currentDay: 0, constraints: [], tasksPerDay: 3,
      messages: [{ role: "user", content: t }], days: [], createdAt: Date.now(), updatedAt: Date.now(),
    };
    const saved = upsert(j);
    setGoal("");
    setOpenId(saved.id);
    void discover(saved);
  };

  const sendReply = () => {
    if (!open || !reply.trim()) return;
    const j = upsert({ ...open, status: "discovering", draft: undefined, messages: [...open.messages, { role: "user", content: reply.trim() }] });
    setReply("");
    void discover(j);
  };

  const activate = () => {
    if (!open?.draft) return;
    const d = open.draft;
    upsert({
      ...open, status: "active", title: d.title, goal: d.goal || open.goal, outcome: d.outcome,
      totalDays: d.days, currentDay: 1, constraints: d.constraints, tasksPerDay: d.tasksPerDay,
      days: [{ day: 1, focus: d.focus, tasks: d.tasks.map((text) => ({ text, done: false })) }],
    });
    sfx.accept();
    haptic("success");
  };

  const toggleTask = (j: AiJourney, i: number) => {
    const days = j.days.slice();
    const cur = { ...days[days.length - 1] };
    cur.tasks = cur.tasks.map((t, k) => (k === i ? { ...t, done: !t.done } : t));
    days[days.length - 1] = cur;
    upsert({ ...j, days });
    haptic("light");
    if (!j.days[j.days.length - 1].tasks[i].done) sfx.accept();
  };

  const reflect = async (j: AiJourney, extendDays = 0) => {
    setBusy(true);
    const text = reply.trim();
    try {
      const days = j.days.slice();
      if (!extendDays) days[days.length - 1] = { ...days[days.length - 1], reflection: text };
      const totalDays = j.totalDays + extendDays;
      const isLast = !extendDays && j.currentDay >= j.totalDays;
      if (isLast) {
        upsert({ ...j, days, status: "completed" });
        setReply("");
        return;
      }
      const r = await callCoach({
        mode: "reflect",
        reflection: extendDays ? `I want to continue for ${extendDays} more days. ${text}` : text,
        journey: { title: j.title, goal: j.goal, outcome: j.outcome, constraints: j.constraints, tasksPerDay: j.tasksPerDay, totalDays, currentDay: j.currentDay, days },
      });
      if (r.type === "crisis") {
        upsert({ ...j, days, crisis: true, messages: [...j.messages, { role: "assistant", content: r.message }] });
      } else {
        days[days.length - 1] = { ...days[days.length - 1], coachReply: r.message };
        days.push({ day: j.currentDay + 1, focus: r.focus ?? "", tasks: (r.tasks ?? []).map((text) => ({ text, done: false })) });
        upsert({ ...j, days, totalDays, currentDay: j.currentDay + 1, status: "active" });
      }
      setReply("");
    } catch (e) {
      toast.error("Coach is taking a breath.", { description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const back = (
    <button onClick={() => { sfx.tap(); setOpenId(null); }} className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
      <ArrowLeft className="h-4 w-4" />
      <span className="font-display text-sm font-medium">Journeys</span>
    </button>
  );

  const replyBox = (placeholder: string, onSend: () => void, label = "Send") => (
    <div className="mt-4 rounded-3xl bg-card p-3 soft-shadow">
      <textarea
        value={reply}
        onChange={(e) => setReply(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full resize-none bg-transparent text-base outline-none placeholder:text-muted-foreground"
      />
      <div className="flex justify-end">
        <button
          disabled={busy}
          onClick={onSend}
          className="flex items-center gap-1.5 rounded-full gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} {label}
        </button>
      </div>
    </div>
  );

  let body: JSX.Element;

  if (open?.crisis) {
    const last = [...open.messages].reverse().find((m) => m.role === "assistant");
    body = (
      <section className="px-5 max-w-2xl mx-auto w-full">
        {back}
        <div className="mt-4 rounded-3xl bg-card p-5 soft-shadow">
          <h2 className="font-display text-xl font-semibold">You matter</h2>
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed">{last?.content.replace(/\*\*/g, "")}</p>
          <button onClick={() => { remove(open.id); setOpenId(null); }} className="mt-4 text-xs text-muted-foreground underline">
            Close this Journey
          </button>
        </div>
      </section>
    );
  } else if (open && (open.status === "discovering" || open.status === "proposed")) {
    body = (
      <section className="px-5 max-w-2xl mx-auto w-full">
        {back}
        <h2 className="font-display text-2xl font-semibold mt-4">Let's shape your Journey</h2>
        <div className="mt-4 space-y-3">
          {open.messages.map((m, i) => (
            <div key={i} className={cn("max-w-[85%] rounded-2xl px-4 py-3 text-sm whitespace-pre-line",
              m.role === "user" ? "ml-auto gradient-primary text-primary-foreground" : "bg-card soft-shadow")}>
              {m.content}
            </div>
          ))}
          {busy && <div className="text-xs text-muted-foreground flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" /> Coach is thinking</div>}
        </div>
        {open.status === "proposed" && open.draft && (
          <div className="mt-4 rounded-3xl bg-card p-5 soft-shadow">
            <div className="text-xs font-semibold text-primary">Proposed plan</div>
            <h3 className="font-display text-xl font-semibold mt-1">{open.draft.title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{open.draft.outcome}</p>
            <div className="mt-3 text-sm">{open.draft.days} days · {open.draft.tasksPerDay} tasks a day</div>
            {open.draft.constraints.length > 0 && (
              <ul className="mt-2 text-xs text-muted-foreground list-disc pl-4">{open.draft.constraints.map((c) => <li key={c}>{c}</li>)}</ul>
            )}
            <div className="mt-3 text-sm font-medium">Day 1: {open.draft.focus}</div>
            <ul className="mt-1 text-sm list-disc pl-4">{open.draft.tasks.map((t) => <li key={t}>{t}</li>)}</ul>
            <p className="mt-3 text-[11px] text-muted-foreground">A plan to support you, not a guarantee of results.</p>
            <button onClick={activate} className="mt-4 w-full rounded-full gradient-primary py-3 text-sm font-semibold text-primary-foreground">
              Start this Journey
            </button>
          </div>
        )}
        {replyBox(open.status === "proposed" ? "Want changes? Tell your coach." : "Your answer", sendReply)}
      </section>
    );
  } else if (open && open.status === "active") {
    const today = open.days[open.days.length - 1];
    const allTasks = open.days.flatMap((d) => d.tasks);
    const pct = Math.round((Math.min(open.currentDay - 1, open.totalDays) / open.totalDays) * 100);
    const prev = open.days[open.days.length - 2];
    body = (
      <section className="px-5 max-w-2xl mx-auto w-full">
        {back}
        <h2 className="font-display text-2xl font-semibold mt-4">{open.title}</h2>
        <p className="text-sm text-muted-foreground">Day {open.currentDay} of {open.totalDays} · {allTasks.filter((t) => t.done).length}/{allTasks.length} tasks done</p>
        <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full gradient-primary transition-all" style={{ width: `${pct}%` }} /></div>
        {prev?.coachReply && <div className="mt-4 rounded-2xl bg-card p-4 text-sm soft-shadow whitespace-pre-line">{prev.coachReply}</div>}
        <div className="mt-4 rounded-3xl bg-card p-5 soft-shadow">
          <div className="text-xs font-semibold text-primary">Today's focus</div>
          <div className="font-semibold mt-1">{today.focus}</div>
          <ol className="mt-3 space-y-2">
            {today.tasks.map((t, i) => (
              <li key={i}>
                <button onClick={() => toggleTask(open, i)} className="w-full flex items-start gap-3 rounded-2xl p-3 text-left bg-muted/40">
                  <span className={cn("mt-0.5 h-6 w-6 shrink-0 rounded-full flex items-center justify-center text-[11px] font-semibold",
                    t.done ? "gradient-primary text-primary-foreground" : "bg-background text-muted-foreground")}>
                    {t.done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                  </span>
                  <span className={cn("text-sm", t.done && "line-through text-muted-foreground")}>{t.text}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
        <h3 className="font-display text-lg font-semibold mt-6">Check in</h3>
        <p className="text-sm text-muted-foreground">How did today go? What felt difficult? Anything get in your way?</p>
        {replyBox("Share how it went", () => void reflect(open), open.currentDay >= open.totalDays ? "Finish day" : "Reflect & plan tomorrow")}
      </section>
    );
  } else if (open && (open.status === "completed" || open.status === "finished")) {
    const allTasks = open.days.flatMap((d) => d.tasks);
    body = (
      <section className="px-5 max-w-2xl mx-auto w-full">
        {back}
        <div className="mt-4 rounded-3xl bg-card p-5 soft-shadow">
          <div className="text-xs font-semibold text-primary">{open.status === "finished" ? "Finished" : "Journey complete"}</div>
          <h2 className="font-display text-2xl font-semibold mt-1">{open.title}</h2>
          <p className="mt-3 text-sm"><span className="text-muted-foreground">Your goal: </span>{open.goal}</p>
          <p className="mt-1 text-sm">{allTasks.filter((t) => t.done).length} of {allTasks.length} tasks done across {open.days.length} days.</p>
          {open.finalReflection && <p className="mt-3 text-sm italic">"{open.finalReflection}"</p>}
        </div>
        {open.status === "completed" && (
          <>
            <p className="mt-5 text-sm text-muted-foreground">Looking back, what changed for you, and what do you want to keep doing?</p>
            {replyBox("Your reflection", () => { upsert({ ...open, status: "finished", finalReflection: reply.trim() }); setReply(""); sfx.accept(); }, "Finish")}
            <div className="mt-3 flex gap-2">
              <button disabled={busy} onClick={() => void reflect(open, 7)} className="flex-1 rounded-full bg-card py-3 text-sm font-semibold soft-shadow">Continue 7 more days</button>
              <button onClick={() => { setOpenId(null); setGoal(`Adjusting my Journey "${open.title}". Original goal: ${open.goal}. `); }} className="flex-1 rounded-full bg-card py-3 text-sm font-semibold soft-shadow">Adjust my goal</button>
            </div>
          </>
        )}
      </section>
    );
  } else {
    const mine = journeys.filter((j) => !j.crisis);
    body = (
      <section className="px-5 max-w-2xl lg:max-w-4xl mx-auto w-full">
        <Link to="/" onClick={() => sfx.tap()} className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          <span className="font-display text-sm font-medium">Home</span>
        </Link>
        <h1 className="font-display text-3xl font-semibold mt-4">Journeys</h1>
        <p className="text-muted-foreground text-sm mt-1">Guided by your coach, at your own pace.</p>

        <div className="mt-5 rounded-3xl bg-card p-5 soft-shadow">
          <h2 className="font-display text-xl font-semibold">Where do you want to be different?</h2>
          <p className="text-sm text-muted-foreground mt-1">Tell Evora what's going on in your own words.</p>
          <textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            rows={4}
            placeholder={EXAMPLES[0]}
            className="mt-3 w-full resize-none rounded-2xl bg-muted/40 p-3 text-base outline-none placeholder:text-muted-foreground"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {EXAMPLES.map((e) => (
              <button key={e} onClick={() => setGoal(e)} className="rounded-full bg-muted/60 px-3 py-1 text-xs text-muted-foreground">{e}</button>
            ))}
          </div>
          <button
            disabled={!goal.trim()}
            onClick={() => start(goal)}
            className="mt-4 w-full rounded-full gradient-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            Start with my coach
          </button>
        </div>

        {mine.length > 0 && (
          <>
            <h3 className="font-display text-lg font-semibold mt-6">Your Journeys</h3>
            <div className="mt-2 space-y-3">
              {mine.map((j) => (
                <button key={j.id} onClick={() => { sfx.tap(); setOpenId(j.id); }} className="w-full rounded-3xl bg-card p-4 soft-shadow text-left">
                  <div className="font-semibold">{j.title === "New Journey" ? j.goal.slice(0, 60) : j.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {j.status === "active" ? `Day ${j.currentDay} of ${j.totalDays}` : j.status === "finished" ? "Finished" : j.status === "completed" ? "Ready to wrap up" : "Planning with your coach"}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        <h3 className="font-display text-lg font-semibold mt-6">Or start from an idea</h3>
        <div className="mt-2 space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
          {starters.map((s) => (
            <button key={s.id} onClick={() => start(`I want to ${s.title.toLowerCase()}.`)} className="w-full rounded-3xl bg-card p-5 soft-shadow text-left flex items-center gap-3">
              <div className="text-3xl">{s.emoji}</div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold">{s.title}</div>
                <div className="text-xs text-muted-foreground">{s.tagline}</div>
              </div>
            </button>
          ))}
        </div>
      </section>
    );
  }

  return (
    <main className="min-h-screen flex flex-col pt-6">
      {body}
      <div className="pb-24" />
      <BottomNav streak={streak} />
    </main>
  );
};

export default Journeys;
