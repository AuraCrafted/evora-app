import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/BottomNav";
import { UpgradeDialog } from "@/components/UpgradeDialog";
import { useSpins } from "@/hooks/useSpins";
import { useState } from "react";
import { sfx } from "@/lib/feedback";

interface Plan {
  id: string;
  name: string;
  price: string;
  period: string;
  perDay: string;
  badge?: string;
  highlight?: boolean;
  tagline: string;
  features: string[];
}

const plans: Plan[] = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "forever",
    perDay: "No card needed",
    tagline: "Get unstuck, occasionally.",
    features: [
      "10 rolls per day",
      "🔋 1 energy-aware roll per day (taste it)",
      "Mixed categories",
      "Skip freely",
      "Visual streak",
    ],
  },
  {
    id: "month",
    name: "Monthly",
    price: "$8.99",
    period: "/ month",
    perDay: "$0.30/day",
    badge: "Most useful",
    highlight: true,
    tagline: "Right-Time Rolls — context-aware.",
    features: [
      "Unlimited rolls",
      "Choose your category",
      "Custom nudges",
      "⏰ Time-of-day filtering",
      "🔋 Energy-aware tasks (low / normal / push)",
      "🏷️ Tag your custom nudges",
      "✋ Commit Mode (soft accountability)",
      "📊 Activity patterns",
      "Ad-free",
    ],
  },
  {
    id: "year",
    name: "Yearly",
    price: "$49.99",
    period: "/ year",
    perDay: "$0.14/day",
    badge: "Best value",
    tagline: "A long-term action system.",
    features: [
      "Everything in Monthly",
      "🔥 Personal Action System (your own taxonomy)",
      "🛤️ Guided Paths (slump, focus, less scrolling)",
      "🪞 Reflection layer after tasks",
      "📈 Insights dashboard",
      "Save 54% vs monthly",
    ],
  },
];

const Plans = () => {
  const { isPro, upgrade, streak } = useSpins();
  const [showUpgrade, setShowUpgrade] = useState(false);

  const handleChoose = () => {
    sfx.tap();
    setShowUpgrade(true);
  };

  return (
    <main className="min-h-screen flex flex-col">
      <header className="px-5 pt-6 pb-3 max-w-2xl mx-auto w-full">
        <div className="flex items-center gap-2 mb-6">
          <div className="h-9 w-9 rounded-2xl gradient-primary flex items-center justify-center soft-shadow">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-semibold">Plans</span>
        </div>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight">
          Pick what fits
          <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-[hsl(14_80%_55%)] to-[hsl(22_90%_65%)]">
            right now.
          </span>
        </h1>
        <p className="mt-3 text-muted-foreground text-[15px] max-w-md">
          Start free. Upgrade when randomness stops being enough — cancel anytime.
        </p>

        {isPro && (
          <div className="mt-5 rounded-2xl border border-primary/40 bg-accent/40 px-4 py-3 flex items-center gap-3 soft-shadow">
            <Sparkles className="h-4 w-4 text-primary" />
            <div className="text-sm">
              <span className="font-semibold text-foreground">You're on Pro.</span>{" "}
              <span className="text-muted-foreground">All features below are unlocked.</span>
            </div>
          </div>
        )}
      </header>

      <section className="px-5 pt-4 pb-32 max-w-2xl mx-auto w-full">
        <div className="grid gap-4 sm:grid-cols-2">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-3xl p-5 flex flex-col soft-shadow transition-transform hover:-translate-y-0.5 ${
                plan.highlight
                  ? "bg-card border-2 border-primary"
                  : "bg-card border border-border"
              }`}
            >
              {plan.badge && (
                <span className="absolute -top-2 right-4 rounded-full gradient-primary px-2.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                  {plan.badge}
                </span>
              )}

              <div className="flex items-baseline justify-between">
                <h3 className="font-display text-lg font-semibold text-foreground">
                  {plan.name}
                </h3>
                <div className="text-right">
                  <div className="font-display text-2xl font-semibold text-foreground">
                    {plan.price}
                  </div>
                  <div className="text-[11px] text-muted-foreground">{plan.period}</div>
                </div>
              </div>

              <div className="text-xs text-muted-foreground mt-1">{plan.perDay}</div>
              <p className="text-sm text-foreground/80 mt-3 italic">{plan.tagline}</p>

              <ul className="mt-4 space-y-2 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-foreground">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full gradient-primary">
                      <Check className="h-2.5 w-2.5 text-primary-foreground" strokeWidth={3} />
                    </span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {plan.id === "free" ? (
                <Button variant="ghost" size="sm" disabled className="mt-5 w-full">
                  {isPro ? "Included with Pro" : "You're on Free"}
                </Button>
              ) : isPro ? null : (
                <Button
                  onClick={handleChoose}
                  variant={plan.highlight ? "hero" : "outline"}
                  size="sm"
                  className="mt-5 w-full"
                >
                  {`Choose ${plan.name}`}
                </Button>
              )}
            </div>
          ))}
        </div>

        <p className="text-center text-[11px] text-muted-foreground mt-6">
          Demo paywall — no real charge will be made.
        </p>
      </section>

      <BottomNav streak={streak} />
      <UpgradeDialog
        open={showUpgrade}
        onOpenChange={setShowUpgrade}
        onUpgrade={() => {
          sfx.celebrate();
          upgrade();
        }}
      />
    </main>
  );
};

export default Plans;
