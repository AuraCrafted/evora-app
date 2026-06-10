import { Link } from "react-router-dom";
import { Sparkles, ArrowRight, Flame, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/BottomNav";
import { EnergySelector } from "@/components/EnergySelector";
import { InstallBanner } from "@/components/InstallBanner";
import { useSpins } from "@/hooks/useSpins";
import { useEnergy } from "@/hooks/useEnergy";
import { useEnergyTaste } from "@/hooks/useEnergyTaste";
import { currentTimeOfDay, timeOfDayLabel } from "@/lib/context";
import { sfx } from "@/lib/feedback";

const greetings: Record<string, string> = {
  morning: "Good morning.",
  midday: "Hey there.",
  evening: "Good evening.",
  night: "Up late?",
};

const subtitles: Record<string, string> = {
  morning: "A small action sets the tone.",
  midday: "Pick one thing. Then keep going.",
  evening: "Wind down with something small.",
  night: "Something gentle. Nothing heavy.",
};

const Home = () => {
  const { streak, completed, remaining, total, isPro, hasNudgedToday } = useSpins();
  const { energy, setEnergy } = useEnergy();
  const { tasteAvailable } = useEnergyTaste();
  const sliderUnlocked = isPro || tasteAvailable;
  const tod = currentTimeOfDay();

  return (
    <main className="min-h-screen flex flex-col">
      <header className="px-5 pt-6 pb-3 max-w-2xl mx-auto w-full">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-2xl gradient-primary flex items-center justify-center soft-shadow">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-semibold">Nudge</span>
          </div>
          <div className="text-[11px] font-medium text-muted-foreground rounded-full bg-card px-3 py-1.5 soft-shadow">
            {timeOfDayLabel[tod]}
          </div>
        </div>
      </header>

      <InstallBanner />

      <section className="flex-1 flex flex-col px-5 py-4 max-w-2xl mx-auto w-full">
        {/* Welcome */}
        <div className="mt-2 mb-6 animate-fade-in-up">
          <h1 className="font-display text-3xl sm:text-4xl font-semibold leading-tight tracking-tight">
            {greetings[tod]}
            <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[hsl(14_80%_55%)] to-[hsl(22_90%_65%)]">
              {subtitles[tod]}
            </span>
          </h1>
          <p className="mt-3 text-muted-foreground text-[15px] max-w-md whitespace-pre-line">
            When you don't know what to do,{"\n"}Nudge picks something small that
            actually fits right now.
          </p>
        </div>

        {/* Energy selector */}
        <div className="rounded-3xl bg-card p-5 soft-shadow mb-4">
          <EnergySelector
            value={energy}
            onChange={setEnergy}
            locked={!sliderUnlocked}
            onLockedClick={() => sfx.tap()}
          />
          {!isPro && (
            <p className="text-[11px] text-muted-foreground text-center mt-3">
              {tasteAvailable ? (
                <>Try the energy slider! &nbsp;{"\n\n\n"}</>
              ) : (
                <>You've used today's free taste. &nbsp;{"\n\n\n"}</>
              )}
              <Link to="/plans" className="underline-offset-2 hover:underline">
                See Monthly To Get full Access →
              </Link>
            </p>
          )}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="rounded-2xl bg-card p-3 soft-shadow text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground text-[10px] uppercase tracking-wide font-medium">
              <Flame className="h-3 w-3" /> Streak
            </div>
            <div className="font-display text-2xl font-semibold mt-1">{streak}</div>
          </div>
          <div className="rounded-2xl bg-card p-3 soft-shadow text-center">
            <div className="text-muted-foreground text-[10px] uppercase tracking-wide font-medium">
              Done
            </div>
            <div className="font-display text-2xl font-semibold mt-1">{completed}</div>
          </div>
          <div className="rounded-2xl bg-card p-3 soft-shadow text-center">
            <div className="text-muted-foreground text-[10px] uppercase tracking-wide font-medium">
              Today
            </div>
            <div className="font-display text-2xl font-semibold mt-1">
              {isPro ? "∞" : `${remaining}/${total}`}
            </div>
          </div>
        </div>

        {/* Primary CTA */}
        <Link to="/roll" onClick={() => sfx.tap()} className="block">
          <Button variant="hero" size="xl" className="w-full">
            <Sparkles className="h-5 w-5" />
            {hasNudgedToday ? "Roll another" : "Roll something small"}
            <ArrowRight className="h-5 w-5" />
          </Button>
        </Link>

        <p className="text-center text-xs text-muted-foreground mt-3">
          {hasNudgedToday
            ? "Nice — you've already moved today."
            : "Two minutes is enough. Promise."}
        </p>

        {/* How it works */}
        <div className="mt-8 rounded-3xl bg-card p-5 soft-shadow">
          <h2 className="font-display text-base font-semibold mb-3">How Nudge works</h2>
          <ul className="space-y-2.5">
            {[
              "Tell us your energy (optional).",
              "Tap roll — we pick something small that fits.",
              "Do it, or skip and try another.",
            ].map((step, i) => (
              <li key={step} className="flex items-start gap-3 text-sm">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full gradient-primary text-primary-foreground text-[10px] font-semibold">
                  {i + 1}
                </span>
                <span className="text-foreground/90">{step}</span>
              </li>
            ))}
          </ul>
        </div>

        {!isPro && (
          <Link to="/plans" onClick={() => sfx.tap()} className="block mt-4">
            <div className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/5 to-transparent p-4 soft-shadow active:scale-[0.99] transition-transform">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl gradient-primary flex items-center justify-center shrink-0">
                  <Check className="h-5 w-5 text-primary-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">Right-Time Rolls</div>
                  <div className="text-xs text-muted-foreground">
                    Tasks that match your time + energy. Monthly+.
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>
            </div>
          </Link>
        )}
      </section>

      <div className="pb-24" />
      <BottomNav streak={streak} />
    </main>
  );
};

export default Home;
