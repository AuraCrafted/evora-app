import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Dice } from "@/components/Dice";
import { SwipeToRoll } from "@/components/SwipeToRoll";
import { SuggestionCard } from "@/components/SuggestionCard";
import { UpgradeDialog } from "@/components/UpgradeDialog";
import { MilestoneDialog } from "@/components/MilestoneDialog";
import { CategoryTabs } from "@/components/CategoryTabs";
import { TaskTimer } from "@/components/TaskTimer";
import { BottomNav } from "@/components/BottomNav";
import { CustomSuggestionsDialog } from "@/components/CustomSuggestionsDialog";
import { AdDialog } from "@/components/AdDialog";
import { EnergySelector } from "@/components/EnergySelector";
import { Button } from "@/components/ui/button";
import { useSpins } from "@/hooks/useSpins";
import { useEnergy } from "@/hooks/useEnergy";
import { useEnergyTaste } from "@/hooks/useEnergyTaste";
import { useCustomSuggestions } from "@/hooks/useCustomSuggestions";
import { usePreferences } from "@/hooks/usePreferences";
import { useTaskFeedback, type FeedbackKind } from "@/hooks/useTaskFeedback";
import { suggestions, Suggestion, Category, getMeta } from "@/data/suggestions";
import { Sparkles, Infinity as InfinityIcon, Plus, Zap, ArrowLeft } from "lucide-react";
import { sfx } from "@/lib/feedback";
import { celebrateAccept, celebrateMilestone } from "@/lib/confetti";
import { contextFilter, currentTimeOfDay, timeOfDayLabel } from "@/lib/context";
import { pickRanked } from "@/lib/ranker";
import { supabase } from "@/integrations/supabase/client";

const MILESTONES = [3, 7, 14, 30] as const;
const ROLL_DURATION = 1100;
const AI_TASKS_KEY = "evora.aiTasks.v1";
const AI_FEEDBACK_THRESHOLD = 10;

function loadAiTasks(): Suggestion[] {
  try {
    const raw = localStorage.getItem(AI_TASKS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, 30) : [];
  } catch {
    return [];
  }
}

function saveAiTasks(t: Suggestion[]) {
  try {
    localStorage.setItem(AI_TASKS_KEY, JSON.stringify(t.slice(0, 30)));
  } catch {
    /* noop */
  }
}

