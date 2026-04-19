import { useEffect, useMemo, useRef, useState } from "react";
import { Dice } from "@/components/Dice";
import { SuggestionCard } from "@/components/SuggestionCard";
import { UpgradeDialog } from "@/components/UpgradeDialog";
import { MilestoneDialog } from "@/components/MilestoneDialog";
import { InstallBanner } from "@/components/InstallBanner";
import { CategoryTabs } from "@/components/CategoryTabs";
import { BottomNav } from "@/components/BottomNav";
import { CustomSuggestionsDialog } from "@/components/CustomSuggestionsDialog";
import { Button } from "@/components/ui/button";
import { useSpins } from "@/hooks/useSpins";
import { useCustomSuggestions } from "@/hooks/useCustomSuggestions";
import { suggestions, Suggestion, Category, categoryLabels } from "@/data/suggestions";
import { Sparkles, Infinity as InfinityIcon, Plus } from "lucide-react";
import { sfx } from "@/lib/feedback";
import { celebrateAccept, celebrateMilestone } from "@/lib/confetti";

const MILESTONES = [3, 7, 14, 30] as const;

const ROLL_DURATION = 1100;

function pickRandom(pool: Suggestion[], excludeId?: string): Suggestion {
  const filtered = excludeId && pool.length > 1 ? pool.filter((s) => s.id !== excludeId) : pool;
  return filtered[Math.floor(Math.random() * filtered.length)];
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
  const {
    used,
    total,
    remaining,
    canSpin,
    isPro,
    streak,
    nextResetMs,
    recordSpin,
    recordDecision,
    upgrade,
  } = useSpins();
  const { items: customSuggestions } = useCustomSuggestions();
  const [current, setCurrent] = useState<Suggestion | null>(null);
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(null);
  const [rolling, setRolling] = useState(false);
  const [face, setFace] = useState(1);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [hasRerolled, setHasRerolled] = useState(false);
  const [category, setCategory] = useState<Category>("any");
  const [milestone, setMilestone] = useState<number | null>(null);
  const [showCustomDialog, setShowCustomDialog] = useState(false);
  const prevStreakRef = useRef(streak);
  const tickRef = useRef<number | null>(null);

  // Detect when streak crosses a milestone
  useEffect(() => {
    const prev = prevStreakRef.current;
    if (streak > prev) {
      const hit = MILESTONES.find((m) => prev < m && streak >= m);
      if (hit) {
        setMilestone(hit);
        celebrateMilestone();
        sfx.celebrate();
      }
    }
    prevStreakRef.current = streak;
  }, [streak]);

  const usageDots = useMemo(() => Array.from({ length: total }), [total]);

  const filteredPool = useMemo(() => {
    if (category === "custom") return customSuggestions;
    if (category === "any") return [...suggestions, ...customSuggestions];
    return suggestions.filter((s) => s.category === category);
  }, [category, customSuggestions]);

  const triggerRoll = (excludeId?: string) => {
    setRolling(true);
    sfx.rollStart();

    const interval = window.setInterval(() => {
      setFace(Math.floor(Math.random() * 6) + 1);
    }, 110);
    tickRef.current = interval;

    window.setTimeout(() => {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
      const next = pickRandom(filteredPool, excludeId);
      setFace(Math.floor(Math.random() * 6) + 1);
      setCurrent(next);
      setRolling(false);
      sfx.rollLand();
      const entryId = recordSpin(next);
      setCurrentEntryId(entryId);
    }, ROLL_DURATION);
  };

  const handleRoll = () => {
    sfx.tap();
    if (filteredPool.length === 0) {
      setShowCustomDialog(true);
      return;
    }
    if (!canSpin) {
      setShowUpgrade(true);
      return;
    }
    setHasRerolled(false);
    triggerRoll();
  };

  const handleAccept = () => {
    sfx.accept();
    celebrateAccept();
    if (currentEntryId) recordDecision(currentEntryId, true);
    setCurrent(null);
    setCurrentEntryId(null);
    setHasRerolled(false);
  };

  const handleReject = () => {
    if (!current) return;
    sfx.reject();
    if (currentEntryId) recordDecision(currentEntryId, false);
    if (hasRerolled || !canSpin) {
      if (!canSpin) setShowUpgrade(true);
      return;
    }
    setHasRerolled(true);
    triggerRoll(current.id);
  };

  const handleUpgrade = () => {
    sfx.celebrate();
    upgrade();
  };

  return (
    <main className="min-h-screen flex flex-col">
      <header className="px-5 pt-6 pb-3 flex items-center justify-between max-w-2xl mx-auto w-full">
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

      <InstallBanner />

      {/* Category tabs */}
      <div className="max-w-2xl mx-auto w-full">
        <CategoryTabs value={category} onChange={setCategory} />
      </div>

      {/* Main content */}
      <section className="flex-1 flex flex-col items-center justify-center px-5 py-4 max-w-2xl mx-auto w-full">
        {!current && !rolling && (
          <div className="text-center mb-6 animate-fade-in-up">
            <h1 className="font-display text-3xl sm:text-4xl font-semibold leading-tight tracking-tight text-foreground">
              {category === "any" ? (
                <>
                  Stuck? Let the dice
                  <br />
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-[hsl(14_80%_55%)] to-[hsl(22_90%_65%)]">
                    pick something kind.
                  </span>
                </>
              ) : category === "custom" ? (
                <>
                  Roll one of
                  <br />
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-[hsl(14_80%_55%)] to-[hsl(22_90%_65%)]">
                    your own nudges.
                  </span>
                </>
              ) : (
                <>
                  Roll for a
                  <br />
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-[hsl(14_80%_55%)] to-[hsl(22_90%_65%)]">
                    {categoryLabels[category].toLowerCase()} nudge.
                  </span>
                </>
              )}
            </h1>
            <p className="mt-3 text-muted-foreground text-[15px] max-w-sm mx-auto">
              {category === "custom"
                ? `${customSuggestions.length} saved. Add more anytime.`
                : "One small action. Two minutes or twenty. You decide if you do it."}
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
          <div className="flex flex-col items-center gap-7 w-full">
            <Dice rolling={rolling} face={face} />
            {category === "custom" && customSuggestions.length === 0 ? (
              <div className="flex flex-col items-center gap-3">
                <p className="text-sm text-muted-foreground text-center max-w-xs">
                  You haven't saved any custom nudges yet.
                </p>
                <Button
                  onClick={() => {
                    sfx.tap();
                    setShowCustomDialog(true);
                  }}
                  variant="hero"
                  size="xl"
                  className="min-w-[220px]"
                >
                  <Plus className="h-5 w-5" />
                  Add your first
                </Button>
              </div>
            ) : (
              <>
                <Button
                  onClick={handleRoll}
                  variant="hero"
                  size="xl"
                  disabled={rolling}
                  className="min-w-[220px]"
                >
                  {rolling ? "Rolling…" : canSpin ? "Roll the dice" : "Get more rolls"}
                </Button>
                {category === "custom" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      sfx.tap();
                      setShowCustomDialog(true);
                    }}
                    className="text-muted-foreground"
                  >
                    <Plus className="h-4 w-4" />
                    Manage your nudges
                  </Button>
                )}
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
              </>
            )}
          </div>
        )}
      </section>

      <BottomNav streak={streak} />

      <UpgradeDialog open={showUpgrade} onOpenChange={setShowUpgrade} onUpgrade={handleUpgrade} />
      <MilestoneDialog
        open={milestone !== null}
        onOpenChange={(v) => !v && setMilestone(null)}
        days={milestone ?? 0}
      />
      <CustomSuggestionsDialog open={showCustomDialog} onOpenChange={setShowCustomDialog} />
    </main>
  );
};

export default Index;
