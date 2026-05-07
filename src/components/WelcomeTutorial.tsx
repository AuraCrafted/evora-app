import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, ArrowLeft, X, Gift } from "lucide-react";
import { sfx } from "@/lib/feedback";
import { useSpins } from "@/hooks/useSpins";
import { toast } from "@/components/ui/sonner";

const STORAGE_KEY = "nudge:tutorial-seen-v1";

type Phase = "welcome" | "tutorial" | "done";

const steps = [
  {
    title: "Pick your energy",
    body: "On the home screen, tell Nudge how you're feeling. We'll match suggestions to your vibe (Monthly+).",
  },
  {
    title: "Swipe to roll",
    body: "On the Roll screen, swipe the dice with your finger. Nudge picks one small action that fits right now.",
  },
  {
    title: "Accept or skip",
    body: "Like it? Tap Accept and do it. Not feeling it? Skip to reroll. Free plan gets 4 rolls a day.",
  },
  {
    title: "Build a streak",
    body: "Every accepted nudge grows your streak. Hit milestones at 3, 7, 14, and 30 days.",
  },
  {
    title: "Go further with Plans",
    body: "Upgrade for unlimited rolls, unlimited skips, custom nudges, and right-time matching.",
  },
];

export const WelcomeTutorial = () => {
  const [phase, setPhase] = useState<Phase>("done");
  const [step, setStep] = useState(0);
  const { grantBonusSpin } = useSpins();

  useEffect(() => {
    try {
      const seen = localStorage.getItem(STORAGE_KEY);
      if (!seen) setPhase("welcome");
    } catch {
      // ignore
    }
  }, []);

  const finish = (opts?: { completed?: boolean }) => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
    if (opts?.completed) {
      grantBonusSpin();
      sfx.celebrate();
      toast("🎁 Bonus roll unlocked!", {
        description: "Thanks for taking the tour — enjoy a free roll on us.",
      });
    }
    setPhase("done");
  };

  if (phase === "done") return null;

  if (phase === "welcome") {
    return (
      <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm animate-fade-in-up">
        <div className="relative h-full w-full flex items-center justify-center px-6">
          {/* Top-left: Start tutorial */}
          <button
            onClick={() => {
              sfx.tap();
              setStep(0);
              setPhase("tutorial");
            }}
            className="absolute top-6 left-6 rounded-full gradient-primary text-primary-foreground soft-shadow px-5 py-3 text-sm font-semibold inline-flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-transform"
          >
            <Sparkles className="h-4 w-4" />
            Start tutorial
          </button>

          {/* Bottom-right: No thanks */}
          <button
            onClick={() => {
              sfx.tap();
              finish();
            }}
            className="absolute bottom-6 right-6 rounded-full bg-card border border-border text-foreground soft-shadow px-5 py-3 text-sm font-medium inline-flex items-center gap-2 hover:bg-accent transition-colors"
          >
            No thanks
            <ArrowRight className="h-4 w-4" />
          </button>

          {/* Center prompt */}
          <div className="text-center max-w-md animate-fade-in-up">
            <div className="mx-auto mb-5 h-14 w-14 rounded-3xl gradient-primary flex items-center justify-center soft-shadow">
              <Sparkles className="h-6 w-6 text-primary-foreground" />
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight">
              Welcome!{" "}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-[hsl(14_80%_55%)] to-[hsl(22_90%_65%)]">
                Would you like a tutorial to get familiar?
              </span>
            </h2>
            <p className="mt-3 text-muted-foreground text-sm">
              It only takes a moment.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Tutorial phase
  const isLast = step === steps.length - 1;
  const current = steps[step];

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex items-center justify-center px-5 animate-fade-in-up">
      <button
        onClick={() => {
          sfx.tap();
          finish();
        }}
        className="absolute top-5 right-5 h-9 w-9 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Skip tutorial"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="w-full max-w-md rounded-3xl bg-card p-6 soft-shadow">
        <div className="flex items-center gap-1.5 mb-4">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i <= step ? "gradient-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>

        <div className="text-[11px] uppercase tracking-wide font-medium text-muted-foreground">
          Step {step + 1} of {steps.length}
        </div>
        <h3 className="font-display text-2xl font-semibold mt-1.5 tracking-tight">
          {current.title}
        </h3>
        <p className="mt-3 text-foreground/80 text-[15px] leading-relaxed">
          {current.body}
        </p>

        <div className="mt-6 flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              sfx.tap();
              if (step === 0) finish();
              else setStep((s) => s - 1);
            }}
          >
            <ArrowLeft className="h-4 w-4" />
            {step === 0 ? "Skip" : "Back"}
          </Button>

          <Button
            variant="hero"
            size="lg"
            onClick={() => {
              sfx.tap();
              if (isLast) finish();
              else setStep((s) => s + 1);
            }}
          >
            {isLast ? "Get started" : "Next"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
