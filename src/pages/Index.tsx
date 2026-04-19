import { useMemo, useState } from "react";
import { Dice } from "@/components/Dice";
import { SuggestionCard } from "@/components/SuggestionCard";
import { UpgradeDialog } from "@/components/UpgradeDialog";
import { Button } from "@/components/ui/button";
import { useSpins } from "@/hooks/useSpins";
import { suggestions, Suggestion } from "@/data/suggestions";
import { Sparkles, Infinity as InfinityIcon } from "lucide-react";

const ROLL_DURATION = 1100;

function pickRandom<T>(arr: T[], excludeId?: string): T {
  const pool = excludeId ? arr.filter((s: any) => s.id !== excludeId) : arr;
  return pool[Math.floor(Math.random() * pool.length)];
}

function formatTimeLeft(ms: number): string {
  if (ms <= 0) return "soon";
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  if (days > 0) return `${days}d ${hours}h`;
  const mins = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  return `${hours}h ${mins}m`;
}

const Index = () => {
  const { used, total, remaining, canSpin, isPro, nextResetMs, recordSpin, recordDecision, upgrade } = useSpins();
  const [current, setCurrent] = useState<Suggestion | null>(null);
  const [rolling, setRolling] = useState(false);
  const [face, setFace] = useState(1);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [hasRerolled, setHasRerolled] = useState(false);

  const usageDots = useMemo(() => Array.from({ length: total }), [total]);

  const triggerRoll = (excludeId?: string) => {
    setRolling(true);
    // animate face changes during roll
    const interval = setInterval(() => {
      setFace(Math.floor(Math.random() * 6) + 1);
    }, 120);

    setTimeout(() => {
      clearInterval(interval);
      const next = pickRandom(suggestions, excludeId);
      setFace(Math.floor(Math.random() * 6) + 1);
      setCurrent(next);
      setRolling(false);
      recordSpin(next.id);
    }, ROLL_DURATION);
  };

  const handleRoll = () => {
    if (!canSpin) {
      setShowUpgrade(true);
      return;
    }
    setHasRerolled(false);
    triggerRoll();
  };

  const handleAccept = () => {
    if (current) recordDecision(current.id, true);
    setCurrent(null);
    setHasRerolled(false);
  };

  const handleReject = () => {
    if (!current) return;
    recordDecision(current.id, false);
    if (hasRerolled || !canSpin) {
      if (!canSpin) setShowUpgrade(true);
      return;
    }
    setHasRerolled(true);
    triggerRoll(current.id);
  };

  return (
    <main className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="px-5 pt-6 pb-2 flex items-center justify-between max-w-2xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-2xl gradient-primary flex items-center justify-center soft-shadow">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-semibold">Nudge</span>
        </div>

        <div className="flex items-center gap-2">
          {isPro ? (
            <span className="inline-flex items-center gap-1.5 rounded-full gradient-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
              <InfinityIcon className="h-3.5 w-3.5" /> Pro
            </span>
          ) : (
            <div
              className="flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 soft-shadow"
              aria-label={`${remaining} of ${total} rolls left this week`}
            >
              {usageDots.map((_, i) => (
                <span
                  key={i}
                  className={`h-2 w-2 rounded-full transition-colors ${
                    i < (total - used) ? "gradient-primary" : "bg-muted"
                  }`}
                />
              ))}
              <span className="text-[11px] font-medium text-muted-foreground ml-1">
                {remaining}/{total}
              </span>
            </div>
          )}
        </div>
      </header>

      {/* Main content */}
      <section className="flex-1 flex flex-col items-center justify-center px-5 py-6 max-w-2xl mx-auto w-full">
        {!current && !rolling && (
          <div className="text-center mb-8 animate-fade-in-up">
            <h1 className="font-display text-3xl sm:text-4xl font-semibold leading-tight tracking-tight text-foreground">
              Stuck? Let the dice
              <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-[hsl(14_80%_55%)] to-[hsl(22_90%_65%)]">
                pick something kind.
              </span>
            </h1>
            <p className="mt-3 text-muted-foreground text-[15px] max-w-sm mx-auto">
              One small action. Two minutes or twenty. You decide if you do it.
            </p>
          </div>
        )}

        {current && !rolling ? (
          <SuggestionCard
            suggestion={current}
            onAccept={handleAccept}
            onReject={handleReject}
            canReroll={!hasRerolled && canSpin}
          />
        ) : (
          <div className="flex flex-col items-center gap-8 w-full">
            <Dice rolling={rolling} face={face} />
            <Button
              onClick={handleRoll}
              variant="hero"
              size="xl"
              disabled={rolling}
              className="min-w-[220px]"
            >
              {rolling ? "Rolling…" : canSpin ? "Roll the dice" : "Get more rolls"}
            </Button>
            {!isPro && (
              <p className="text-xs text-muted-foreground text-center max-w-xs">
                {remaining > 0 ? (
                  <>
                    {remaining} free roll{remaining === 1 ? "" : "s"} left this week.
                    <br />
                    Resets in {formatTimeLeft(nextResetMs)}.
                  </>
                ) : (
                  <>You've used all 3 free rolls. Upgrade for unlimited.</>
                )}
              </p>
            )}
          </div>
        )}
      </section>

      <footer className="px-5 pb-6 pt-2 text-center max-w-2xl mx-auto w-full">
        <p className="text-[11px] text-muted-foreground">
          Be gentle with yourself. Tiny steps count.
        </p>
      </footer>

      <UpgradeDialog open={showUpgrade} onOpenChange={setShowUpgrade} onUpgrade={upgrade} />
    </main>
  );
};

export default Index;