function formatTimeLeft(ms: number): string {
  if (ms <= 0) return "soon";
  const hours = Math.floor(ms / (60 * 60 * 1000));
  const mins = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

const Roll = () => {
  const navigate = useNavigate();
  const {
    used,
    total,
    remaining,
    canSpin,
    isPro,
    streak,
    nextResetMs,
    recentIds,
    recordSpin,
    recordDecision,
    grantBonusSpin,
  } = useSpins();
  const { energy } = useEnergy();
  const { tasteAvailable, consumeTaste } = useEnergyTaste();
  const energyAware = isPro || tasteAvailable;
  const { items: customSuggestions } = useCustomSuggestions();
  const { prefs } = usePreferences();
  const { feedback, record: recordFeedback } = useTaskFeedback();
  const [aiTasks, setAiTasks] = useState<Suggestion[]>(() => loadAiTasks());
  const aiFetchingRef = useRef(false);
  const [current, setCurrent] = useState<Suggestion | null>(null);
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(null);
  const [rolling, setRolling] = useState(false);
  const [face, setFace] = useState(1);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [hasRerolled, setHasRerolled] = useState(false);
  const [category, setCategory] = useState<Category>("any");
  const [milestone, setMilestone] = useState<number | null>(null);
  const [showCustomDialog, setShowCustomDialog] = useState(false);
  const [showAd, setShowAd] = useState(false);
  const [showRewardedAd, setShowRewardedAd] = useState(false);
  const [autoRollAfterReward, setAutoRollAfterReward] = useState(false);
  const [quickStart, setQuickStart] = useState(false);
  const [activeTask, setActiveTask] = useState<Suggestion | null>(null);
  const prevStreakRef = useRef(streak);
  const tickRef = useRef<number | null>(null);

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

  const tod = currentTimeOfDay();

  const basePool = useMemo(() => {
    if (category === "custom") return customSuggestions;
    if (category === "any") return [...suggestions, ...customSuggestions, ...aiTasks];
    return [...suggestions, ...aiTasks].filter((s) => s.category === category);
  }, [category, customSuggestions, aiTasks]);

  const filteredPool = useMemo(() => {
    return contextFilter(basePool, {
      useTimeOfDay: isPro,
      energy: energyAware ? energy : undefined,
      quickStart,
    });
  }, [basePool, isPro, energyAware, energy, quickStart]);

  // Fetch AI-personalized tasks once the user has given enough feedback.
  useEffect(() => {
    if (aiFetchingRef.current) return;
    if (!prefs.completedAt) return;
    if (feedback.count < AI_FEEDBACK_THRESHOLD) return;
    // Refresh when we have fewer than 6 cached or the cache is older than a day.
    const last = Number(localStorage.getItem("evora.aiTasks.ts") || 0);
    if (aiTasks.length >= 6 && Date.now() - last < 24 * 60 * 60 * 1000) return;
    aiFetchingRef.current = true;
    supabase.functions
      .invoke("generate-task", {
        body: { prefs, energy, recentTitles: recentIds.slice(0, 8) },
      })
      .then(({ data, error }) => {
        if (error || !data?.tasks) return;
        const next = [...data.tasks, ...aiTasks].slice(0, 30);
        setAiTasks(next);
        saveAiTasks(next);
        localStorage.setItem("evora.aiTasks.ts", String(Date.now()));
      })
      .catch(() => {})
      .finally(() => {
        aiFetchingRef.current = false;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefs.completedAt, feedback.count]);

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
      const next =
        pickRanked(filteredPool, {
          energy: energyAware ? energy : undefined,
          prefs,
          feedback,
          recentIds,
          excludeId,
        }) ?? filteredPool[Math.floor(Math.random() * filteredPool.length)];
      setFace(Math.floor(Math.random() * 6) + 1);
      setCurrent(next);
      setRolling(false);
      sfx.rollLand();
      const entryId = recordSpin(next);
      setCurrentEntryId(entryId);
      if (!isPro) {
        if (tasteAvailable) consumeTaste();
        const spinsAfter = used + 1;
        if (spinsAfter > 0 && spinsAfter % 3 === 0) {
          window.setTimeout(() => setShowAd(true), 600);
        }
      }
    }, ROLL_DURATION);
  };

  const handleRoll = () => {
    sfx.tap();
    if (filteredPool.length === 0) {
      setShowCustomDialog(true);
      return;
    }
    if (!canSpin) {
      // Free user out of rolls → offer rewarded ad (with upgrade as alt).
      if (!isPro) {
        setAutoRollAfterReward(true);
        setShowRewardedAd(true);
      } else {
        setShowUpgrade(true);
      }
      return;
    }
    setHasRerolled(false);
    triggerRoll();
  };

  const handleRewardEarned = () => {
    grantBonusSpin();
  };

  // After a bonus roll is granted and the rewarded dialog closes, auto-roll.
  useEffect(() => {
    if (showRewardedAd) return;
    if (!autoRollAfterReward) return;
    setAutoRollAfterReward(false);
    if (canSpin && filteredPool.length > 0) {
      setHasRerolled(false);
      triggerRoll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showRewardedAd]);


  const handleTimerComplete = () => {
    celebrateAccept();
    sfx.celebrate();
    setActiveTask(null);
  };

  const handleTimerCancel = () => {
    setActiveTask(null);
  };

  const handleFeedback = (kind: FeedbackKind) => {
    if (!current) return;
    const meta = getMeta(current);
    const tags = [...current.tags, current.category, meta.type, ...meta.goals];
    recordFeedback(current.id, tags, kind);

    if (kind === "did") {
      sfx.accept();
      if (currentEntryId) recordDecision(currentEntryId, true);
      setActiveTask(current);
      setCurrent(null);
      setCurrentEntryId(null);
      setHasRerolled(false);
      return;
    }

    if (kind === "later") {
      // Dismiss, no reroll, doesn't penalize streak.
      sfx.tap();
      setCurrent(null);
      setCurrentEntryId(null);
      setHasRerolled(false);
      return;
    }

    // dislike or more → reroll if allowed
    sfx.reject();
    if (currentEntryId) recordDecision(currentEntryId, kind === "dislike" ? false : null);
    if ((hasRerolled && !isPro) || !canSpin) {
      if (!canSpin) {
        if (!isPro) {
          setAutoRollAfterReward(false);
          setShowRewardedAd(true);
        } else {
          setShowUpgrade(true);
        }
      }
      return;
    }
    setHasRerolled(true);
    triggerRoll(current.id);
  };

  const handleUpgrade = () => {
    sfx.tap();
    setShowUpgrade(false);
    navigate("/plans");
  };

  const usageDots = useMemo(() => Array.from({ length: Math.min(total, 10) }), [total]);

  return (
    <main className="min-h-screen flex flex-col">
      <header className="px-5 pt-6 pb-3 flex items-center justify-between max-w-2xl mx-auto w-full">
        <Link
          to="/"
          onClick={() => sfx.tap()}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Back to home"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="font-display text-sm font-medium">Home</span>
        </Link>

        <div className="flex items-center gap-2">
          {isPro ? (
            <span className="inline-flex items-center gap-1.5 rounded-full gradient-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
              <InfinityIcon className="h-3.5 w-3.5" /> Pro
            </span>
          ) : (
            <div
              className="flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 soft-shadow"
              aria-label={`${remaining} of ${total} rolls left today`}
            >
              <span className="text-[11px] font-medium text-muted-foreground">
                {remaining}/{total} today
              </span>
            </div>
          )}
        </div>
      </header>

      {/* Context badge */}
      {isPro && !current && !rolling && !activeTask && (
        <div className="max-w-2xl mx-auto w-full px-5 mb-2">
          <div className="text-center text-[11px] text-muted-foreground">
            Filtering for <span className="font-medium text-foreground">{timeOfDayLabel[tod].toLowerCase()}</span>
            {" · "}
            <Link to="/" className="underline-offset-2 hover:underline">change energy</Link>
          </div>
        </div>
      )}

      {/* Category tabs */}
      <div className="max-w-2xl mx-auto w-full">
        <CategoryTabs
          value={category}
          onChange={setCategory}
          lockedCategories={isPro ? [] : ["custom"]}
          onLockedClick={() => setShowUpgrade(true)}
        />
      </div>

      {/* Quick start toggle (Weekly+) */}
      {!current && !rolling && !activeTask && (
        <div className="max-w-2xl mx-auto w-full px-5 mt-3">
          <button
            onClick={() => {
              if (!isPro) {
                setShowUpgrade(true);
                return;
              }
              sfx.tap();
              setQuickStart((q) => !q);
            }}
            className={`w-full rounded-2xl px-4 py-2.5 text-sm font-medium transition-all flex items-center justify-center gap-2 ${
              quickStart && isPro
                ? "gradient-primary text-primary-foreground soft-shadow"
                : "bg-card text-muted-foreground border border-border hover:text-foreground"
            }`}
          >
            <Zap className="h-4 w-4" />
            Quick Start Mode
            {quickStart && isPro && <span className="text-[10px] opacity-80">· low effort only</span>}
            {!isPro && <span className="text-[10px] opacity-70">· Weekly+</span>}
          </button>
        </div>
      )}

      <section className="flex-1 flex flex-col items-center justify-center px-5 py-4 max-w-2xl mx-auto w-full">
        {!current && !rolling && !activeTask && (
          <div className="text-center mb-6 animate-fade-in-up">
            <h1 className="font-display text-2xl sm:text-3xl font-semibold leading-tight tracking-tight text-foreground">
              {category === "custom" ? (
                <>Roll one of <span className="bg-clip-text text-transparent bg-gradient-to-r from-[hsl(14_80%_55%)] to-[hsl(22_90%_65%)]">your own.</span></>
              ) : (
                <>Try this <span className="bg-clip-text text-transparent bg-gradient-to-r from-[hsl(14_80%_55%)] to-[hsl(22_90%_65%)]">right now.</span></>
              )}
            </h1>
            <p className="mt-3 text-muted-foreground text-[14px] max-w-sm mx-auto">
              {category === "custom"
                ? `${customSuggestions.length} saved.`
                : "Small action. Two minutes or twenty. Your call."}
            </p>
          </div>
        )}

        {activeTask ? (
          <TaskTimer
            suggestion={activeTask}
            onComplete={handleTimerComplete}
            onCancel={handleTimerCancel}
          />
        ) : current && !rolling ? (
          <SuggestionCard
            suggestion={current}
            onAccept={handleAccept}
            onReject={handleReject}
            canReroll={(isPro || !hasRerolled) && canSpin}
          />
        ) : (
          <div className="flex flex-col items-center gap-7 w-full">
            <SwipeToRoll rolling={rolling} onRoll={handleRoll}>
              <Dice rolling={rolling} face={face} />
            </SwipeToRoll>
            <p
              className="text-sm font-display font-medium text-muted-foreground select-none"
              aria-live="polite"
            >
              {rolling
                ? "Rolling…"
                : canSpin
                ? "Swipe to Roll"
                : "Swipe to watch ad for +1 roll"}
            </p>
            {category === "custom" && (
              <div className="flex flex-col items-center gap-2">
                {customSuggestions.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center max-w-xs">
                    No custom evoras yet, rolling will help you add your first.
                  </p>
                )}
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
                  {customSuggestions.length === 0 ? "Add your first evora" : "Manage your evoras"}
                </Button>
              </div>
            )}
            {!isPro && (
              <p className="text-xs text-muted-foreground text-center max-w-xs">
                {remaining > 0 ? (
                  <>
                    {remaining} roll{remaining === 1 ? "" : "s"} left today.
                    <br />
                    Resets in {formatTimeLeft(nextResetMs)}.
                  </>
                ) : (
                  <>You've used all {total} rolls today. Watch a short ad for +1 roll, or upgrade for unlimited.</>
                )}
              </p>
            )}
          </div>
        )}
      </section>

      <div className="pb-24" />
      <BottomNav streak={streak} />

      <UpgradeDialog open={showUpgrade} onOpenChange={setShowUpgrade} onUpgrade={handleUpgrade} />
      <MilestoneDialog
        open={milestone !== null}
        onOpenChange={(v) => !v && setMilestone(null)}
        days={milestone ?? 0}
      />
      <CustomSuggestionsDialog open={showCustomDialog} onOpenChange={setShowCustomDialog} />
      <AdDialog open={showAd} onOpenChange={setShowAd} onUpgrade={handleUpgrade} />
      <AdDialog
        mode="rewarded"
        open={showRewardedAd}
        onOpenChange={setShowRewardedAd}
        onUpgrade={handleUpgrade}
        onReward={handleRewardEarned}
      />
    </main>
  );
};

export default Roll;
