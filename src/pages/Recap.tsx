import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Dices } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/BottomNav";
import { YearlyLock } from "@/components/YearlyLock";
import { useSpins } from "@/hooks/useSpins";
import { useJourneys } from "@/hooks/useJourneys";
import { journeys } from "@/data/journeys";
import { categoryEmoji, categoryLabels, type Category } from "@/data/suggestions";
import { timeOfDayFor } from "@/lib/smartSpins";
import { timeOfDayLabel } from "@/lib/context";
import { sfx } from "@/lib/feedback";

const DAY = 86400000;
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const Recap = () => {
  const { tier, streak, allHistory } = useSpins();
  const { progress } = useJourneys();

  const r = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = today.getTime() - 6 * DAY;
    const prevStart = start - 7 * DAY;
    const week = allHistory.filter((h) => h.ts >= start);
    const prev = allHistory.filter((h) => h.ts >= prevStart && h.ts < start);
    const done = week.filter((h) => h.accepted);
    const skipped = week.filter((h) => h.accepted === false).length;
    const prevDone = prev.filter((h) => h.accepted).length;

    const perDay = Array.from({ length: 7 }, (_, i) => {
      const d = start + i * DAY;
      return {
        label: DAYS[new Date(d).getDay()],
        count: done.filter((h) => h.ts >= d && h.ts < d + DAY).length,
      };
    });
    const activeDays = perDay.filter((d) => d.count > 0).length;

    const tally = <T extends string>(arr: T[]) => {
      const m: Record<string, number> = {};
      for (const k of arr) m[k] = (m[k] ?? 0) + 1;
      return Object.entries(m).sort((a, b) => b[1] - a[1]);
    };
    const cats = tally(done.map((h) => h.category));
    const times = tally(done.map((h) => timeOfDayFor(h.ts)));
    const skippedCats = tally(week.filter((h) => h.accepted === false).map((h) => h.category));
    const allCats = Object.keys(categoryLabels).filter((c) => !["any", "custom"].includes(c));
    const untried = allCats.find((c) => !week.some((h) => h.category === c));

    return { week, done, skipped, prevDone, perDay, activeDays, cats, times, skippedCats, untried };
  }, [allHistory]);

  if (tier !== "year") {
    return (
      <YearlyLock
        streak={streak}
        title="Weekly Recap is an Evolve perk"
        body="A personal summary of your week, your progress, your patterns, and suggestions made for you."
      />
    );
  }

  const max = Math.max(1, ...r.perDay.map((d) => d.count));
  const topCat = r.cats[0]?.[0] as Category | undefined;
  const topTime = r.times[0]?.[0];
  const trend = r.done.length - r.prevDone;
  const activeJourney = journeys.find((j) => {
    const n = (progress[j.id] ?? []).filter(Boolean).length;
    return n > 0 && n < j.steps.length;
  });

  const suggestions: string[] = [];
  if (topTime) suggestions.push(`You show up most in the ${timeOfDayLabel[topTime as keyof typeof timeOfDayLabel].toLowerCase()}. Try rolling then on purpose.`);
  if (r.untried) suggestions.push(`You have not tried anything in ${categoryLabels[r.untried as Category]} this week. Give one a roll.`);
  if (r.skippedCats[0] && r.skippedCats[0][1] >= 2)
    suggestions.push(`You often skip ${categoryLabels[r.skippedCats[0][0] as Category]}. Smart Spins will show those less.`);
  if (r.activeDays < 4) suggestions.push("Aim for one small action on four days next week.");
  if (activeJourney) suggestions.push(`Keep going with your "${activeJourney.title}" journey.`);
  else suggestions.push("Start a Journey for a guided week of small steps.");

  return (
    <main className="min-h-screen flex flex-col">
      <header className="px-5 pt-6 pb-3 max-w-2xl lg:max-w-4xl mx-auto w-full">
        <Link to="/" onClick={() => sfx.tap()} className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          <span className="font-display text-sm font-medium">Home</span>
        </Link>
        <h1 className="font-display text-3xl font-semibold mt-4">Your week</h1>
        <p className="text-muted-foreground text-sm mt-1">The last 7 days, at a glance.</p>
      </header>

      <section className="px-5 max-w-2xl lg:max-w-4xl mx-auto w-full space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {[
            { v: r.done.length, l: "Completed" },
            { v: r.activeDays, l: "Active days" },
            { v: streak, l: "Streak" },
          ].map((s) => (
            <div key={s.l} className="rounded-3xl bg-card p-4 soft-shadow text-center">
              <div className="font-display text-2xl font-semibold">{s.v}</div>
              <div className="text-[11px] text-muted-foreground">{s.l}</div>
            </div>
          ))}
        </div>

        <div className="rounded-3xl bg-card p-5 soft-shadow">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="font-display text-base font-semibold">Progress</h2>
            <span className="text-xs text-muted-foreground">
              {trend === 0 ? "Same as last week" : trend > 0 ? `${trend} more than last week` : `${-trend} fewer than last week`}
            </span>
          </div>
          <div className="flex items-end justify-between gap-2 h-28">
            {r.perDay.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                <div
                  className="w-full rounded-lg gradient-primary"
                  style={{ height: `${(d.count / max) * 100}%`, minHeight: d.count ? 8 : 3, opacity: d.count ? 1 : 0.2 }}
                />
                <span className="text-[10px] text-muted-foreground">{d.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl bg-card p-5 soft-shadow">
          <h2 className="font-display text-base font-semibold mb-3">Patterns</h2>
          {r.week.length === 0 ? (
            <p className="text-sm text-muted-foreground">No rolls this week yet. Your patterns will show up here.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {topCat && (
                <li>{categoryEmoji[topCat]} Your favorite: <b>{categoryLabels[topCat]}</b> ({r.cats[0][1]} done)</li>
              )}
              {topTime && <li>🕰️ Best time: <b>{timeOfDayLabel[topTime as keyof typeof timeOfDayLabel]}</b></li>}
              <li>🎲 {r.week.length} rolls, {r.done.length} done, {r.skipped} skipped</li>
            </ul>
          )}
        </div>

        <div className="rounded-3xl bg-card p-5 soft-shadow">
          <h2 className="font-display text-base font-semibold mb-3">For next week</h2>
          <ul className="space-y-2.5">
            {suggestions.slice(0, 4).map((s) => (
              <li key={s} className="flex gap-2 text-sm"><span className="text-primary">•</span><span>{s}</span></li>
            ))}
          </ul>
          <div className="mt-4 flex gap-2">
            <Link to="/roll" className="flex-1"><Button variant="hero" className="w-full"><Dices className="h-4 w-4" />Roll now</Button></Link>
            <Link to="/journeys" className="flex-1"><Button variant="outline" className="w-full">Journeys</Button></Link>
          </div>
        </div>
      </section>

      <div className="pb-24" />
      <BottomNav streak={streak} />
    </main>
  );
};

export default Recap;
