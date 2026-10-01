import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Check, RotateCcw } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { YearlyLock } from "@/components/YearlyLock";
import { useSpins } from "@/hooks/useSpins";
import { useJourneys } from "@/hooks/useJourneys";
import { journeys } from "@/data/journeys";
import { sfx } from "@/lib/feedback";
import { haptic } from "@/lib/native";
import { cn } from "@/lib/utils";

const Journeys = () => {
  const { tier, streak } = useSpins();
  const { progress, toggleStep, resetJourney } = useJourneys();
  const [openId, setOpenId] = useState<string | null>(null);

  if (tier !== "year") {
    return (
      <YearlyLock
        streak={streak}
        title="Journeys are a Yearly perk"
        body="Guided, multi-step experiences for getting out of a rut, being more social, trying new things and improving your energy."
      />
    );
  }

  return (
    <main className="min-h-screen flex flex-col">
      <header className="px-5 pt-6 pb-3 max-w-2xl lg:max-w-4xl mx-auto w-full">
        <Link to="/" onClick={() => sfx.tap()} className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          <span className="font-display text-sm font-medium">Home</span>
        </Link>
        <h1 className="font-display text-3xl font-semibold mt-4">Journeys</h1>
        <p className="text-muted-foreground text-sm mt-1">Guided steps, at your own pace.</p>
      </header>

      <section className="px-5 max-w-2xl lg:max-w-4xl mx-auto w-full space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
        {journeys.map((j) => {
          const done = (progress[j.id] ?? []).filter(Boolean).length;
          const pct = Math.round((done / j.steps.length) * 100);
          const open = openId === j.id;
          const nextIdx = j.steps.findIndex((_, i) => !progress[j.id]?.[i]);
          return (
            <div key={j.id} className={cn("rounded-3xl bg-card p-5 soft-shadow", open && "md:col-span-2")}>
              <button
                className="w-full text-left flex items-center gap-3"
                onClick={() => {
                  sfx.tap();
                  haptic("selection");
                  setOpenId(open ? null : j.id);
                }}
              >
                <div className="text-3xl">{j.emoji}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">{j.title}</div>
                  <div className="text-xs text-muted-foreground">{j.tagline}</div>
                </div>
                <div className="text-xs font-semibold text-primary">{done}/{j.steps.length}</div>
              </button>
              <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full gradient-primary transition-all" style={{ width: `${pct}%` }} />
              </div>

              {open && (
                <ol className="mt-4 space-y-2">
                  {j.steps.map((s, i) => {
                    const isDone = !!progress[j.id]?.[i];
                    const isNext = i === nextIdx;
                    return (
                      <li key={s.title}>
                        <button
                          onClick={() => {
                            toggleStep(j.id, i, j.steps.length);
                            haptic("light");
                            if (!isDone) sfx.success?.();
                            else sfx.tap();
                          }}
                          className={cn(
                            "w-full flex items-start gap-3 rounded-2xl p-3 text-left transition-colors",
                            isNext ? "bg-primary/10" : "bg-muted/40",
                          )}
                        >
                          <span
                            className={cn(
                              "mt-0.5 h-6 w-6 shrink-0 rounded-full flex items-center justify-center text-[11px] font-semibold",
                              isDone ? "gradient-primary text-primary-foreground" : "bg-background text-muted-foreground",
                            )}
                          >
                            {isDone ? <Check className="h-3.5 w-3.5" /> : i + 1}
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className={cn("block text-sm font-medium", isDone && "line-through text-muted-foreground")}>
                              {s.emoji} {s.title}
                            </span>
                            <span className="block text-xs text-muted-foreground">
                              {s.description} · {s.minutes} min
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                  {done > 0 && (
                    <button
                      onClick={() => resetJourney(j.id)}
                      className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground"
                    >
                      <RotateCcw className="h-3 w-3" /> Start over
                    </button>
                  )}
                  {done === j.steps.length && (
                    <p className="text-sm font-medium text-primary pt-1">Journey complete. Beautiful work.</p>
                  )}
                </ol>
              )}
            </div>
          );
        })}
      </section>

      <div className="pb-24" />
      <BottomNav streak={streak} />
    </main>
  );
};

export default Journeys;
