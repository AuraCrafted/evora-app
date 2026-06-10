import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft, X } from "lucide-react";
import { sfx } from "@/lib/feedback";
import { useSpins } from "@/hooks/useSpins";
import { toast } from "@/components/ui/sonner";

const STORAGE_KEY = "nudge:tutorial-seen-v1";

type Phase = "tutorial" | "done";

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
    body: "Upgrade for unlimited rolls, unlimited skips, custom nudges, and right-time matching. Finish the tour to claim a free bonus roll 🎁",
  },
];

export const WelcomeTutorial = () => {
  const [phase, setPhase] = useState<Phase>("done");
  const [step, setStep] = useState(0);
  const { grantBonusSpin } = useSpins();

  useEffect(() => {
    const check = () => {
      try {
        const seen = localStorage.getItem(STORAGE_KEY);
        const privacyAccepted = localStorage.getItem("nudge:privacy-accepted-v1");
        if (!seen && privacyAccepted) {
          setStep(0);
          setPhase("tutorial");
        }
      } catch {
        // ignore
      }
    };
    check();
    window.addEventListener("privacy-accepted", check);
    return () => window.removeEventListener("privacy-accepted", check);
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
              if (isLast) finish({ completed: true });
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
