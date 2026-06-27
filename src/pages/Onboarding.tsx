import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Check } from "lucide-react";
import { readPreferences, usePreferences, type Interest, type Avoid } from "@/hooks/usePreferences";
import type { Goal, TaskType } from "@/data/suggestions";
import { sfx } from "@/lib/feedback";
import { cn } from "@/lib/utils";

interface ChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
}
const Chip = ({ label, active, onClick }: ChipProps) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "px-3.5 py-2 rounded-full text-sm font-medium border transition-all",
      active
        ? "gradient-primary text-primary-foreground border-transparent soft-shadow"
        : "bg-card text-foreground border-border/60 hover:border-primary/40",
    )}
  >
    {active && <Check className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />}
    {label}
  </button>
);

const INTERESTS: { id: Interest; label: string }[] = [
  { id: "fitness", label: "Fitness" },
  { id: "mindfulness", label: "Mindfulness" },
  { id: "creativity", label: "Creativity" },
  { id: "learning", label: "Learning" },
  { id: "productivity", label: "Productivity" },
  { id: "connection", label: "Connection" },
  { id: "outdoors", label: "Outdoors" },
  { id: "home", label: "Home life" },
];

const GOALS: { id: Goal; label: string }[] = [
  { id: "wellbeing", label: "Feel better" },
  { id: "productivity", label: "Get things done" },
  { id: "fitness", label: "Move more" },
  { id: "creativity", label: "Make things" },
  { id: "connection", label: "Connect with people" },
  { id: "mindfulness", label: "Be present" },
  { id: "learning", label: "Keep learning" },
];

const TYPES: { id: TaskType; label: string }[] = [
  { id: "physical", label: "Physical" },
  { id: "mental", label: "Mental" },
  { id: "creative", label: "Creative" },
  { id: "social", label: "Social" },
  { id: "admin", label: "Admin" },
];

const AVOIDS: { id: Avoid; label: string }[] = [
  { id: "social", label: "Talking to people" },
  { id: "outdoor", label: "Going outside" },
  { id: "chores", label: "Cleaning / chores" },
  { id: "intense", label: "Anything intense" },
  { id: "screens", label: "More screen time" },
  { id: "loud", label: "Loud / high energy" },
];

const STEPS = 4;

const Onboarding = () => {
  const navigate = useNavigate();
  const { prefs, update, complete } = usePreferences();
  const [step, setStep] = useState(0);

  const toggle = <T extends string>(list: T[], v: T): T[] =>
    list.includes(v) ? list.filter((x) => x !== v) : [...list, v];

  const next = () => {
    if (step === STEPS - 1) {
      console.log("[ONBOARDING DEBUG] Start button clicked");
    }
    sfx.tap();
    if (step === STEPS - 1) {
      const saved = complete();
      sfx.onboarding();
      console.log("[ONBOARDING DEBUG] completedAt value", saved.completedAt);
      console.log("[ONBOARDING DEBUG] Navigation started", "/");
      navigate("/", { replace: true });
      window.requestAnimationFrame(() => {
        console.log("[ONBOARDING DEBUG] Navigation finished", {
          hash: window.location.hash,
          completedAt: readPreferences().completedAt,
        });
      });
    } else {
      setStep((s) => s + 1);
    }
  };

  const skip = () => {
    sfx.tap();
    const saved = complete();
    console.log("[ONBOARDING DEBUG] completedAt value", saved.completedAt);
    console.log("[ONBOARDING DEBUG] Navigation started", "/");
    navigate("/", { replace: true });
    window.requestAnimationFrame(() => {
      console.log("[ONBOARDING DEBUG] Navigation finished", {
        hash: window.location.hash,
        completedAt: readPreferences().completedAt,
      });
    });
  };

  return (
    <main className="min-h-screen flex flex-col pt-safe pb-safe px-5 max-w-2xl mx-auto w-full">
      <header className="pt-8 pb-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-9 w-9 rounded-2xl gradient-primary flex items-center justify-center soft-shadow">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-display text-sm font-medium text-muted-foreground">
            Step {step + 1} of {STEPS}
          </span>
        </div>
        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
          <div
            className="h-full gradient-primary transition-all"
            style={{ width: `${((step + 1) / STEPS) * 100}%` }}
          />
        </div>
      </header>

      <section className="flex-1">
        {step === 0 && (
          <>
            <h1 className="font-display text-2xl font-semibold mb-2">What pulls you in?</h1>
            <p className="text-muted-foreground text-sm mb-6">
              Pick anything that resonates. We use this to tailor your rolls.
            </p>
            <div className="flex flex-wrap gap-2">
              {INTERESTS.map((i) => (
                <Chip
                  key={i.id}
                  label={i.label}
                  active={prefs.interests.includes(i.id)}
                  onClick={() => update({ interests: toggle(prefs.interests, i.id) })}
                />
              ))}
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h1 className="font-display text-2xl font-semibold mb-2">What are you working on?</h1>
            <p className="text-muted-foreground text-sm mb-6">
              Your goals shape which kinds of tasks show up most.
            </p>
            <div className="flex flex-wrap gap-2">
              {GOALS.map((g) => (
                <Chip
                  key={g.id}
                  label={g.label}
                  active={prefs.goals.includes(g.id)}
                  onClick={() => update({ goals: toggle(prefs.goals, g.id) })}
                />
              ))}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="font-display text-2xl font-semibold mb-2">What feels good?</h1>
            <p className="text-muted-foreground text-sm mb-6">
              Choose the task styles you usually enjoy.
            </p>
            <div className="flex flex-wrap gap-2">
              {TYPES.map((t) => (
                <Chip
                  key={t.id}
                  label={t.label}
                  active={prefs.preferredTypes.includes(t.id)}
                  onClick={() => update({ preferredTypes: toggle(prefs.preferredTypes, t.id) })}
                />
              ))}
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h1 className="font-display text-2xl font-semibold mb-2">Anything to avoid?</h1>
            <p className="text-muted-foreground text-sm mb-6">
              We'll skip tasks that lean into these.
            </p>
            <div className="flex flex-wrap gap-2">
              {AVOIDS.map((a) => (
                <Chip
                  key={a.id}
                  label={a.label}
                  active={prefs.avoid.includes(a.id)}
                  onClick={() => update({ avoid: toggle(prefs.avoid, a.id) })}
                />
              ))}
            </div>
          </>
        )}
      </section>

      <footer className="pt-6 pb-8 flex items-center gap-3">
        <Button variant="ghost" onClick={skip} className="text-muted-foreground">
          Skip
        </Button>
        <Button onClick={next} variant="hero" className="flex-1">
          {step === STEPS - 1 ? "Start rolling" : "Continue"}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </footer>
    </main>
  );
};

export default Onboarding;
